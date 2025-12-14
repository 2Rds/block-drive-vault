/**
 * BlockDrive Solana SDK Client
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { 
  BLOCKDRIVE_PROGRAM_ID,
  SecurityLevel,
  PermissionLevel,
  ParsedUserVault,
  ParsedFileRecord,
  ParsedDelegation,
  VaultStatus,
  FileStatus,
} from './types';
import {
  deriveVaultPDA,
  deriveFileRecordPDA,
  deriveDelegationPDA,
  uuidToBytes,
  bytesToUuid,
  cidToBytes,
  bytesToCid,
  sha256Hash,
  bytesToHex,
  generateFileId,
} from './pdaUtils';

export interface BlockDriveClientConfig {
  connection: Connection;
  programId?: PublicKey;
}

export interface SignAndSendTransaction {
  (transaction: Transaction): Promise<string>;
}

export class BlockDriveClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(config: BlockDriveClientConfig) {
    this.connection = config.connection;
    this.programId = config.programId || BLOCKDRIVE_PROGRAM_ID;
  }

  // ============================================
  // PDA Derivation
  // ============================================

  getVaultPDA(owner: PublicKey): [PublicKey, number] {
    return deriveVaultPDA(owner);
  }

  getFileRecordPDA(vault: PublicKey, fileId: Uint8Array): [PublicKey, number] {
    return deriveFileRecordPDA(vault, fileId);
  }

  getDelegationPDA(fileRecord: PublicKey, grantee: PublicKey): [PublicKey, number] {
    return deriveDelegationPDA(fileRecord, grantee);
  }

  // ============================================
  // Account Fetching
  // ============================================

  async getVault(owner: PublicKey): Promise<ParsedUserVault | null> {
    const [vaultPDA] = this.getVaultPDA(owner);
    
    try {
      const accountInfo = await this.connection.getAccountInfo(vaultPDA);
      if (!accountInfo) return null;
      
      return this.parseVaultAccount(vaultPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching vault:', error);
      return null;
    }
  }

  async getFileRecord(vault: PublicKey, fileId: string): Promise<ParsedFileRecord | null> {
    const fileIdBytes = uuidToBytes(fileId);
    const [fileRecordPDA] = this.getFileRecordPDA(vault, fileIdBytes);
    
    try {
      const accountInfo = await this.connection.getAccountInfo(fileRecordPDA);
      if (!accountInfo) return null;
      
      return this.parseFileRecordAccount(fileRecordPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching file record:', error);
      return null;
    }
  }

  async getDelegation(fileRecord: PublicKey, grantee: PublicKey): Promise<ParsedDelegation | null> {
    const [delegationPDA] = this.getDelegationPDA(fileRecord, grantee);
    
    try {
      const accountInfo = await this.connection.getAccountInfo(delegationPDA);
      if (!accountInfo) return null;
      
      return this.parseDelegationAccount(delegationPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching delegation:', error);
      return null;
    }
  }

  async getUserFiles(owner: PublicKey): Promise<ParsedFileRecord[]> {
    // Use getProgramAccounts with filters to find all files for a user
    const [vaultPDA] = this.getVaultPDA(owner);
    
    try {
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          { memcmp: { offset: 8 + 1, bytes: vaultPDA.toBase58() } }, // vault field
        ],
      });
      
      return accounts
        .map(({ pubkey, account }) => this.parseFileRecordAccount(pubkey, account.data))
        .filter((record): record is ParsedFileRecord => record !== null);
    } catch (error) {
      console.error('Error fetching user files:', error);
      return [];
    }
  }

  async getFileDelegations(fileRecord: PublicKey): Promise<ParsedDelegation[]> {
    try {
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          { memcmp: { offset: 8 + 1, bytes: fileRecord.toBase58() } }, // fileRecord field
        ],
      });
      
      return accounts
        .map(({ pubkey, account }) => this.parseDelegationAccount(pubkey, account.data))
        .filter((delegation): delegation is ParsedDelegation => delegation !== null);
    } catch (error) {
      console.error('Error fetching file delegations:', error);
      return [];
    }
  }

  async getIncomingDelegations(grantee: PublicKey): Promise<ParsedDelegation[]> {
    try {
      // Find all delegations where this wallet is the grantee
      // Grantee is at offset: 8 (discriminator) + 1 (bump) + 32 (fileRecord) + 32 (grantor) = 73
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          { memcmp: { offset: 73, bytes: grantee.toBase58() } },
        ],
      });
      
      return accounts
        .map(({ pubkey, account }) => this.parseDelegationAccount(pubkey, account.data))
        .filter((delegation): delegation is ParsedDelegation => 
          delegation !== null && delegation.isActive
        );
    } catch (error) {
      console.error('Error fetching incoming delegations:', error);
      return [];
    }
  }

  async getFileRecordByPubkey(fileRecordPubkey: PublicKey): Promise<ParsedFileRecord | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(fileRecordPubkey);
      if (!accountInfo) return null;
      
      return this.parseFileRecordAccount(fileRecordPubkey, accountInfo.data);
    } catch (error) {
      console.error('Error fetching file record:', error);
      return null;
    }
  }

  // ============================================
  // Transaction Builders
  // ============================================

  async buildInitializeVaultTx(
    owner: PublicKey,
    masterKeyCommitment: Uint8Array
  ): Promise<Transaction> {
    const [vaultPDA] = this.getVaultPDA(owner);
    
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: this.encodeInitializeVault(masterKeyCommitment),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = owner;
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    return transaction;
  }

  async buildRegisterFileTx(
    owner: PublicKey,
    params: {
      filename: string;
      mimeType: string;
      fileSize: number;
      encryptedSize: number;
      securityLevel: SecurityLevel;
      encryptionCommitment: Uint8Array;
      criticalBytesCommitment: Uint8Array;
      primaryCid: string;
    }
  ): Promise<{ transaction: Transaction; fileId: string }> {
    const [vaultPDA] = this.getVaultPDA(owner);
    const fileIdBytes = generateFileId();
    const [fileRecordPDA] = this.getFileRecordPDA(vaultPDA, fileIdBytes);
    
    const filenameHash = await sha256Hash(params.filename);
    const mimeTypeHash = await sha256Hash(params.mimeType);
    const primaryCidBytes = cidToBytes(params.primaryCid);
    
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: fileRecordPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: this.encodeRegisterFile({
        fileId: fileIdBytes,
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
    
    return { 
      transaction, 
      fileId: bytesToUuid(fileIdBytes) 
    };
  }

  async buildCreateDelegationTx(
    grantor: PublicKey,
    fileRecord: PublicKey,
    grantee: PublicKey,
    encryptedFileKey: Uint8Array,
    permissionLevel: PermissionLevel,
    expiresAt?: Date
  ): Promise<Transaction> {
    const [delegationPDA] = this.getDelegationPDA(fileRecord, grantee);
    
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: delegationPDA, isSigner: false, isWritable: true },
        { pubkey: fileRecord, isSigner: false, isWritable: true },
        { pubkey: grantor, isSigner: true, isWritable: true },
        { pubkey: grantee, isSigner: false, isWritable: false },
        { pubkey: grantor, isSigner: false, isWritable: false }, // owner
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: this.encodeCreateDelegation({
        encryptedFileKey,
        permissionLevel,
        expiresAt: expiresAt ? BigInt(Math.floor(expiresAt.getTime() / 1000)) : BigInt(0),
      }),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = grantor;
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    return transaction;
  }

  async buildRevokeDelegationTx(
    grantor: PublicKey,
    fileRecord: PublicKey,
    grantee: PublicKey
  ): Promise<Transaction> {
    const [delegationPDA] = this.getDelegationPDA(fileRecord, grantee);
    
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: delegationPDA, isSigner: false, isWritable: true },
        { pubkey: fileRecord, isSigner: false, isWritable: true },
        { pubkey: grantor, isSigner: true, isWritable: true },
      ],
      data: this.encodeRevokeDelegation(),
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = grantor;
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    return transaction;
  }

  async buildDeleteFileTx(
    owner: PublicKey,
    fileId: string
  ): Promise<Transaction> {
    const [vaultPDA] = this.getVaultPDA(owner);
    const fileIdBytes = uuidToBytes(fileId);
    const [fileRecordPDA] = this.getFileRecordPDA(vaultPDA, fileIdBytes);
    
    const instruction = new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: fileRecordPDA, isSigner: false, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
      ],
      data: this.encodeDeleteFile(),
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

  private encodeInitializeVault(masterKeyCommitment: Uint8Array): Buffer {
    // Anchor discriminator for initialize_vault
    const discriminator = Buffer.from([0x5f, 0x59, 0x89, 0x86, 0x67, 0x29, 0xb6, 0x36]);
    return Buffer.concat([discriminator, Buffer.from(masterKeyCommitment)]);
  }

  private encodeRegisterFile(params: {
    fileId: Uint8Array;
    filenameHash: Uint8Array;
    fileSize: bigint;
    encryptedSize: bigint;
    mimeTypeHash: Uint8Array;
    securityLevel: number;
    encryptionCommitment: Uint8Array;
    criticalBytesCommitment: Uint8Array;
    primaryCid: Uint8Array;
  }): Buffer {
    const discriminator = Buffer.from([0xa1, 0x2b, 0x3c, 0x4d, 0x5e, 0x6f, 0x70, 0x81]);
    
    const fileSizeBuffer = Buffer.alloc(8);
    fileSizeBuffer.writeBigUInt64LE(params.fileSize);
    
    const encryptedSizeBuffer = Buffer.alloc(8);
    encryptedSizeBuffer.writeBigUInt64LE(params.encryptedSize);
    
    return Buffer.concat([
      discriminator,
      Buffer.from(params.fileId),
      Buffer.from(params.filenameHash),
      fileSizeBuffer,
      encryptedSizeBuffer,
      Buffer.from(params.mimeTypeHash),
      Buffer.from([params.securityLevel]),
      Buffer.from(params.encryptionCommitment),
      Buffer.from(params.criticalBytesCommitment),
      Buffer.from(params.primaryCid),
    ]);
  }

  private encodeCreateDelegation(params: {
    encryptedFileKey: Uint8Array;
    permissionLevel: number;
    expiresAt: bigint;
  }): Buffer {
    const discriminator = Buffer.from([0xb2, 0x3c, 0x4d, 0x5e, 0x6f, 0x70, 0x81, 0x92]);
    
    const expiresAtBuffer = Buffer.alloc(8);
    expiresAtBuffer.writeBigInt64LE(params.expiresAt);
    
    // Pad encrypted file key to 128 bytes
    const paddedKey = new Uint8Array(128);
    paddedKey.set(params.encryptedFileKey.slice(0, 128));
    
    return Buffer.concat([
      discriminator,
      Buffer.from(paddedKey),
      Buffer.from([params.permissionLevel]),
      expiresAtBuffer,
    ]);
  }

  private encodeRevokeDelegation(): Buffer {
    const discriminator = Buffer.from([0xc3, 0x4d, 0x5e, 0x6f, 0x70, 0x81, 0x92, 0xa3]);
    return discriminator;
  }

  private encodeDeleteFile(): Buffer {
    const discriminator = Buffer.from([0xd4, 0x5e, 0x6f, 0x70, 0x81, 0x92, 0xa3, 0xb4]);
    return discriminator;
  }

  // ============================================
  // Account Parsing
  // ============================================

  private parseVaultAccount(pubkey: PublicKey, data: Buffer): ParsedUserVault | null {
    try {
      // Skip 8-byte discriminator
      let offset = 8;
      
      const bump = data.readUInt8(offset);
      offset += 1;
      
      const owner = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const masterKeyCommitment = data.slice(offset, offset + 32);
      offset += 32;
      
      const fileCount = data.readBigUInt64LE(offset);
      offset += 8;
      
      const totalStorage = data.readBigUInt64LE(offset);
      offset += 8;
      
      const createdAt = data.readBigInt64LE(offset);
      offset += 8;
      
      const updatedAt = data.readBigInt64LE(offset);
      offset += 8;
      
      const status = data.readUInt8(offset);

      return {
        publicKey: pubkey,
        owner: owner.toBase58(),
        masterKeyCommitment: bytesToHex(masterKeyCommitment),
        fileCount: Number(fileCount),
        totalStorage: Number(totalStorage),
        createdAt: new Date(Number(createdAt) * 1000),
        updatedAt: new Date(Number(updatedAt) * 1000),
        status: status === VaultStatus.Active ? 'active' : 
                status === VaultStatus.Frozen ? 'frozen' : 'deleted',
      };
    } catch (error) {
      console.error('Error parsing vault account:', error);
      return null;
    }
  }

  private parseFileRecordAccount(pubkey: PublicKey, data: Buffer): ParsedFileRecord | null {
    try {
      let offset = 8; // discriminator
      
      const bump = data.readUInt8(offset);
      offset += 1;
      
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
      console.error('Error parsing file record account:', error);
      return null;
    }
  }

  private parseDelegationAccount(pubkey: PublicKey, data: Buffer): ParsedDelegation | null {
    try {
      let offset = 8; // discriminator
      
      const bump = data.readUInt8(offset);
      offset += 1;
      
      const fileRecord = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const grantor = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const grantee = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const encryptedFileKey = new Uint8Array(data.slice(offset, offset + 128));
      offset += 128;
      
      const permissionLevel = data.readUInt8(offset);
      offset += 1;
      
      const expiresAt = data.readBigInt64LE(offset);
      offset += 8;
      
      const createdAt = data.readBigInt64LE(offset);
      offset += 8;
      
      const isActive = data.readUInt8(offset) === 1;
      offset += 1;
      
      const isAccepted = data.readUInt8(offset) === 1;
      offset += 1;
      
      const accessCount = data.readBigUInt64LE(offset);
      offset += 8;
      
      const lastAccessedAt = data.readBigInt64LE(offset);

      return {
        publicKey: pubkey,
        fileRecord: fileRecord.toBase58(),
        grantor: grantor.toBase58(),
        grantee: grantee.toBase58(),
        encryptedFileKey,
        permissionLevel: permissionLevel === PermissionLevel.View ? 'view' :
                         permissionLevel === PermissionLevel.Download ? 'download' : 'reshare',
        expiresAt: Number(expiresAt) > 0 ? new Date(Number(expiresAt) * 1000) : null,
        createdAt: new Date(Number(createdAt) * 1000),
        isActive,
        isAccepted,
        accessCount: Number(accessCount),
        lastAccessedAt: Number(lastAccessedAt) > 0 ? new Date(Number(lastAccessedAt) * 1000) : null,
      };
    } catch (error) {
      console.error('Error parsing delegation account:', error);
      return null;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  async getVaultRentExemption(): Promise<number> {
    return await this.connection.getMinimumBalanceForRentExemption(170);
  }

  async getFileRecordRentExemption(): Promise<number> {
    return await this.connection.getMinimumBalanceForRentExemption(413);
  }

  async getDelegationRentExemption(): Promise<number> {
    return await this.connection.getMinimumBalanceForRentExemption(291);
  }

  async checkVaultExists(owner: PublicKey): Promise<boolean> {
    const [vaultPDA] = this.getVaultPDA(owner);
    const accountInfo = await this.connection.getAccountInfo(vaultPDA);
    return accountInfo !== null;
  }
}
