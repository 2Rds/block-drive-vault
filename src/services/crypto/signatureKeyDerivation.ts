/**
 * Signature-Based Key Derivation
 *
 * Derives 3 AES-256-GCM encryption keys from a single wallet signature
 * using HKDF-SHA256 with level-specific info strings.
 *
 * The wallet signature never leaves the client. The server never sees
 * the signature or the derived keys.
 */

import { SecurityLevel, DerivedEncryptionKey } from '@/types/blockdriveCrypto';
import { deriveKeyFromMaterial } from './keyDerivationService';

/** The message signed by the wallet to derive encryption keys */
export const DERIVATION_MESSAGE = 'BlockDrive Key Derivation v1';

const ALL_LEVELS = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM] as const;

/**
 * Derive 3 independent AES-256-GCM keys from a wallet signature.
 *
 * Uses the existing HKDF pipeline in keyDerivationService.ts:
 * - Salt: BlockDrive-HKDF-Salt-v1
 * - Info per level: blockdrive-level-{1,2,3}-encryption
 *
 * The same signature produces the same 3 keys every time (deterministic).
 * Level-specific HKDF info strings ensure cryptographic independence.
 *
 * @param signature - 64-byte ed25519 signature from wallet.signMessage()
 */
export async function deriveKeysFromSignature(
  signature: Uint8Array
): Promise<Map<SecurityLevel, DerivedEncryptionKey>> {
  const keys = new Map<SecurityLevel, DerivedEncryptionKey>();
  for (const level of ALL_LEVELS) {
    keys.set(level, await deriveKeyFromMaterial(signature, level));
  }
  return keys;
}
