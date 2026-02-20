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
const HKDF_INFO: Record<number, Uint8Array> = {
  [SecurityLevel.STANDARD]: stringToBytes('blockdrive-level-1-encryption'),
  [SecurityLevel.SENSITIVE]: stringToBytes('blockdrive-level-2-encryption'),
  [SecurityLevel.MAXIMUM]: stringToBytes('blockdrive-level-3-encryption')
};

/**
 * Derive an AES-256-GCM key from raw key material using HKDF
 *
 * @param material - Raw key material bytes (e.g. wallet signature)
 * @param level - Security level for context separation
 */
export async function deriveKeyFromMaterial(
  material: Uint8Array,
  level: SecurityLevel
): Promise<DerivedEncryptionKey> {
  const info = HKDF_INFO[level];
  if (!info) {
    throw new Error(`Invalid security level: ${level}. Expected 1, 2, or 3.`);
  }

  let keyMaterial: CryptoKey;
  try {
    keyMaterial = await crypto.subtle.importKey(
      'raw',
      material.buffer as ArrayBuffer,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
  } catch (err) {
    throw new Error(
      `Failed to import key material for HKDF (level ${level}): ${err instanceof Error ? err.message : err}`
    );
  }

  let aesKey: CryptoKey;
  try {
    aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: HKDF_SALT.buffer as ArrayBuffer,
        info: info.buffer as ArrayBuffer,
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
  } catch (err) {
    throw new Error(
      `HKDF key derivation failed for level ${level}: ${err instanceof Error ? err.message : err}`
    );
  }

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
