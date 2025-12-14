/**
 * AES-256-GCM Encryption Service
 * 
 * Provides symmetric encryption/decryption using AES-256 in GCM mode.
 * GCM provides both confidentiality and authenticity.
 */

import { randomBytes, concatBytes, sha256 } from './cryptoUtils';

// AES-GCM uses 12-byte (96-bit) IV for optimal security
const IV_LENGTH = 12;

// Authentication tag length (128 bits is standard for GCM)
const TAG_LENGTH = 128;

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param data - Data to encrypt
 * @param key - AES-256 CryptoKey
 * @returns Object containing ciphertext and IV
 */
export async function encryptAES256GCM(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Encrypt with AES-GCM
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      tagLength: TAG_LENGTH
    },
    key,
    data.buffer as ArrayBuffer
  );

  return {
    ciphertext: new Uint8Array(cipherBuffer),
    iv
  };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param ciphertext - Encrypted data (includes auth tag)
 * @param iv - Initialization vector used during encryption
 * @param key - AES-256 CryptoKey
 * @returns Decrypted data
 */
export async function decryptAES256GCM(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      tagLength: TAG_LENGTH
    },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return new Uint8Array(plainBuffer);
}

/**
 * Encrypt a file with automatic chunking for large files
 * Returns the complete encrypted blob
 * 
 * @param fileData - File contents as Uint8Array
 * @param key - AES-256 CryptoKey
 * @returns Encrypted file data with IV prepended
 */
export async function encryptFile(
  fileData: Uint8Array,
  key: CryptoKey
): Promise<{ encrypted: Uint8Array; iv: Uint8Array; originalHash: string }> {
  // Calculate hash of original file for integrity verification
  const originalHash = await sha256(fileData);

  // Encrypt the entire file
  const { ciphertext, iv } = await encryptAES256GCM(fileData, key);

  return {
    encrypted: ciphertext,
    iv,
    originalHash
  };
}

/**
 * Decrypt a file
 * 
 * @param encryptedData - Encrypted file data
 * @param iv - Initialization vector
 * @param key - AES-256 CryptoKey
 * @param expectedHash - Optional hash for integrity verification
 * @returns Decrypted file data
 */
export async function decryptFile(
  encryptedData: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey,
  expectedHash?: string
): Promise<{ decrypted: Uint8Array; verified: boolean }> {
  const decrypted = await decryptAES256GCM(encryptedData, iv, key);

  // Verify integrity if hash provided
  let verified = true;
  if (expectedHash) {
    const actualHash = await sha256(decrypted);
    verified = actualHash === expectedHash;
  }

  return { decrypted, verified };
}

/**
 * Encrypt metadata (filename, size, type, etc.)
 * Metadata is small so no chunking needed
 */
export async function encryptMetadata(
  metadata: object,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const metadataString = JSON.stringify(metadata);
  const metadataBytes = new TextEncoder().encode(metadataString);
  
  const { ciphertext, iv } = await encryptAES256GCM(metadataBytes, key);
  
  return {
    encrypted: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Decrypt metadata
 */
export async function decryptMetadata<T>(
  encryptedBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<T> {
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  
  const decrypted = await decryptAES256GCM(encrypted, iv, key);
  const metadataString = new TextDecoder().decode(decrypted);
  
  return JSON.parse(metadataString) as T;
}
