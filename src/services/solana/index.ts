/**
 * BlockDrive Solana SDK
 * TypeScript client for interacting with the BlockDrive Solana program
 */

export { BlockDriveClient } from './blockDriveClient';
export type { BlockDriveClientConfig, SignAndSendTransaction } from './blockDriveClient';

export {
  VaultStatus,
  FileStatus,
  SecurityLevel,
  PermissionLevel,
  BLOCKDRIVE_PROGRAM_ID,
  VAULT_SEED,
  FILE_SEED,
  DELEGATION_SEED,
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
} from './types';

export {
  deriveVaultPDA,
  deriveFileRecordPDA,
  deriveDelegationPDA,
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
