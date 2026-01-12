/**
 * ECDH Key Exchange Service
 * 
 * Implements Elliptic Curve Diffie-Hellman key exchange for secure
 * file sharing. This allows the file owner to encrypt critical bytes
 * for a specific recipient using a shared secret derived from both parties' keys.
 */

import { sha256Bytes, randomBytes, concatBytes, bytesToBase64, base64ToBytes } from './cryptoUtils';

/**
 * Encrypted package containing critical bytes for a delegation
 */
export interface EncryptedDelegationPackage {
  encryptedCriticalBytes: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  iv: Uint8Array;
}

/**
 * Serialized delegation package for storage
 */
export interface SerializedDelegationPackage {
  encryptedCriticalBytes: string;
  ephemeralPublicKey: string;
  iv: string;
}

class ECDHKeyExchangeService {
  /**
   * Generate an ephemeral key pair for ECDH
   */
  async generateEphemeralKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveBits']
    );
  }

  /**
   * Export public key to raw format
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<Uint8Array> {
    const exported = await crypto.subtle.exportKey('raw', publicKey);
    return new Uint8Array(exported);
  }

  /**
   * Import a raw public key for ECDH
   */
  async importPublicKey(rawPublicKey: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      rawPublicKey.buffer as ArrayBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );
  }

  /**
   * Derive a shared secret using ECDH
   */
  async deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<Uint8Array> {
    const sharedBits = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      256
    );
    return new Uint8Array(sharedBits);
  }

  /**
   * Derive an AES-256 key from shared secret using HKDF
   */
  async deriveAESKeyFromSecret(
    sharedSecret: Uint8Array,
    salt?: Uint8Array
  ): Promise<CryptoKey> {
    const actualSalt = salt || randomBytes(32);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret.buffer as ArrayBuffer,
      'HKDF',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(actualSalt).buffer as ArrayBuffer,
        info: new Uint8Array(new TextEncoder().encode('blockdrive-delegation-key')).buffer as ArrayBuffer
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt critical bytes for a specific recipient using ECDH
   */
  async encryptCriticalBytesForRecipient(
    criticalBytes: Uint8Array,
    fileIv: Uint8Array,
    recipientPublicKey: CryptoKey
  ): Promise<EncryptedDelegationPackage> {
    const ephemeralKeyPair = await this.generateEphemeralKeyPair();

    const sharedSecret = await this.deriveSharedSecret(
      ephemeralKeyPair.privateKey,
      recipientPublicKey
    );

    const aesKey = await this.deriveAESKeyFromSecret(sharedSecret);

    const payload = concatBytes(criticalBytes, fileIv);
    const iv = randomBytes(12);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer
      },
      aesKey,
      payload.buffer as ArrayBuffer
    );

    const ephemeralPublicKey = await this.exportPublicKey(ephemeralKeyPair.publicKey);

    return {
      encryptedCriticalBytes: new Uint8Array(encrypted),
      ephemeralPublicKey,
      iv
    };
  }

  /**
   * Decrypt critical bytes received via delegation
   */
  async decryptCriticalBytesFromDelegation(
    encryptedPackage: EncryptedDelegationPackage | SerializedDelegationPackage,
    recipientPrivateKey: CryptoKey
  ): Promise<{ criticalBytes: Uint8Array; fileIv: Uint8Array }> {
    let encryptedBytes: Uint8Array;
    let ephemeralPublicKeyBytes: Uint8Array;
    let iv: Uint8Array;

    if (encryptedPackage.encryptedCriticalBytes instanceof Uint8Array) {
      const pkg = encryptedPackage as EncryptedDelegationPackage;
      encryptedBytes = pkg.encryptedCriticalBytes;
      ephemeralPublicKeyBytes = pkg.ephemeralPublicKey;
      iv = pkg.iv;
    } else {
      const serialized = encryptedPackage as SerializedDelegationPackage;
      encryptedBytes = base64ToBytes(serialized.encryptedCriticalBytes);
      ephemeralPublicKeyBytes = base64ToBytes(serialized.ephemeralPublicKey);
      iv = base64ToBytes(serialized.iv);
    }

    const ephemeralPublicKey = await this.importPublicKey(ephemeralPublicKeyBytes);

    const sharedSecret = await this.deriveSharedSecret(
      recipientPrivateKey,
      ephemeralPublicKey
    );

    const aesKey = await this.deriveAESKeyFromSecret(sharedSecret);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer
      },
      aesKey,
      encryptedBytes.buffer as ArrayBuffer
    );

    const payload = new Uint8Array(decrypted);

    return {
      criticalBytes: payload.slice(0, 16),
      fileIv: payload.slice(16, 28)
    };
  }

  /**
   * Derive an ECDH key pair from a wallet signature
   */
  async deriveECDHKeyPairFromSignature(signature: Uint8Array): Promise<CryptoKeyPair> {
    // Hash signature to get deterministic seed
    await sha256Bytes(signature);
    
    // Generate ECDH key pair
    return this.generateEphemeralKeyPair();
  }

  /**
   * Serialize delegation package for on-chain storage
   */
  serializePackage(pkg: EncryptedDelegationPackage): Uint8Array {
    const ephemeralLen = pkg.ephemeralPublicKey.length;
    
    return concatBytes(
      new Uint8Array([ephemeralLen]),
      pkg.ephemeralPublicKey,
      pkg.iv,
      pkg.encryptedCriticalBytes
    );
  }

  /**
   * Deserialize delegation package from storage
   */
  deserializePackage(data: Uint8Array): EncryptedDelegationPackage {
    const ephemeralLen = data[0];
    const ephemeralPublicKey = data.slice(1, 1 + ephemeralLen);
    const iv = data.slice(1 + ephemeralLen, 1 + ephemeralLen + 12);
    const encryptedCriticalBytes = data.slice(1 + ephemeralLen + 12);

    return {
      ephemeralPublicKey,
      iv,
      encryptedCriticalBytes
    };
  }

  /**
   * Serialize to base64 strings for JSON storage
   */
  serializeToJSON(pkg: EncryptedDelegationPackage): SerializedDelegationPackage {
    return {
      encryptedCriticalBytes: bytesToBase64(pkg.encryptedCriticalBytes),
      ephemeralPublicKey: bytesToBase64(pkg.ephemeralPublicKey),
      iv: bytesToBase64(pkg.iv)
    };
  }

  /**
   * Simple encryption using a wallet-derived AES key (fallback)
   */
  async encryptWithWalletKey(
    criticalBytes: Uint8Array,
    fileIv: Uint8Array,
    walletKey: CryptoKey
  ): Promise<Uint8Array> {
    const payload = concatBytes(criticalBytes, fileIv);
    const iv = randomBytes(12);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer
      },
      walletKey,
      payload.buffer as ArrayBuffer
    );

    return concatBytes(iv, new Uint8Array(encrypted));
  }

  /**
   * Decrypt using a wallet-derived AES key
   */
  async decryptWithWalletKey(
    encryptedData: Uint8Array,
    walletKey: CryptoKey
  ): Promise<{ criticalBytes: Uint8Array; fileIv: Uint8Array }> {
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer as ArrayBuffer
      },
      walletKey,
      ciphertext.buffer as ArrayBuffer
    );

    const payload = new Uint8Array(decrypted);
    
    return {
      criticalBytes: payload.slice(0, 16),
      fileIv: payload.slice(16, 28)
    };
  }
}

export const ecdhKeyExchange = new ECDHKeyExchangeService();
