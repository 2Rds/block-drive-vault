/**
 * BlockDrive PDA Utilities
 */

import { PublicKey } from '@solana/web3.js';
import { BLOCKDRIVE_PROGRAM_ID, VAULT_SEED, FILE_SEED, DELEGATION_SEED } from './types';

/**
 * Derive the UserVault PDA for a given owner
 */
export function deriveVaultPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBuffer()],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Derive the FileRecord PDA for a given vault and file ID
 */
export function deriveFileRecordPDA(vault: PublicKey, fileId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(FILE_SEED), vault.toBuffer(), Buffer.from(fileId)],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Derive the Delegation PDA for a given file record and grantee
 */
export function deriveDelegationPDA(fileRecord: PublicKey, grantee: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(DELEGATION_SEED), fileRecord.toBuffer(), grantee.toBuffer()],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Convert a UUID string to bytes for file ID
 */
export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes back to UUID string
 */
export function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Convert a CID string to padded bytes (64 bytes)
 */
export function cidToBytes(cid: string): Uint8Array {
  const encoder = new TextEncoder();
  const cidBytes = encoder.encode(cid);
  const padded = new Uint8Array(64);
  padded.set(cidBytes.slice(0, 64));
  return padded;
}

/**
 * Convert padded bytes back to CID string
 */
export function bytesToCid(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  // Find the first null byte to trim padding
  let end = bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }
  return decoder.decode(bytes.slice(0, end));
}

/**
 * Hash a string using SHA-256 for filename/mimetype hashing
 */
export async function sha256Hash(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(dataBuffer).buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Hash binary data using SHA-256
 */
export async function sha256HashBytes(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length);
  new Uint8Array(buffer).set(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Generate a random file ID
 */
export function generateFileId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
