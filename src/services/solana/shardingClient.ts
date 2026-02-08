/**
 * BlockDrive Sharding Client
 * 
 * Handles Multi-PDA Sharding for scalable file storage (1000+ files per user).
 * This client abstracts all sharding complexity from the rest of the application.
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  BLOCKDRIVE_PROGRAM_ID,
  SecurityLevel,
  ParsedVaultMaster,
  ParsedVaultShard,
  ParsedVaultIndex,
  ParsedFileRecord,
  FileLocation,
  ShardStatus,
  FileStatus,
  FILES_PER_SHARD,
  MAX_SHARDS,
} from './types';
import {
  deriveVaultMasterPDA,
  deriveVaultShardPDA,
  deriveVaultIndexPDA,
  deriveShardedFileRecordPDA,
  uuidToBytes,
  bytesToUuid,
  cidToBytes,
  bytesToCid,
  sha256Hash,
  generateFileId,
  bytesToHex,
} from './pdaUtils';

export interface ShardingClientConfig {
  connection: Connection;
  programId?: PublicKey;
}

export interface RegisterFileShardedParams {
  filename: string;
  mimeType: string;
  fileSize: number;
  encryptedSize: number;
  securityLevel: SecurityLevel;
  encryptionCommitment: Uint8Array;
  criticalBytesCommitment: Uint8Array;
  primaryCid: string;
}

export interface RegisterFileShardedResult {
  transaction: Transaction;
  fileId: string;
  shardIndex: number;
  slotIndex: number;
  fileRecordPDA: PublicKey;
}

/**
 * ShardingClient - Manages sharded file storage on Solana
 * 
 * Usage flow:
 * 1. ensureVaultMasterExists() - Creates master + index if needed
 * 2. registerFileSharded() - Handles shard selection/creation automatically
 * 3. findFileLocation() - Locates files by ID using the index
 */
