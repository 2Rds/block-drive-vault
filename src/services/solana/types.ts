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

// Sharding PDA Seeds
export const VAULT_MASTER_SEED = 'vault_master';
export const VAULT_SHARD_SEED = 'vault_shard';
export const VAULT_INDEX_SEED = 'vault_index';

// Sharding Constants
export const MAX_SHARDS = 10;
export const FILES_PER_SHARD = 100;
export const MAX_FILES_TOTAL = MAX_SHARDS * FILES_PER_SHARD; // 1000 files

// Program ID (placeholder - replace with actual deployed ID)
export const BLOCKDRIVE_PROGRAM_ID = new PublicKey('BLKDrv1111111111111111111111111111111111111');

// Sharding Enums
export enum ShardStatus {
  Active = 0,
  Full = 1,
  Archived = 2,
}

// Sharding Account Types
export interface UserVaultMaster {
  bump: number;
  owner: PublicKey;
  totalFileCount: bigint;
  totalShards: number;
  activeShardIndex: number;
  totalStorage: bigint;
  shardPointers: PublicKey[];
  createdAt: bigint;
  updatedAt: bigint;
  reserved: Uint8Array;
}

export interface UserVaultShard {
  bump: number;
  vaultMaster: PublicKey;
  owner: PublicKey;
  shardIndex: number;
  fileCount: number;
  status: ShardStatus;
  fileRecords: PublicKey[];
  createdAt: bigint;
  updatedAt: bigint;
  reserved: Uint8Array;
}

export interface IndexEntry {
  fileId: Uint8Array;
  shardIndex: number;
  slotIndex: number;
}

export interface UserVaultIndex {
  bump: number;
  vaultMaster: PublicKey;
  owner: PublicKey;
  entryCount: number;
  createdAt: bigint;
  updatedAt: bigint;
  entries: IndexEntry[];
  reserved: Uint8Array;
}

// Parsed Sharding Types for Frontend
export interface ParsedVaultMaster {
  publicKey: PublicKey;
  owner: string;
  totalFileCount: number;
  totalShards: number;
  activeShardIndex: number;
  totalStorage: number;
  shardPointers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedVaultShard {
  publicKey: PublicKey;
  vaultMaster: string;
  owner: string;
  shardIndex: number;
  fileCount: number;
  status: 'active' | 'full' | 'archived';
  fileRecords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedVaultIndex {
  publicKey: PublicKey;
  vaultMaster: string;
  owner: string;
  entryCount: number;
  entries: { fileId: string; shardIndex: number; slotIndex: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FileLocation {
  shardIndex: number;
  slotIndex: number;
}

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
