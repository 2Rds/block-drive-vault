/**
 * Key Derivation Service
 *
 * Derives AES-256 encryption keys from key material using HKDF.
 * Each security level uses different HKDF info for context separation.
 */

import {
  SecurityLevel,
  DerivedEncryptionKey
} from '@/types/blockdriveCrypto';
import { sha256, stringToBytes } from './cryptoUtils';

// Salt for HKDF - unique to BlockDrive
const HKDF_SALT = stringToBytes('BlockDrive-HKDF-Salt-v1');

// Info strings for HKDF context separation
const HKDF_INFO = {
  [SecurityLevel.STANDARD]: stringToBytes('blockdrive-level-1-encryption'),
  [SecurityLevel.SENSITIVE]: stringToBytes('blockdrive-level-2-encryption'),
  [SecurityLevel.MAXIMUM]: stringToBytes('blockdrive-level-3-encryption')
};

/**
 * Derive an AES-256-GCM key from raw key material using HKDF
 *
 * @param material - Key material bytes (64-byte ed25519 wallet signature)
 * @param level - Security level for context separation
 */
export async function deriveKeyFromMaterial(
  material: Uint8Array,
  level: SecurityLevel
): Promise<DerivedEncryptionKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    material.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

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
    false,
    ['encrypt', 'decrypt']
  );

  const keyHash = await generateKeyHash(material, level);

  return {
    level,
    key: aesKey,
    keyHash,
    derivedAt: Date.now()
  };
}

async function generateKeyHash(
  material: Uint8Array,
  level: SecurityLevel
): Promise<string> {
  const hashInput = new Uint8Array([
    ...material,
    ...stringToBytes(`-level-${level}-hash`)
  ]);
  return sha256(hashInput);
}
