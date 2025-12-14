/**
 * NFT Membership Service
 * 
 * Manages BlockDrive's NFT-based subscription system.
 * Subscriptions are SPL tokens on Solana that users truly own.
 * 
 * Features:
 * - Mint membership NFTs on subscription purchase
 * - Verify membership validity from wallet
 * - Manage gas credits allocation
 * - Handle renewals and upgrades
 */

import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import {
  SubscriptionTier,
  MembershipMetadata,
  MembershipNFT,
  MembershipVerification,
  MembershipPurchaseRequest,
  MembershipPurchaseResult,
  TIER_CONFIGS,
  gbToBytes,
  isMembershipExpired,
  getDaysRemaining,
  GasCreditsAccount,
} from '@/types/nftMembership';

// PDA seeds for membership accounts
const MEMBERSHIP_SEED = 'blockdrive_membership';
const GAS_CREDITS_SEED = 'blockdrive_gas_credits';

// BlockDrive program ID (placeholder - would be actual deployed program)
const BLOCKDRIVE_PROGRAM_ID = new PublicKey('BLKDr1vE111111111111111111111111111111111111');

// Connection to Solana
const getConnection = () => new Connection(clusterApiUrl('devnet'), 'confirmed');

class NFTMembershipService {
  /**
   * Derive the membership PDA for a wallet
   */
  async deriveMembershipPDA(walletAddress: string): Promise<[PublicKey, number]> {
    const walletPubkey = new PublicKey(walletAddress);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(MEMBERSHIP_SEED),
        walletPubkey.toBuffer(),
      ],
      BLOCKDRIVE_PROGRAM_ID
    );
  }

  /**
   * Derive the gas credits PDA for a wallet
   */
  async deriveGasCreditsPDA(walletAddress: string): Promise<[PublicKey, number]> {
    const walletPubkey = new PublicKey(walletAddress);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(GAS_CREDITS_SEED),
        walletPubkey.toBuffer(),
      ],
      BLOCKDRIVE_PROGRAM_ID
    );
  }

  /**
   * Verify membership validity for a wallet
   * Checks if the wallet owns a valid BlockDrive membership NFT
   */
  async verifyMembership(walletAddress: string): Promise<MembershipVerification> {
    try {
      console.log('[NFTMembership] Verifying membership for:', walletAddress);

      // In production, this would query the Solana blockchain for the membership PDA
      // For now, we'll simulate by checking local storage or returning a demo membership
      const cachedMembership = this.getCachedMembership(walletAddress);
      
      if (cachedMembership) {
        const expired = isMembershipExpired(cachedMembership.metadata.validUntil);
        
        if (expired) {
          return {
            isValid: false,
            tier: cachedMembership.metadata.tier,
            expiresAt: cachedMembership.metadata.validUntil,
            daysRemaining: 0,
            storageRemaining: BigInt(0),
            bandwidthRemaining: BigInt(0),
            gasCreditsRemaining: BigInt(0),
            features: null,
            nftMint: cachedMembership.mint,
            error: 'Membership has expired',
          };
        }

        const tierConfig = TIER_CONFIGS[cachedMembership.metadata.tier];
        
        return {
          isValid: true,
          tier: cachedMembership.metadata.tier,
          expiresAt: cachedMembership.metadata.validUntil,
          daysRemaining: getDaysRemaining(cachedMembership.metadata.validUntil),
          storageRemaining: cachedMembership.metadata.storageQuota - cachedMembership.metadata.storageUsed,
          bandwidthRemaining: cachedMembership.metadata.bandwidthQuota - cachedMembership.metadata.bandwidthUsed,
          gasCreditsRemaining: cachedMembership.gasCredits.balanceUsdc,
          features: tierConfig.features,
          nftMint: cachedMembership.mint,
        };
      }

      // No membership found - return basic tier (free)
      return {
        isValid: true,
        tier: 'basic',
        expiresAt: null,
        daysRemaining: -1, // Unlimited for free tier
        storageRemaining: gbToBytes(TIER_CONFIGS.basic.storageGB),
        bandwidthRemaining: gbToBytes(TIER_CONFIGS.basic.bandwidthGB),
        gasCreditsRemaining: BigInt(0),
        features: TIER_CONFIGS.basic.features,
        nftMint: null,
      };

    } catch (error) {
      console.error('[NFTMembership] Verification failed:', error);
      return {
        isValid: false,
        tier: null,
        expiresAt: null,
        daysRemaining: 0,
        storageRemaining: BigInt(0),
        bandwidthRemaining: BigInt(0),
        gasCreditsRemaining: BigInt(0),
        features: null,
        nftMint: null,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Create a new membership NFT (called after payment confirmation)
   * In production, this would be handled by a backend service
   */
  async createMembership(
    request: MembershipPurchaseRequest,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<MembershipPurchaseResult> {
    try {
      console.log('[NFTMembership] Creating membership:', request);

      const tierConfig = TIER_CONFIGS[request.tier];
      
      // Calculate expiration based on billing period
      const now = Date.now();
      let validUntil: number;
      let price: number;
      
      switch (request.billingPeriod) {
        case 'quarterly':
          validUntil = now + (90 * 24 * 60 * 60 * 1000);
          price = tierConfig.quarterlyPrice;
          break;
        case 'annual':
          validUntil = now + (365 * 24 * 60 * 60 * 1000);
          price = tierConfig.annualPrice;
          break;
        default:
          validUntil = now + (30 * 24 * 60 * 60 * 1000);
          price = tierConfig.monthlyPrice;
      }

      // Calculate gas credits allocation (20% of payment)
      const gasCreditsUsd = price * 0.20;
      const gasCreditsUsdc = BigInt(Math.floor(gasCreditsUsd * 1_000_000)); // 6 decimals

      // Create membership metadata
      const metadata: MembershipMetadata = {
        tier: request.tier,
        validUntil,
        isActive: true,
        storageQuota: gbToBytes(tierConfig.storageGB),
        storageUsed: BigInt(0),
        bandwidthQuota: gbToBytes(tierConfig.bandwidthGB),
        bandwidthUsed: BigInt(0),
        features: tierConfig.features,
        autoRenew: request.autoRenew,
        renewalPrice: price * 100, // In cents
        createdAt: now,
        lastRenewedAt: now,
      };

      // Create gas credits account
      const gasCredits: GasCreditsAccount = {
        owner: request.walletAddress,
        balanceUsdc: gasCreditsUsdc,
        balanceSol: BigInt(0),
        totalCredits: gasCreditsUsdc,
        creditsUsed: BigInt(0),
        lastTopUpAt: now,
        expiresAt: validUntil,
      };

      // Generate a mock mint address (in production, this would be the actual SPL token mint)
      const mockMint = this.generateMockMintAddress(request.walletAddress, request.tier);

      // Create membership NFT structure
      const membershipNFT: MembershipNFT = {
        bump: 255,
        mint: mockMint,
        owner: request.walletAddress,
        metadata,
        gasCredits,
        delegations: [],
      };

      // Cache the membership locally (in production, this would be on-chain)
      this.cacheMembership(request.walletAddress, membershipNFT);

      console.log('[NFTMembership] Membership created successfully');
      console.log('[NFTMembership] NFT Mint:', mockMint);
      console.log('[NFTMembership] Gas Credits:', gasCreditsUsdc.toString(), 'USDC');

      return {
        success: true,
        transactionSignature: `mock_tx_${Date.now()}`,
        nftMint: mockMint,
        gasCreditsAdded: gasCreditsUsdc,
        expiresAt: validUntil,
      };

    } catch (error) {
      console.error('[NFTMembership] Creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create membership',
      };
    }
  }

  /**
   * Renew an existing membership
   */
  async renewMembership(
    walletAddress: string,
    billingPeriod: 'monthly' | 'quarterly' | 'annual',
    signTransaction: (tx: any) => Promise<any>
  ): Promise<MembershipPurchaseResult> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    if (!cachedMembership) {
      return {
        success: false,
        error: 'No existing membership found',
      };
    }

    // Create renewal request
    const request: MembershipPurchaseRequest = {
      tier: cachedMembership.metadata.tier,
      billingPeriod,
      paymentMethod: 'crypto',
      walletAddress,
      autoRenew: cachedMembership.metadata.autoRenew,
    };

    return this.createMembership(request, signTransaction);
  }

  /**
   * Upgrade membership to a higher tier
   */
  async upgradeMembership(
    walletAddress: string,
    newTier: SubscriptionTier,
    signTransaction: (tx: any) => Promise<any>
  ): Promise<MembershipPurchaseResult> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    // Create upgrade request
    const request: MembershipPurchaseRequest = {
      tier: newTier,
      billingPeriod: 'monthly',
      paymentMethod: 'crypto',
      walletAddress,
      autoRenew: cachedMembership?.metadata.autoRenew ?? false,
    };

    return this.createMembership(request, signTransaction);
  }

  /**
   * Deduct gas credits for an operation
   */
  async deductGasCredits(
    walletAddress: string,
    amountLamports: bigint
  ): Promise<boolean> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    if (!cachedMembership) {
      console.warn('[NFTMembership] No membership for gas deduction');
      return false;
    }

    // Convert lamports to approximate USDC (simplified)
    // In production, this would use real-time SOL/USDC price
    const solPrice = 150; // USD
    const amountSol = Number(amountLamports) / 1e9;
    const amountUsdc = BigInt(Math.ceil(amountSol * solPrice * 1_000_000));

    if (cachedMembership.gasCredits.balanceUsdc < amountUsdc) {
      console.warn('[NFTMembership] Insufficient gas credits');
      return false;
    }

    // Deduct credits
    cachedMembership.gasCredits.balanceUsdc -= amountUsdc;
    cachedMembership.gasCredits.creditsUsed += amountUsdc;
    
    this.cacheMembership(walletAddress, cachedMembership);
    
    console.log('[NFTMembership] Deducted', amountUsdc.toString(), 'USDC in gas credits');
    return true;
  }

  /**
   * Update storage usage
   */
  async updateStorageUsage(
    walletAddress: string,
    bytesUsed: bigint
  ): Promise<boolean> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    if (!cachedMembership) {
      return false;
    }

    cachedMembership.metadata.storageUsed = bytesUsed;
    this.cacheMembership(walletAddress, cachedMembership);
    
    return true;
  }

  /**
   * Get membership NFT display info
   */
  getMembershipDisplayInfo(tier: SubscriptionTier): {
    name: string;
    symbol: string;
    color: string;
    icon: string;
  } {
    const config = TIER_CONFIGS[tier];
    
    const colors: Record<SubscriptionTier, string> = {
      basic: 'gray',
      pro: 'blue',
      premium: 'purple',
      enterprise: 'gold',
    };

    const icons: Record<SubscriptionTier, string> = {
      basic: '🔵',
      pro: '💎',
      premium: '👑',
      enterprise: '🏆',
    };

    return {
      name: `BlockDrive ${config.name} Membership`,
      symbol: config.nftSymbol,
      color: colors[tier],
      icon: icons[tier],
    };
  }

  // ============= Private Helper Methods =============

  private generateMockMintAddress(walletAddress: string, tier: SubscriptionTier): string {
    // Generate a deterministic mock mint address
    const hash = this.simpleHash(walletAddress + tier + Date.now());
    return `BLKD${tier.toUpperCase()}${hash.slice(0, 32)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private getCachedMembership(walletAddress: string): MembershipNFT | null {
    try {
      const key = `blockdrive_membership_${walletAddress}`;
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      
      // Convert bigint strings back to bigints
      parsed.metadata.storageQuota = BigInt(parsed.metadata.storageQuota);
      parsed.metadata.storageUsed = BigInt(parsed.metadata.storageUsed);
      parsed.metadata.bandwidthQuota = BigInt(parsed.metadata.bandwidthQuota);
      parsed.metadata.bandwidthUsed = BigInt(parsed.metadata.bandwidthUsed);
      parsed.gasCredits.balanceUsdc = BigInt(parsed.gasCredits.balanceUsdc);
      parsed.gasCredits.balanceSol = BigInt(parsed.gasCredits.balanceSol);
      parsed.gasCredits.totalCredits = BigInt(parsed.gasCredits.totalCredits);
      parsed.gasCredits.creditsUsed = BigInt(parsed.gasCredits.creditsUsed);
      
      return parsed;
    } catch {
      return null;
    }
  }

  private cacheMembership(walletAddress: string, membership: MembershipNFT): void {
    try {
      const key = `blockdrive_membership_${walletAddress}`;
      
      // Convert bigints to strings for JSON serialization
      const serializable = {
        ...membership,
        metadata: {
          ...membership.metadata,
          storageQuota: membership.metadata.storageQuota.toString(),
          storageUsed: membership.metadata.storageUsed.toString(),
          bandwidthQuota: membership.metadata.bandwidthQuota.toString(),
          bandwidthUsed: membership.metadata.bandwidthUsed.toString(),
        },
        gasCredits: {
          ...membership.gasCredits,
          balanceUsdc: membership.gasCredits.balanceUsdc.toString(),
          balanceSol: membership.gasCredits.balanceSol.toString(),
          totalCredits: membership.gasCredits.totalCredits.toString(),
          creditsUsed: membership.gasCredits.creditsUsed.toString(),
        },
      };
      
      localStorage.setItem(key, JSON.stringify(serializable));
    } catch (error) {
      console.error('[NFTMembership] Failed to cache membership:', error);
    }
  }
}

// Export singleton
export const nftMembershipService = new NFTMembershipService();
