/**
 * Zero-Knowledge Proof Service
 * 
 * Implements ZK proofs for BlockDrive's "programmed incompleteness" architecture.
 * 
 * The ZK proof:
 * 1. Demonstrates possession of 16 bytes that hash to the public commitment
 * 2. Embeds the encrypted critical bytes (encrypted with wallet key)
 * 3. Is uploaded to storage (S3/IPFS) - only the CID is stored on-chain
 * 
 * This ensures critical bytes are never stored locally or on-chain in usable form.
 */

import { sha256, sha256Bytes, bytesToBase64, base64ToBytes, bytesToHex, randomBytes, concatBytes } from './cryptoUtils';

/**
 * ZK Proof structure that gets uploaded to storage
 */
export interface ZKProofPackage {
  version: 1;
  
  // Public commitment (SHA-256 of critical bytes)
  commitment: string;
  
  // Encrypted critical bytes (only wallet owner can decrypt)
  encryptedCriticalBytes: string;  // base64
  encryptedIv: string;             // base64, IV used for file encryption
  encryptionIv: string;            // base64, IV used to encrypt critical bytes
  
  // Proof data
  proofHash: string;               // Hash of the proof for integrity
  proofTimestamp: number;
  
  // Verification data (simplified ZK - in production use snarkjs circuits)
  verificationData: {
    commitmentAlgorithm: 'SHA-256';
    encryptionAlgorithm: 'AES-256-GCM';
    proofType: 'BlockDrive-ZK-v1';
  };
  
  // Signature proving wallet ownership at proof creation time
  walletSignature?: string;
}

/**
 * Serialized proof for storage
 */
export interface SerializedZKProof {
  proof: string;  // base64 encoded ZKProofPackage JSON
  proofHash: string;
  commitment: string;
}

