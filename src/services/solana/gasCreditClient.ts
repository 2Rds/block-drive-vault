/**
 * Gas Credits Solana Client
 *
 * Handles interaction with GasCreditsAccount PDAs on Solana
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {  BLOCKDRIVE_PROGRAM_ID } from './types';
import * as borsh from 'borsh';

export interface GasCreditClientConfig {
  connection: Connection;
  programId?: PublicKey;
}

export interface GasCreditsAccount {
  bump: number;
  owner: PublicKey;
  balanceUsdc: bigint;
  totalCredits: bigint;
  creditsUsed: bigint;
  lastTopUpAt: bigint;
  expiresAt: bigint;
  reserved: Uint8Array;
}

export interface ParsedGasCreditsAccount extends GasCreditsAccount {
  address: PublicKey;
}

export class GasCreditClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(config: GasCreditClientConfig) {
    this.connection = config.connection;
    this.programId = config.programId || BLOCKDRIVE_PROGRAM_ID;
  }

  // ============================================
  // PDA Derivation
  // ============================================

  getGasCreditsPDA(owner: PublicKey): [PublicKey, number] {
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('gas_credits'), owner.toBuffer()],
      this.programId
    );
    return [pda, bump];
  }

  // ============================================
  // Account Fetching
  // ============================================

  async getGasCredits(owner: PublicKey): Promise<ParsedGasCreditsAccount | null> {
    const [gasCreditsP DA] = this.getGasCreditsPDA(owner);

    try {
      const accountInfo = await this.connection.getAccountInfo(gasCreditsPDA);
      if (!accountInfo) return null;

      return this.parseGasCreditsAccount(gasCreditsPDA, accountInfo.data);
    } catch (error) {
      console.error('Error fetching gas credits:', error);
      return null;
    }
  }

  async getBalance(owner: PublicKey): Promise<bigint> {
    const gasCredits = await this.getGasCredits(owner);
    return gasCredits?.balanceUsdc ?? BigInt(0);
  }

  async getUsagePercentage(owner: PublicKey): Promise<number> {
    const gasCredits = await this.getGasCredits(owner);
    if (!gasCredits || gasCredits.totalCredits === BigInt(0)) {
      return 0;
    }

    const used = Number(gasCredits.creditsUsed);
    const total = Number(gasCredits.totalCredits);
    return Math.floor((used / total) * 100);
  }

  async isExpired(owner: PublicKey): Promise<boolean> {
    const gasCredits = await this.getGasCredits(owner);
    if (!gasCredits || gasCredits.expiresAt === BigInt(0)) {
      return false;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    return Number(gasCredits.expiresAt) < currentTimestamp;
  }

  async hasSufficientBalance(owner: PublicKey, amount: bigint): Promise<boolean> {
    const balance = await this.getBalance(owner);
    return balance >= amount;
  }

  // ============================================
  // Instruction Builders
  // ============================================

  async buildInitializeGasCreditsIx(
    owner: PublicKey,
    initialBalance: bigint
  ): Promise<TransactionInstruction> {
    const [gasCredits] = this.getGasCreditsPDA(owner);

    // Instruction discriminator (first 8 bytes of sha256("global:initialize_gas_credits"))
    const discriminator = Buffer.from([0x9a, 0x4c, 0x15, 0x8e, 0x12, 0x34, 0x56, 0x78]);

    // Serialize instruction data
    const data = Buffer.concat([
      discriminator,
      this.serializeU64(initialBalance),
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: gasCredits, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  async buildAddCreditsIx(
    owner: PublicKey,
    amount: bigint
  ): Promise<TransactionInstruction> {
    const [gasCredits, bump] = this.getGasCreditsPDA(owner);

    // Instruction discriminator for add_credits
    const discriminator = Buffer.from([0x6a, 0x7b, 0x8c, 0x9d, 0x11, 0x22, 0x33, 0x44]);

    const data = Buffer.concat([
      discriminator,
      this.serializeU64(amount),
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: gasCredits, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  async buildDeductCreditsIx(
    user: PublicKey,
    authority: PublicKey,
    amount: bigint,
    operationType: string
  ): Promise<TransactionInstruction> {
    const [gasCredits] = this.getGasCreditsPDA(user);

    // Instruction discriminator for deduct_credits
    const discriminator = Buffer.from([0x7c, 0x8d, 0x9e, 0xaf, 0x55, 0x66, 0x77, 0x88]);

    // Serialize operation type string
    const operationTypeBytes = Buffer.from(operationType, 'utf8');
    const operationTypeLen = Buffer.alloc(4);
    operationTypeLen.writeUInt32LE(operationTypeBytes.length, 0);

    const data = Buffer.concat([
      discriminator,
      this.serializeU64(amount),
      operationTypeLen,
      operationTypeBytes,
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: gasCredits, isSigner: false, isWritable: true },
        { pubkey: user, isSigner: false, isWritable: false },
        { pubkey: authority, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  async buildSetExpirationIx(
    owner: PublicKey,
    expiresAt: bigint
  ): Promise<TransactionInstruction> {
    const [gasCredits] = this.getGasCreditsPDA(owner);

    // Instruction discriminator for set_gas_credits_expiration
    const discriminator = Buffer.from([0x8d, 0x9e, 0xaf, 0xb0, 0x99, 0xaa, 0xbb, 0xcc]);

    const data = Buffer.concat([
      discriminator,
      this.serializeI64(expiresAt),
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: gasCredits, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  // ============================================
  // Transaction Builders
  // ============================================

  async createInitializeGasCreditsTransaction(
    owner: PublicKey,
    initialBalance: bigint
  ): Promise<Transaction> {
    const ix = await this.buildInitializeGasCreditsIx(owner, initialBalance);
    const tx = new Transaction().add(ix);
    tx.feePayer = owner;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    return tx;
  }

  async createAddCreditsTransaction(
    owner: PublicKey,
    amount: bigint
  ): Promise<Transaction> {
    const ix = await this.buildAddCreditsIx(owner, amount);
    const tx = new Transaction().add(ix);
    tx.feePayer = owner;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    return tx;
  }

  async createDeductCreditsTransaction(
    user: PublicKey,
    authority: PublicKey,
    amount: bigint,
    operationType: string
  ): Promise<Transaction> {
    const ix = await this.buildDeductCreditsIx(user, authority, amount, operationType);
    const tx = new Transaction().add(ix);
    tx.feePayer = authority;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    return tx;
  }

  // ============================================
  // Account Parsing
  // ============================================

  private parseGasCreditsAccount(
    address: PublicKey,
    data: Buffer
  ): ParsedGasCreditsAccount | null {
    try {
      // Skip 8-byte discriminator
      let offset = 8;

      const bump = data.readUInt8(offset);
      offset += 1;

      const owner = new PublicKey(data.subarray(offset, offset + 32));
      offset += 32;

      const balanceUsdc = data.readBigUInt64LE(offset);
      offset += 8;

      const totalCredits = data.readBigUInt64LE(offset);
      offset += 8;

      const creditsUsed = data.readBigUInt64LE(offset);
      offset += 8;

      const lastTopUpAt = data.readBigInt64LE(offset);
      offset += 8;

      const expiresAt = data.readBigInt64LE(offset);
      offset += 8;

      const reserved = data.subarray(offset, offset + 32);

      return {
        address,
        bump,
        owner,
        balanceUsdc,
        totalCredits,
        creditsUsed,
        lastTopUpAt,
        expiresAt,
        reserved,
      };
    } catch (error) {
      console.error('Error parsing gas credits account:', error);
      return null;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  private serializeU64(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value, 0);
    return buf;
  }

  private serializeI64(value: bigint): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(value, 0);
    return buf;
  }

  /**
   * Format USDC amount from lamports (6 decimals) to human-readable string
   */
  formatUsdc(lamports: bigint): string {
    const usdc = Number(lamports) / 1_000_000;
    return usdc.toFixed(2);
  }

  /**
   * Convert human-readable USDC amount to lamports
   */
  usdcToLamports(usdc: number): bigint {
    return BigInt(Math.floor(usdc * 1_000_000));
  }

  /**
   * Estimate operation cost based on operation type
   */
  estimateOperationCost(operationType: 'register_file' | 'update_file' | 'delete_file' | 'create_delegation'): bigint {
    const costs: Record<string, bigint> = {
      register_file: BigInt(5000),        // ~0.005 SOL equivalent
      update_file: BigInt(3000),          // ~0.003 SOL
      delete_file: BigInt(2000),          // ~0.002 SOL
      create_delegation: BigInt(4000),    // ~0.004 SOL
    };

    return costs[operationType] ?? BigInt(5000);
  }
}
