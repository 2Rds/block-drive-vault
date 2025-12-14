/**
 * Key Derivation Service
 * 
 * Derives AES-256 encryption keys from wallet signatures using HKDF.
 * Each security level uses a different signature to derive a unique key.
 */

import { 
  SecurityLevel, 
  SECURITY_LEVEL_MESSAGES,
  DerivedEncryptionKey 
} from '@/types/blockdriveCrypto';
import { sha256, stringToBytes, bytesToHex } from './cryptoUtils';

// Salt for HKDF - unique to BlockDrive
const HKDF_SALT = stringToBytes('BlockDrive-HKDF-Salt-v1');

// Info strings for HKDF context separation
const HKDF_INFO = {
  [SecurityLevel.STANDARD]: stringToBytes('blockdrive-level-1-encryption'),
  [SecurityLevel.SENSITIVE]: stringToBytes('blockdrive-level-2-encryption'),
  [SecurityLevel.MAXIMUM]: stringToBytes('blockdrive-level-3-encryption')
};

/**
 * Derive an AES-256-GCM key from a wallet signature using HKDF
 * 
 * @param signature - The wallet signature (Uint8Array)
 * @param level - Security level for context separation
 * @returns Promise<DerivedEncryptionKey>
 */
export async function deriveKeyFromSignature(
  signature: Uint8Array,
  level: SecurityLevel
): Promise<DerivedEncryptionKey> {
  // Import signature as raw key material for HKDF
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    signature.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using HKDF
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      salt: HKDF_SALT.buffer as ArrayBuffer,
      info: HKDF_INFO[level].buffer as ArrayBuffer,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false, // Non-extractable for security
    ['encrypt', 'decrypt']
  );

  // Generate a hash of the key for verification (not the key itself)
  const keyHash = await generateKeyHash(signature, level);

  return {
    level,
    key: aesKey,
    keyHash,
    derivedAt: Date.now()
  };
}

/**
 * Generate a hash of the key for verification purposes
 * This can be stored/compared without exposing the actual key
 */
async function generateKeyHash(
  signature: Uint8Array,
  level: SecurityLevel
): Promise<string> {
  const hashInput = new Uint8Array([
    ...signature,
    ...stringToBytes(`-level-${level}-hash`)
  ]);
  return sha256(hashInput);
}

/**
 * Get the message to sign for a specific security level
 */
export function getSignatureMessage(level: SecurityLevel): string {
  return SECURITY_LEVEL_MESSAGES[level];
}

/**
 * Get all signature messages for initial setup
 */
export function getAllSignatureMessages(): Array<{ level: SecurityLevel; message: string }> {
  return [
    { level: SecurityLevel.STANDARD, message: SECURITY_LEVEL_MESSAGES[SecurityLevel.STANDARD] },
    { level: SecurityLevel.SENSITIVE, message: SECURITY_LEVEL_MESSAGES[SecurityLevel.SENSITIVE] },
    { level: SecurityLevel.MAXIMUM, message: SECURITY_LEVEL_MESSAGES[SecurityLevel.MAXIMUM] }
  ];
}

/**
 * Verify a key hash matches (for session validation)
 */
export async function verifyKeyHash(
  signature: Uint8Array,
  level: SecurityLevel,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await generateKeyHash(signature, level);
  return actualHash === expectedHash;
}