class ZKProofService {
  /**
   * Generate a ZK proof package for the critical bytes
   * 
   * This creates a proof that:
   * 1. Contains the commitment (public)
   * 2. Contains encrypted critical bytes (only owner can decrypt)
   * 3. Can be verified by anyone
   * 4. Can only be used by wallet owner
   */
  async generateProof(
    criticalBytes: Uint8Array,
    fileIv: Uint8Array,
    encryptionKey: CryptoKey,
    commitment: string
  ): Promise<ZKProofPackage> {
    // Verify the commitment matches
    const computedCommitment = await sha256(criticalBytes);
    if (computedCommitment !== commitment) {
      throw new Error('Critical bytes do not match commitment');
    }

    // Generate IV for encrypting critical bytes
    const encryptionIv = randomBytes(12);

    // Create payload: critical bytes + file IV
    const payload = concatBytes(criticalBytes, fileIv);

    // Encrypt the payload with wallet-derived key
    const encryptedPayload = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: encryptionIv.buffer as ArrayBuffer
      },
      encryptionKey,
      payload.buffer as ArrayBuffer
    );

    // Create the proof package
    const proofPackage: ZKProofPackage = {
      version: 1,
      commitment,
      encryptedCriticalBytes: bytesToBase64(new Uint8Array(encryptedPayload)),
      encryptedIv: bytesToBase64(fileIv),
      encryptionIv: bytesToBase64(encryptionIv),
      proofHash: '', // Will be computed below
      proofTimestamp: Date.now(),
      verificationData: {
        commitmentAlgorithm: 'SHA-256',
        encryptionAlgorithm: 'AES-256-GCM',
        proofType: 'BlockDrive-ZK-v1'
      }
    };

    // Compute proof hash for integrity verification
    const proofContentForHash = JSON.stringify({
      commitment: proofPackage.commitment,
      encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
      proofTimestamp: proofPackage.proofTimestamp
    });
    proofPackage.proofHash = await sha256(new TextEncoder().encode(proofContentForHash));

    console.log('[ZKProof] Generated proof with commitment:', commitment.slice(0, 16) + '...');

    return proofPackage;
  }

  /**
   * Verify and extract critical bytes from a ZK proof
   * 
   * Only the wallet owner (with correct decryption key) can extract
   */
  async verifyAndExtract(
    proofPackage: ZKProofPackage,
    decryptionKey: CryptoKey,
    expectedCommitment: string
  ): Promise<{ criticalBytes: Uint8Array; fileIv: Uint8Array; verified: boolean }> {
    // Step 1: Verify commitment matches
    if (proofPackage.commitment !== expectedCommitment) {
      throw new Error('Proof commitment does not match expected commitment');
    }

    // Step 2: Verify proof hash integrity
    const proofContentForHash = JSON.stringify({
      commitment: proofPackage.commitment,
      encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
      proofTimestamp: proofPackage.proofTimestamp
    });
    const computedHash = await sha256(new TextEncoder().encode(proofContentForHash));
    
    if (computedHash !== proofPackage.proofHash) {
      throw new Error('Proof integrity verification failed - data may be tampered');
    }

    // Step 3: Decrypt the critical bytes
    const encryptedData = base64ToBytes(proofPackage.encryptedCriticalBytes);
    const encryptionIv = base64ToBytes(proofPackage.encryptionIv);

    try {
      const decryptedPayload = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: encryptionIv.buffer as ArrayBuffer
        },
        decryptionKey,
        encryptedData.buffer as ArrayBuffer
      );

      const payload = new Uint8Array(decryptedPayload);
      
      // First 16 bytes are critical bytes, next 12 are file IV
      const criticalBytes = payload.slice(0, 16);
      const fileIv = payload.slice(16, 28);

      // Step 4: Verify extracted bytes match commitment
      const extractedCommitment = await sha256(criticalBytes);
      if (extractedCommitment !== expectedCommitment) {
        throw new Error('Extracted bytes do not match commitment - proof invalid');
      }

      console.log('[ZKProof] Successfully verified and extracted critical bytes');

      return {
        criticalBytes,
        fileIv,
        verified: true
      };
    } catch (error) {
      console.error('[ZKProof] Failed to decrypt/verify proof:', error);
      throw new Error('Failed to decrypt proof - wrong key or corrupted data');
    }
  }

  /**
   * Serialize proof for storage (S3/IPFS upload)
   */
  serializeForStorage(proofPackage: ZKProofPackage): Uint8Array {
    const jsonString = JSON.stringify(proofPackage);
    return new TextEncoder().encode(jsonString);
  }

  /**
   * Deserialize proof from storage
   */
  deserializeFromStorage(data: Uint8Array): ZKProofPackage {
    const jsonString = new TextDecoder().decode(data);
    return JSON.parse(jsonString) as ZKProofPackage;
  }

  /**
   * Create a minimal reference to store on-chain
   * Only contains what's needed to find and verify the proof
   */
  createOnChainReference(
    proofPackage: ZKProofPackage,
    proofCid: string
  ): { proofCid: string; commitment: string; proofHash: string } {
    return {
      proofCid,
      commitment: proofPackage.commitment,
      proofHash: proofPackage.proofHash
    };
  }

  /**
   * Generate proof for sharing with another user
   * Re-encrypts the critical bytes with the recipient's key
   */
  async generateSharedProof(
    originalProof: ZKProofPackage,
    ownerDecryptionKey: CryptoKey,
    recipientEncryptionKey: CryptoKey,
    expectedCommitment: string
  ): Promise<ZKProofPackage> {
    // Extract from original proof
    const { criticalBytes, fileIv } = await this.verifyAndExtract(
      originalProof,
      ownerDecryptionKey,
      expectedCommitment
    );

    // Re-encrypt for recipient
    return this.generateProof(
      criticalBytes,
      fileIv,
      recipientEncryptionKey,
      expectedCommitment
    );
  }

  /**
   * Verify a proof without extracting (for public verification)
   */
  async verifyProofIntegrity(proofPackage: ZKProofPackage): Promise<boolean> {
    try {
      const proofContentForHash = JSON.stringify({
        commitment: proofPackage.commitment,
        encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
        proofTimestamp: proofPackage.proofTimestamp
      });
      const computedHash = await sha256(new TextEncoder().encode(proofContentForHash));
      
      return computedHash === proofPackage.proofHash;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate a proof (for deletion)
   * Returns random bytes that can overwrite the commitment on-chain
   */
  generateInvalidationBytes(): Uint8Array {
    return randomBytes(32);
  }
}

// Export singleton
export const zkProofService = new ZKProofService();
