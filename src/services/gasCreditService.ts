/**
 * Gas Credits Service
 *
 * High-level service for managing gas credits in the BlockDrive app.
 * Provides balance checking, cost estimation, and transaction building.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { GasCreditClient, ParsedGasCreditsAccount } from './solana/gasCreditClient';

export interface GasCreditsBalance {
  balance: bigint;
  balanceFormatted: string;
  totalCredits: bigint;
  creditsUsed: bigint;
  usagePercentage: number;
  lastTopUpAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
}

export interface OperationCostEstimate {
  operationType: string;
  cost: bigint;
  costFormatted: string;
  hasSufficientBalance: boolean;
}

export type OperationType =
  | 'register_file'
  | 'update_file'
  | 'delete_file'
  | 'create_delegation'
  | 'revoke_delegation'
  | 'archive_file';

export class GasCreditService {
  private client: GasCreditClient;
  private connection: Connection;

  constructor(connection: Connection, programId?: PublicKey) {
    this.connection = connection;
    this.client = new GasCreditClient({ connection, programId });
  }

  // ============================================
  // Balance Operations
  // ============================================

  /**
   * Get detailed gas credits balance for a user
   */
  async getBalance(walletAddress: string | PublicKey): Promise<GasCreditsBalance | null> {
    try {
      const owner =
        typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

      const gasCredits = await this.client.getGasCredits(owner);

      if (!gasCredits) {
        return null;
      }

      const usagePercentage = await this.client.getUsagePercentage(owner);
      const isExpired = await this.client.isExpired(owner);

      return {
        balance: gasCredits.balanceUsdc,
        balanceFormatted: this.client.formatUsdc(gasCredits.balanceUsdc),
        totalCredits: gasCredits.totalCredits,
        creditsUsed: gasCredits.creditsUsed,
        usagePercentage,
        lastTopUpAt:
          gasCredits.lastTopUpAt > 0
            ? new Date(Number(gasCredits.lastTopUpAt) * 1000)
            : null,
        expiresAt:
          gasCredits.expiresAt > 0 ? new Date(Number(gasCredits.expiresAt) * 1000) : null,
        isExpired,
      };
    } catch (error) {
      console.error('Error getting gas credits balance:', error);
      return null;
    }
  }

  /**
   * Check if user has gas credits account
   */
  async hasGasCreditsAccount(walletAddress: string | PublicKey): Promise<boolean> {
    try {
      const owner =
        typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

      const gasCredits = await this.client.getGasCredits(owner);
      return gasCredits !== null;
    } catch (error) {
      console.error('Error checking gas credits account:', error);
      return false;
    }
  }

  /**
   * Check if user has sufficient balance for an operation
   */
  async hasSufficientCredits(
    walletAddress: string | PublicKey,
    operationType: OperationType
  ): Promise<boolean> {
    try {
      const owner =
        typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

      const cost = this.client.estimateOperationCost(
        operationType as 'register_file' | 'update_file' | 'delete_file' | 'create_delegation'
      );

      return await this.client.hasSufficientBalance(owner, cost);
    } catch (error) {
      console.error('Error checking sufficient credits:', error);
      return false;
    }
  }

  // ============================================
  // Cost Estimation
  // ============================================

  /**
   * Estimate cost for a specific operation
   */
  async estimateOperationCost(
    walletAddress: string | PublicKey,
    operationType: OperationType
  ): Promise<OperationCostEstimate> {
    const owner =
      typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

    const cost = this.client.estimateOperationCost(
      operationType as 'register_file' | 'update_file' | 'delete_file' | 'create_delegation'
    );

    const hasSufficientBalance = await this.client.hasSufficientBalance(owner, cost);

    return {
      operationType,
      cost,
      costFormatted: this.client.formatUsdc(cost),
      hasSufficientBalance,
    };
  }

  /**
   * Estimate costs for multiple operations
   */
  async estimateBulkOperations(
    walletAddress: string | PublicKey,
    operations: OperationType[]
  ): Promise<{
    operations: OperationCostEstimate[];
    totalCost: bigint;
    totalCostFormatted: string;
    hasSufficientBalance: boolean;
  }> {
    const owner =
      typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

    const estimates = await Promise.all(
      operations.map((op) => this.estimateOperationCost(owner, op))
    );

    const totalCost = estimates.reduce((sum, est) => sum + est.cost, BigInt(0));
    const hasSufficientBalance = await this.client.hasSufficientBalance(owner, totalCost);

    return {
      operations: estimates,
      totalCost,
      totalCostFormatted: this.client.formatUsdc(totalCost),
      hasSufficientBalance,
    };
  }

  // ============================================
  // Transaction Building
  // ============================================

  /**
   * Initialize gas credits account with initial balance
   */
  async initializeGasCredits(
    walletAddress: string | PublicKey,
    initialBalanceUsdc: number
  ): Promise<Transaction> {
    const owner =
      typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

    const initialBalance = this.client.usdcToLamports(initialBalanceUsdc);
    return await this.client.createInitializeGasCreditsTransaction(owner, initialBalance);
  }

  /**
   * Add credits to gas credits account
   */
  async addCredits(
    walletAddress: string | PublicKey,
    amountUsdc: number
  ): Promise<Transaction> {
    const owner =
      typeof walletAddress === 'string' ? new PublicKey(walletAddress) : walletAddress;

    const amount = this.client.usdcToLamports(amountUsdc);
    return await this.client.createAddCreditsTransaction(owner, amount);
  }

  /**
   * Deduct credits for an operation
   */
  async deductCredits(
    userAddress: string | PublicKey,
    authorityAddress: string | PublicKey,
    operationType: OperationType
  ): Promise<Transaction> {
    const user =
      typeof userAddress === 'string' ? new PublicKey(userAddress) : userAddress;
    const authority =
      typeof authorityAddress === 'string' ? new PublicKey(authorityAddress) : authorityAddress;

    const cost = this.client.estimateOperationCost(
      operationType as 'register_file' | 'update_file' | 'delete_file' | 'create_delegation'
    );

    return await this.client.createDeductCreditsTransaction(
      user,
      authority,
      cost,
      operationType
    );
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Format USDC amount for display
   */
  formatUsdc(lamports: bigint): string {
    return `${this.client.formatUsdc(lamports)} USDC`;
  }

  /**
   * Convert USDC to lamports
   */
  usdcToLamports(usdc: number): bigint {
    return this.client.usdcToLamports(usdc);
  }

  /**
   * Get recommended top-up amounts based on usage
   */
  getRecommendedTopUpAmounts(currentBalance?: bigint): number[] {
    if (!currentBalance || currentBalance < BigInt(10_000_000)) {
      // Low balance: suggest larger top-ups
      return [50, 100, 250];
    } else if (currentBalance < BigInt(50_000_000)) {
      // Medium balance
      return [25, 50, 100];
    } else {
      // High balance: suggest smaller top-ups
      return [10, 25, 50];
    }
  }

  /**
   * Calculate days until credits expire
   */
  getDaysUntilExpiration(expiresAt: Date | null): number | null {
    if (!expiresAt) return null;

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if credits are low (< 20% remaining)
   */
  isBalanceLow(balance: GasCreditsBalance): boolean {
    return balance.usagePercentage > 80;
  }

  /**
   * Check if credits are critical (< 10 operations remaining)
   */
  isBalanceCritical(balance: GasCreditsBalance): boolean {
    const averageOpCost = BigInt(4000); // Average operation cost
    const remainingOps = balance.balance / averageOpCost;
    return remainingOps < BigInt(10);
  }

  /**
   * Get operation name for display
   */
  getOperationDisplayName(operationType: OperationType): string {
    const names: Record<OperationType, string> = {
      register_file: 'Upload File',
      update_file: 'Update File',
      delete_file: 'Delete File',
      create_delegation: 'Share File',
      revoke_delegation: 'Revoke Share',
      archive_file: 'Archive File',
    };

    return names[operationType] || operationType;
  }
}

// Export singleton instance for convenience
let gasCreditServiceInstance: GasCreditService | null = null;

export function getGasCreditService(
  connection: Connection,
  programId?: PublicKey
): GasCreditService {
  if (!gasCreditServiceInstance) {
    gasCreditServiceInstance = new GasCreditService(connection, programId);
  }
  return gasCreditServiceInstance;
}

export default GasCreditService;
