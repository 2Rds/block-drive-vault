/**
 * BlockDrive Solana SDK Types
 */

import { PublicKey } from '@solana/web3.js';

// Enums
export enum VaultStatus {
  Active = 0,
  Frozen = 1,
  Deleted = 2,
}

export enum FileStatus {
  Active = 0,
  Archived = 1,
  Deleted = 2,
}

export enum SecurityLevel {
  Standard = 0,
  Enhanced = 1,
  Maximum = 2,
}

export enum PermissionLevel {
  View = 0,
  Download = 1,
  Reshare = 2,
}

// Account Types
export interface UserVault {
  bump: number;
  owner: PublicKey;
  masterKeyCommitment: Uint8Array;
  fileCount: bigint;
  totalStorage: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  status: VaultStatus;
  reserved: Uint8Array;
}

export interface FileRecord {
  bump: number;
  vault: PublicKey;
  owner: PublicKey;
  fileId: Uint8Array;
  filenameHash: Uint8Array;
  fileSize: bigint;
  encryptedSize: bigint;
  mimeTypeHash: Uint8Array;
  securityLevel: SecurityLevel;
  encryptionCommitment: Uint8Array;
  criticalBytesCommitment: Uint8Array;
  primaryCid: Uint8Array;
  redundancyCid: Uint8Array;
  providerCount: number;
  createdAt: bigint;
  accessedAt: bigint;
  status: FileStatus;
  isShared: boolean;
  delegationCount: number;
  reserved: Uint8Array;
}

export interface Delegation {
  bump: number;
  fileRecord: PublicKey;
  grantor: PublicKey;
  grantee: PublicKey;
  encryptedFileKey: Uint8Array;
  permissionLevel: PermissionLevel;
  expiresAt: bigint;
  createdAt: bigint;
  isActive: boolean;
  isAccepted: boolean;
  accessCount: bigint;
  lastAccessedAt: bigint;
  reserved: Uint8Array;
}

// Instruction Args
export interface InitializeVaultArgs {
  masterKeyCommitment: Uint8Array;
}

export interface RegisterFileArgs {
  fileId: Uint8Array;
  filenameHash: Uint8Array;
  fileSize: bigint;
  encryptedSize: bigint;
  mimeTypeHash: Uint8Array;
  securityLevel: number;
  encryptionCommitment: Uint8Array;
  criticalBytesCommitment: Uint8Array;
  primaryCid: Uint8Array;
}

export interface UpdateFileStorageArgs {
  redundancyCid: Uint8Array;
  providerCount: number;
}

export interface CreateDelegationArgs {
  encryptedFileKey: Uint8Array;
  permissionLevel: number;
  expiresAt: bigint;
}

export interface UpdateDelegationArgs {
  permissionLevel: number;
  expiresAt: bigint;
}

// PDA Seeds
export const VAULT_SEED = 'vault';
export const FILE_SEED = 'file';
export const DELEGATION_SEED = 'delegation';

// Program ID (placeholder - replace with actual deployed ID)
export const BLOCKDRIVE_PROGRAM_ID = new PublicKey('BLKDrv1111111111111111111111111111111111111');

// Parsed account types for frontend
export interface ParsedUserVault {
  publicKey: PublicKey;
  owner: string;
  masterKeyCommitment: string;
  fileCount: number;
  totalStorage: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'frozen' | 'deleted';
}

export interface ParsedFileRecord {
  publicKey: PublicKey;
  vault: string;
  owner: string;
  fileId: string;
  filenameHash: string;
  fileSize: number;
  encryptedSize: number;
  mimeTypeHash: string;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  encryptionCommitment: string;
  criticalBytesCommitment: string;
  primaryCid: string;
  redundancyCid: string | null;
  providerCount: number;
  createdAt: Date;
  accessedAt: Date;
  status: 'active' | 'archived' | 'deleted';
  isShared: boolean;
  delegationCount: number;
}

export interface ParsedDelegation {
  publicKey: PublicKey;
  fileRecord: string;
  grantor: string;
  grantee: string;
  encryptedFileKey: Uint8Array;
  permissionLevel: 'view' | 'download' | 'reshare';
  expiresAt: Date | null;
  createdAt: Date;
  isActive: boolean;
  isAccepted: boolean;
  accessCount: number;
  lastAccessedAt: Date | null;
}
