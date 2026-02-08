/**
 * BlockDrive Cryptography Service
 * 
 * High-level service implementing BlockDrive's unique "programmed incompleteness"
 * architecture where the first 16 bytes are extracted and stored separately.
 */

import { 
  SecurityLevel,
  EncryptedFileData,
  EncryptedFileMetadata,
  DecryptedFileResult 
} from '@/types/blockdriveCrypto';
import { encryptFile, decryptFile, encryptMetadata, decryptMetadata } from './aesEncryptionService';
import { sha256, concatBytes, bytesToBase64, base64ToBytes, bytesToHex } from './cryptoUtils';

// Number of critical bytes to extract (as per architecture spec)
const CRITICAL_BYTES_LENGTH = 16;

/**
 * Encrypt a file using BlockDrive's architecture:
 * 1. Encrypt entire file with AES-256-GCM
 * 2. Extract first 16 bytes as "critical bytes"
 * 3. Generate commitment (SHA-256 hash of critical bytes)
 * 4. Return encrypted content WITHOUT the 16 bytes
 * 
 * @param fileData - Original file content
 * @param fileName - Original file name
 * @param fileType - MIME type
 * @param key - Derived AES-256 key
 * @param securityLevel - Security level used
 * @returns EncryptedFileData with separated critical bytes
 */
export async function encryptFileWithCriticalBytes(
  fileData: Uint8Array,
  fileName: string,
  fileType: string,
  key: CryptoKey,
  securityLevel: SecurityLevel
): Promise<EncryptedFileData> {
  // Step 1: Encrypt the entire file
  const { encrypted, iv, originalHash } = await encryptFile(fileData, key);

  // Step 2: Extract critical bytes (first 16 bytes of encrypted data)
  if (encrypted.length < CRITICAL_BYTES_LENGTH) {
    throw new Error('Encrypted file too small for critical byte extraction');
  }
  
  const criticalBytes = encrypted.slice(0, CRITICAL_BYTES_LENGTH);
  const remainingContent = encrypted.slice(CRITICAL_BYTES_LENGTH);

  // Step 3: Generate commitment (hash of critical bytes)
  const commitment = await sha256(criticalBytes);

  return {
    encryptedContent: remainingContent,
    criticalBytes,
    iv,
    commitment,
    securityLevel,
    originalSize: fileData.length,
    encryptedSize: encrypted.length,
    contentHash: originalHash
  };
}

/**
 * Decrypt a file by reconstructing it with critical bytes:
 * 1. Verify commitment matches the critical bytes
 * 2. Concatenate critical bytes + encrypted content
 * 3. Decrypt using AES-256-GCM
 * 
 * @param encryptedContent - Encrypted file WITHOUT critical bytes
 * @param criticalBytes - The 16 critical bytes
 * @param iv - Initialization vector
 * @param commitment - Expected SHA-256 hash of critical bytes
 * @param key - Derived AES-256 key
 * @param expectedHash - Optional content hash for verification
 * @returns Decrypted file content
 */
export async function decryptFileWithCriticalBytes(
  encryptedContent: Uint8Array,
  criticalBytes: Uint8Array,
  iv: Uint8Array,
  commitment: string,
  key: CryptoKey,
  expectedHash?: string
): Promise<DecryptedFileResult & { content: Uint8Array }> {
  // Step 1: Verify commitment
  const actualCommitment = await sha256(criticalBytes);
  const commitmentValid = actualCommitment === commitment;
  
  if (!commitmentValid) {
    throw new Error('Commitment verification failed - data may be tampered');
  }

  // Step 2: Reconstruct full encrypted file
  const fullEncrypted = concatBytes(criticalBytes, encryptedContent);

  // Step 3: Decrypt
  const { decrypted, verified } = await decryptFile(fullEncrypted, iv, key, expectedHash);

  return {
    content: decrypted,
    metadata: {} as EncryptedFileMetadata, // Metadata decrypted separately
    verified,
    commitmentValid
  };
}

/**
 * Generate file metadata structure
 */
export function createFileMetadata(
  fileName: string,
  fileType: string,
  fileSize: number,
  securityLevel: SecurityLevel,
  contentHash: string
): EncryptedFileMetadata {
  return {
    fileName,
    fileType,
    fileSize,
    uploadedAt: Date.now(),
    securityLevel,
    contentHash
  };
}

/**
 * Encrypt file metadata for storage
 */
export async function encryptFileMetadata(
  metadata: EncryptedFileMetadata,
  key: CryptoKey
): Promise<{ encryptedMetadata: string; metadataIv: string }> {
  const { encrypted, iv } = await encryptMetadata(metadata, key);
  return {
    encryptedMetadata: encrypted,
    metadataIv: iv
  };
}

/**
 * Decrypt file metadata
 */
export async function decryptFileMetadata(
  encryptedMetadata: string,
  metadataIv: string,
  key: CryptoKey
): Promise<EncryptedFileMetadata> {
  return decryptMetadata<EncryptedFileMetadata>(encryptedMetadata, metadataIv, key);
}

/**
 * Generate a unique file ID from content and timestamp
 */
export async function generateFileId(
  contentHash: string,
  walletAddress: string,
  timestamp: number = Date.now()
): Promise<string> {
  const input = `${contentHash}-${walletAddress}-${timestamp}`;
  const hash = await sha256(new TextEncoder().encode(input));
  return hash.slice(0, 32); // 16-byte file ID as hex
}

/**
 * Serialize encrypted file data for storage/transmission
 */
export function serializeEncryptedFile(data: EncryptedFileData): {
  content: string;
  iv: string;
  commitment: string;
  securityLevel: SecurityLevel;
  originalSize: number;
  contentHash: string;
} {
  return {
    content: bytesToBase64(data.encryptedContent),
    iv: bytesToBase64(data.iv),
    commitment: data.commitment,
    securityLevel: data.securityLevel,
    originalSize: data.originalSize,
    contentHash: data.contentHash
  };
}

/**
 * Deserialize encrypted file data from storage
 */
export function deserializeEncryptedFile(serialized: {
  content: string;
  iv: string;
  commitment: string;
  securityLevel: SecurityLevel;
  originalSize: number;
  contentHash: string;
}): Omit<EncryptedFileData, 'criticalBytes' | 'encryptedSize'> {
  return {
    encryptedContent: base64ToBytes(serialized.content),
    iv: base64ToBytes(serialized.iv),
    commitment: serialized.commitment,
    securityLevel: serialized.securityLevel,
    originalSize: serialized.originalSize,
    contentHash: serialized.contentHash
  };
}

/**
 * Encrypt the critical bytes for storage in ZK proof
 * Uses a separate encryption with the wallet-derived key
 */
export async function encryptCriticalBytes(
  criticalBytes: Uint8Array,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  return encryptMetadata({ bytes: bytesToBase64(criticalBytes) }, key);
}

/**
 * Decrypt the critical bytes from ZK proof
 */
export async function decryptCriticalBytes(
  encryptedData: string,
  iv: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const data = await decryptMetadata<{ bytes: string }>(encryptedData, iv, key);
  return base64ToBytes(data.bytes);
}
