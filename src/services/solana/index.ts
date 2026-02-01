/**
 * BlockDrive Solana SDK
 * TypeScript client for interacting with the BlockDrive Solana program
 */

export { BlockDriveClient } from './blockDriveClient';
export type { BlockDriveClientConfig, SignAndSendTransaction } from './blockDriveClient';

// Sharding Client (Multi-PDA for 1000+ files)
export { ShardingClient } from './shardingClient';
export type { 
  ShardingClientConfig, 
  RegisterFileShardedParams, 
  RegisterFileShardedResult 
} from './shardingClient';

export {
  VaultStatus,
  FileStatus,
  SecurityLevel,
  PermissionLevel,
  ShardStatus,
  BLOCKDRIVE_PROGRAM_ID,
  VAULT_SEED,
  FILE_SEED,
  DELEGATION_SEED,
  VAULT_MASTER_SEED,
  VAULT_SHARD_SEED,
  VAULT_INDEX_SEED,
  MAX_SHARDS,
  FILES_PER_SHARD,
  MAX_FILES_TOTAL,
} from './types';

export type {
  UserVault,
  FileRecord,
  Delegation,
  ParsedUserVault,
  ParsedFileRecord,
  ParsedDelegation,
  InitializeVaultArgs,
  RegisterFileArgs,
  UpdateFileStorageArgs,
  CreateDelegationArgs,
  UpdateDelegationArgs,
  // Sharding types
  UserVaultMaster,
  UserVaultShard,
  UserVaultIndex,
  IndexEntry,
  ParsedVaultMaster,
  ParsedVaultShard,
  ParsedVaultIndex,
  FileLocation,
} from './types';

export {
  deriveVaultPDA,
  deriveFileRecordPDA,
  deriveDelegationPDA,
  deriveVaultMasterPDA,
  deriveVaultShardPDA,
  deriveVaultIndexPDA,
  deriveShardedFileRecordPDA,
  uuidToBytes,
  bytesToUuid,
  cidToBytes,
  bytesToCid,
  sha256Hash,
  sha256HashBytes,
  bytesToHex,
  hexToBytes,
  generateFileId,
} from './pdaUtils';

export { IDL } from './idl';
export type { BlockDrive } from './idl';
