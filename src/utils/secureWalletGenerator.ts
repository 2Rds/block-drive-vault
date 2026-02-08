
export interface SecureWalletData {
  address: string;
  publicKey: string;
  blockchain: 'solana';
}

// Helper to convert Uint8Array to ArrayBuffer for crypto operations
const toArrayBuffer = (arr: Uint8Array): ArrayBuffer => {
  // Create a new ArrayBuffer and copy the data
  const buffer = new ArrayBuffer(arr.length);
  const view = new Uint8Array(buffer);
  view.set(arr);
  return buffer;
};

// Secure random number generation
const getSecureRandomBytes = (length: number): Uint8Array => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
};

// Base58 encoding for Solana addresses
const base58Encode = (bytes: Uint8Array): string => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  
  // Simple base58 encoding (in production, use a proper library)
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < result.length; j++) {
      carry += alphabet.indexOf(result[j]) * 256;
      result = result.substring(0, j) + alphabet[carry % 58] + result.substring(j + 1);
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      result = alphabet[carry % 58] + result;
      carry = Math.floor(carry / 58);
    }
  }
  
  return result;
};

// Generate a secure wallet address (demo version)
export const generateSecureWallet = (blockchainType: 'solana'): SecureWalletData => {
  // Generate 32 random bytes for a Solana public key
  const publicKeyBytes = getSecureRandomBytes(32);
  const address = base58Encode(publicKeyBytes);
  
  return {
    address,
    publicKey: Array.from(publicKeyBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
    blockchain: 'solana'
  };
};

// Secure encryption using Web Crypto API
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);
  const passwordBytes = encoder.encode(password);
  
  // Generate a random salt
  const salt = getSecureRandomBytes(16);
  
  // Derive key from password using PBKDF2
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(passwordBytes),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = getSecureRandomBytes(12);
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    derivedKey,
    toArrayBuffer(data)
  );
  
  // Combine salt, iv, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
};

export const generateSecureTokenId = (walletAddress: string, blockchainType: string): string => {
  const timestamp = Date.now();
  const randomBytes = getSecureRandomBytes(16);
  const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${blockchainType.toUpperCase()}_${walletAddress.substring(0, 8)}_${timestamp}_${randomHex}`;
};