export class ShardingClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(config: ShardingClientConfig) {
    this.connection = config.connection;
    this.programId = config.programId || BLOCKDRIVE_PROGRAM_ID;
  }

  // ============================================
  // PDA Derivation
  // ============================================

  getVaultMasterPDA(owner: PublicKey): [PublicKey, number] {
    return deriveVaultMasterPDA(owner);
  }

  getVaultShardPDA(vaultMaster: PublicKey, shardIndex: number): [PublicKey, number] {
    return deriveVaultShardPDA(vaultMaster, shardIndex);
  }

  getVaultIndexPDA(vaultMaster: PublicKey): [PublicKey, number] {
    return deriveVaultIndexPDA(vaultMaster);
  }

  getFileRecordPDA(vaultMaster: PublicKey, fileId: Uint8Array): [PublicKey, number] {
    return deriveShardedFileRecordPDA(vaultMaster, fileId);
  }

  // ============================================
  // Account Existence Checks
  // ============================================

  async vaultMasterExists(owner: PublicKey): Promise<boolean> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const accountInfo = await this.connection.getAccountInfo(vaultMasterPDA);
    return accountInfo !== null;
  }

  async getVaultMaster(owner: PublicKey): Promise<ParsedVaultMaster | null> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    try {
      const accountInfo = await this.connection.getAccountInfo(vaultMasterPDA);
      if (!accountInfo) return null;
      return this.parseVaultMaster(vaultMasterPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching vault master:', error);
      return null;
    }
  }

  async getVaultShard(vaultMaster: PublicKey, shardIndex: number): Promise<ParsedVaultShard | null> {
    const [shardPDA] = this.getVaultShardPDA(vaultMaster, shardIndex);
    try {
      const accountInfo = await this.connection.getAccountInfo(shardPDA);
      if (!accountInfo) return null;
      return this.parseVaultShard(shardPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching vault shard:', error);
      return null;
    }
  }

  async getVaultIndex(vaultMaster: PublicKey): Promise<ParsedVaultIndex | null> {
    const [indexPDA] = this.getVaultIndexPDA(vaultMaster);
    try {
      const accountInfo = await this.connection.getAccountInfo(indexPDA);
      if (!accountInfo) return null;
      return this.parseVaultIndex(indexPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching vault index:', error);
      return null;
    }
  }

  /**
   * Fetch a FileRecord by owner and file ID.
   * Returns the parsed FileRecord including criticalBytesCommitment for verification.
   */
  async getFileRecord(owner: PublicKey, fileId: string): Promise<ParsedFileRecord | null> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const fileIdBytes = uuidToBytes(fileId);
    const [fileRecordPDA] = this.getFileRecordPDA(vaultMasterPDA, fileIdBytes);

    try {
      const accountInfo = await this.connection.getAccountInfo(fileRecordPDA);
      if (!accountInfo) return null;
      return this.parseFileRecord(fileRecordPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching file record:', error);
      return null;
    }
  }

  /**
   * Verify a file's commitment against on-chain data.
   * Returns true if the commitment matches, false otherwise.
   */
  async verifyCommitment(
    owner: PublicKey,
    fileId: string,
    expectedCommitment: string
  ): Promise<{ verified: boolean; onChainCommitment?: string; error?: string }> {
    try {
      const fileRecord = await this.getFileRecord(owner, fileId);
      if (!fileRecord) {
        return { verified: false, error: 'File record not found on-chain' };
      }

      const onChainCommitment = fileRecord.criticalBytesCommitment;
      const verified = onChainCommitment === expectedCommitment;

      return {
        verified,
        onChainCommitment,
        error: verified ? undefined : 'Commitment mismatch - data may be tampered'
      };
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  // ============================================
  // High-Level Operations (Seamless UX)
  // ============================================

  /**
   * Ensures the user has a VaultMaster and VaultIndex.
   * Creates them if they don't exist (transparent to user).
   * Returns the transaction if creation is needed, null if already exists.
   */
  async ensureVaultMasterExists(owner: PublicKey): Promise<Transaction | null> {
    const exists = await this.vaultMasterExists(owner);
    if (exists) return null;
    
    return this.buildInitializeVaultMasterTx(owner);
  }

  /**
   * Ensures a shard with capacity exists.
   * Creates a new shard if the active shard is full.
   * Returns { needsNewShard, transaction, shardIndex }
   */
  async ensureShardCapacity(owner: PublicKey): Promise<{
    needsNewShard: boolean;
    transaction: Transaction | null;
    shardIndex: number;
  }> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const master = await this.getVaultMaster(owner);
    
    if (!master) {
      throw new Error('VaultMaster does not exist. Call ensureVaultMasterExists first.');
    }

    // No shards yet - need to create first shard
    if (master.totalShards === 0) {
      const tx = await this.buildCreateShardTx(owner, 0);
      return { needsNewShard: true, transaction: tx, shardIndex: 0 };
    }

    // Check if active shard has capacity
    const activeShard = await this.getVaultShard(vaultMasterPDA, master.activeShardIndex);
    if (!activeShard) {
      throw new Error(`Active shard ${master.activeShardIndex} not found`);
    }

    if (activeShard.fileCount < FILES_PER_SHARD) {
      // Active shard has capacity
      return { needsNewShard: false, transaction: null, shardIndex: master.activeShardIndex };
    }

    // Active shard is full - create new one
    const newShardIndex = master.totalShards;
    if (newShardIndex >= MAX_SHARDS) {
      throw new Error('Maximum shards reached (1000 files limit)');
    }

    const tx = await this.buildCreateShardTx(owner, newShardIndex);
    return { needsNewShard: true, transaction: tx, shardIndex: newShardIndex };
  }

  /**
   * Register a file to the appropriate shard.
   * Automatically selects the active shard with capacity.
   */
  async registerFileSharded(
    owner: PublicKey,
    params: RegisterFileShardedParams
  ): Promise<RegisterFileShardedResult> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const master = await this.getVaultMaster(owner);
    
    if (!master) {
      throw new Error('VaultMaster does not exist');
    }

    if (master.totalShards === 0) {
      throw new Error('No shards exist. Create a shard first.');
    }

    // Get active shard to determine slot index
    const activeShard = await this.getVaultShard(vaultMasterPDA, master.activeShardIndex);
    if (!activeShard || activeShard.fileCount >= FILES_PER_SHARD) {
      throw new Error('Active shard is full. Create a new shard first.');
    }

    const fileIdBytes = generateFileId();
    const [fileRecordPDA] = this.getFileRecordPDA(vaultMasterPDA, fileIdBytes);

    const transaction = await this.buildRegisterFileShardedTx(
      owner,
      master.activeShardIndex,
      fileIdBytes,
      params
    );

    return {
      transaction,
      fileId: bytesToUuid(fileIdBytes),
      shardIndex: master.activeShardIndex,
      slotIndex: activeShard.fileCount, // Will be the next slot
      fileRecordPDA,
    };
  }

  /**
   * Find where a file is stored using the VaultIndex.
   * Returns { shardIndex, slotIndex } or null if not found.
   */
  async findFileLocation(owner: PublicKey, fileId: string): Promise<FileLocation | null> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const index = await this.getVaultIndex(vaultMasterPDA);
    
    if (!index) return null;

    const fileIdBytes = uuidToBytes(fileId);
    const fileIdHex = bytesToHex(fileIdBytes);

    const entry = index.entries.find(e => e.fileId === fileIdHex);
    if (!entry) return null;

    return {
      shardIndex: entry.shardIndex,
      slotIndex: entry.slotIndex,
    };
  }

  // ============================================
  // Transaction Builders
  // ============================================

  async buildInitializeVaultMasterTx(owner: PublicKey): Promise<Transaction> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const [vaultIndexPDA] = this.getVaultIndexPDA(vaultMasterPDA);

    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: vaultMasterPDA, isSigner: false, isWritable: true },
        { pubkey: vaultIndexPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: this.encodeInitializeVaultMaster(),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = owner;

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    return transaction;
  }

  async buildCreateShardTx(owner: PublicKey, shardIndex: number): Promise<Transaction> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const [vaultShardPDA] = this.getVaultShardPDA(vaultMasterPDA, shardIndex);

    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: vaultMasterPDA, isSigner: false, isWritable: true },
        { pubkey: vaultShardPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: this.encodeCreateShard(shardIndex),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = owner;

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    return transaction;
  }

  async buildRegisterFileShardedTx(
    owner: PublicKey,
    shardIndex: number,
    fileIdBytes: Uint8Array,
    params: RegisterFileShardedParams
  ): Promise<Transaction> {
    const [vaultMasterPDA] = this.getVaultMasterPDA(owner);
    const [vaultShardPDA] = this.getVaultShardPDA(vaultMasterPDA, shardIndex);
    const [vaultIndexPDA] = this.getVaultIndexPDA(vaultMasterPDA);
    const [fileRecordPDA] = this.getFileRecordPDA(vaultMasterPDA, fileIdBytes);

    const filenameHash = await sha256Hash(params.filename);
    const mimeTypeHash = await sha256Hash(params.mimeType);
    const primaryCidBytes = cidToBytes(params.primaryCid);

    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: vaultMasterPDA, isSigner: false, isWritable: true },
        { pubkey: vaultShardPDA, isSigner: false, isWritable: true },
        { pubkey: vaultIndexPDA, isSigner: false, isWritable: true },
        { pubkey: fileRecordPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: this.encodeRegisterFileSharded({
        fileId: fileIdBytes,
        shardIndex,
        filenameHash,
        fileSize: BigInt(params.fileSize),
        encryptedSize: BigInt(params.encryptedSize),
        mimeTypeHash,
        securityLevel: params.securityLevel,
        encryptionCommitment: params.encryptionCommitment,
        criticalBytesCommitment: params.criticalBytesCommitment,
        primaryCid: primaryCidBytes,
      }),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = owner;

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    return transaction;
  }

  // ============================================
  // Instruction Encoding
  // ============================================

  /**
   * Compute Anchor instruction discriminator
   * Anchor uses first 8 bytes of SHA256("global:<instruction_name>")
   */
  private computeDiscriminator(instructionName: string): Buffer {
    // Use synchronous computation via crypto module
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(`global:${instructionName}`)
      .digest();
    return hash.slice(0, 8);
  }

  private encodeInitializeVaultMaster(): Buffer {
    // Anchor discriminator: SHA256("global:initialize_vault_master")[0..8]
    const discriminator = this.computeDiscriminator('initialize_vault_master');
    return discriminator;
  }

  private encodeCreateShard(shardIndex: number): Buffer {
    // Anchor discriminator: SHA256("global:create_shard")[0..8]
    const discriminator = this.computeDiscriminator('create_shard');

    // Validate shard index bounds
    if (shardIndex < 0 || shardIndex >= MAX_SHARDS) {
      throw new Error(`Invalid shard index ${shardIndex}. Must be 0-${MAX_SHARDS - 1}`);
    }

    return Buffer.concat([discriminator, Buffer.from([shardIndex])]);
  }

  private encodeRegisterFileSharded(params: {
    fileId: Uint8Array;
    shardIndex: number;
    filenameHash: Uint8Array;
    fileSize: bigint;
    encryptedSize: bigint;
    mimeTypeHash: Uint8Array;
    securityLevel: number;
    encryptionCommitment: Uint8Array;
    criticalBytesCommitment: Uint8Array;
    primaryCid: Uint8Array;
  }): Buffer {
    // Anchor discriminator: SHA256("global:register_file_sharded")[0..8]
    const discriminator = this.computeDiscriminator('register_file_sharded');

    // Validate shard index bounds
    if (params.shardIndex < 0 || params.shardIndex >= MAX_SHARDS) {
      throw new Error(`Invalid shard index ${params.shardIndex}. Must be 0-${MAX_SHARDS - 1}`);
    }

    const fileSizeBuffer = Buffer.alloc(8);
    fileSizeBuffer.writeBigUInt64LE(params.fileSize);

    const encryptedSizeBuffer = Buffer.alloc(8);
    encryptedSizeBuffer.writeBigUInt64LE(params.encryptedSize);

    return Buffer.concat([
      discriminator,
      Buffer.from(params.fileId),              // 16 bytes
      Buffer.from([params.shardIndex]),        // 1 byte
      Buffer.from(params.filenameHash),        // 32 bytes
      fileSizeBuffer,                          // 8 bytes
      encryptedSizeBuffer,                     // 8 bytes
      Buffer.from(params.mimeTypeHash),        // 32 bytes
      Buffer.from([params.securityLevel]),     // 1 byte
      Buffer.from(params.encryptionCommitment),    // 32 bytes
      Buffer.from(params.criticalBytesCommitment), // 32 bytes
      Buffer.from(params.primaryCid),          // 64 bytes
    ]);
  }

  // ============================================
  // Account Parsing
  // ============================================

  private parseVaultMaster(pubkey: PublicKey, data: Buffer): ParsedVaultMaster | null {
    try {
      // Skip 8-byte discriminator + 1-byte bump
      let offset = 9;

      const owner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const totalFileCount = data.readBigUInt64LE(offset);
      offset += 8;

      const totalShards = data.readUInt8(offset);
      offset += 1;

      const activeShardIndex = data.readUInt8(offset);
      offset += 1;

      const totalStorage = data.readBigUInt64LE(offset);
      offset += 8;

      // Parse shard pointers (10 * 32 = 320 bytes)
      const shardPointers: string[] = [];
      for (let i = 0; i < 10; i++) {
        const ptr = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        if (!ptr.equals(PublicKey.default)) {
          shardPointers.push(ptr.toBase58());
        }
      }

      const createdAt = data.readBigInt64LE(offset);
      offset += 8;

      const updatedAt = data.readBigInt64LE(offset);

      return {
        publicKey: pubkey,
        owner: owner.toBase58(),
        totalFileCount: Number(totalFileCount),
        totalShards,
        activeShardIndex,
        totalStorage: Number(totalStorage),
        shardPointers,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
      };
    } catch (error) {
      console.error('Error parsing vault master:', error);
      return null;
    }
  }

  private parseVaultShard(pubkey: PublicKey, data: Buffer): ParsedVaultShard | null {
    try {
      // Skip 8-byte discriminator + 1-byte bump
      let offset = 9;

      const vaultMaster = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const owner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const shardIndex = data.readUInt8(offset);
      offset += 1;

      const fileCount = data.readUInt8(offset);
      offset += 1;

      const status = data.readUInt8(offset);
      offset += 1;

      // Parse file records (100 * 32 = 3200 bytes)
      const fileRecords: string[] = [];
      for (let i = 0; i < 100; i++) {
        const ptr = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        if (!ptr.equals(PublicKey.default)) {
          fileRecords.push(ptr.toBase58());
        }
      }

      const createdAt = data.readBigInt64LE(offset);
      offset += 8;

      const updatedAt = data.readBigInt64LE(offset);

      return {
        publicKey: pubkey,
        vaultMaster: vaultMaster.toBase58(),
        owner: owner.toBase58(),
        shardIndex,
        fileCount,
        status: status === ShardStatus.Active ? 'active' :
                status === ShardStatus.Full ? 'full' : 'archived',
        fileRecords,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
      };
    } catch (error) {
      console.error('Error parsing vault shard:', error);
      return null;
    }
  }

  private parseVaultIndex(pubkey: PublicKey, data: Buffer): ParsedVaultIndex | null {
    try {
      // Skip 8-byte discriminator + 1-byte bump
      let offset = 9;

      const vaultMaster = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const owner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const entryCount = data.readUInt16LE(offset);
      offset += 2;

      const createdAt = data.readBigInt64LE(offset);
      offset += 8;

      const updatedAt = data.readBigInt64LE(offset);
      offset += 8;

      // Parse entries (vec length + entries)
      const vecLen = data.readUInt32LE(offset);
      offset += 4;

      const entries: { fileId: string; shardIndex: number; slotIndex: number }[] = [];
      for (let i = 0; i < vecLen && i < entryCount; i++) {
        const fileId = data.slice(offset, offset + 16);
        offset += 16;
        const shardIndex = data.readUInt8(offset);
        offset += 1;
        const slotIndex = data.readUInt8(offset);
        offset += 1;

        entries.push({
          fileId: bytesToHex(fileId),
          shardIndex,
          slotIndex,
        });
      }

      return {
        publicKey: pubkey,
        vaultMaster: vaultMaster.toBase58(),
        owner: owner.toBase58(),
        entryCount,
        entries,
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
      };
    } catch (error) {
      console.error('Error parsing vault index:', error);
      return null;
    }
  }

  private parseFileRecord(pubkey: PublicKey, data: Buffer): ParsedFileRecord | null {
    try {
      // Skip 8-byte discriminator + 1-byte bump
      let offset = 9;

      const vault = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const owner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      const fileId = data.slice(offset, offset + 16);
      offset += 16;

      const filenameHash = data.slice(offset, offset + 32);
      offset += 32;

      const fileSize = data.readBigUInt64LE(offset);
      offset += 8;

      const encryptedSize = data.readBigUInt64LE(offset);
      offset += 8;

      const mimeTypeHash = data.slice(offset, offset + 32);
      offset += 32;

      const securityLevel = data.readUInt8(offset);
      offset += 1;

      const encryptionCommitment = data.slice(offset, offset + 32);
      offset += 32;

      const criticalBytesCommitment = data.slice(offset, offset + 32);
      offset += 32;

      const primaryCid = data.slice(offset, offset + 64);
      offset += 64;

      const redundancyCid = data.slice(offset, offset + 64);
      offset += 64;

      const providerCount = data.readUInt8(offset);
      offset += 1;

      const createdAt = data.readBigInt64LE(offset);
      offset += 8;

      const accessedAt = data.readBigInt64LE(offset);
      offset += 8;

      const status = data.readUInt8(offset);
      offset += 1;

      const isShared = data.readUInt8(offset) === 1;
      offset += 1;

      const delegationCount = data.readUInt8(offset);

      const redundancyCidStr = bytesToCid(redundancyCid);

      return {
        publicKey: pubkey,
        vault: vault.toBase58(),
        owner: owner.toBase58(),
        fileId: bytesToUuid(fileId),
        filenameHash: bytesToHex(filenameHash),
        fileSize: Number(fileSize),
        encryptedSize: Number(encryptedSize),
        mimeTypeHash: bytesToHex(mimeTypeHash),
        securityLevel: securityLevel === SecurityLevel.Standard ? 'standard' :
                       securityLevel === SecurityLevel.Enhanced ? 'enhanced' : 'maximum',
        encryptionCommitment: bytesToHex(encryptionCommitment),
        criticalBytesCommitment: bytesToHex(criticalBytesCommitment),
        primaryCid: bytesToCid(primaryCid),
        redundancyCid: redundancyCidStr || null,
        providerCount,
        createdAt: new Date(Number(createdAt) * 1000),
        accessedAt: new Date(Number(accessedAt) * 1000),
        status: status === FileStatus.Active ? 'active' :
                status === FileStatus.Archived ? 'archived' : 'deleted',
        isShared,
        delegationCount,
      };
    } catch (error) {
      console.error('Error parsing file record:', error);
      return null;
    }
  }
}
