/**
 * NFT Membership Service
 *
 * Read-only membership verification and display for BlockDrive's NFT-based
 * subscription system. All minting operations are handled server-side via
 * Crossmint API (edge functions).
 *
 * Features:
 * - Verify membership validity from wallet (on-chain Token-2022 check)
 * - Cache membership data locally
 * - Display tier info
 */

import {
  PublicKey,
  Connection,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  SubscriptionTier,
  MembershipNFT,
  MembershipVerification,
  TIER_CONFIGS,
  gbToBytes,
  isMembershipExpired,
  getDaysRemaining,
} from '@/types/nftMembership';
import { createSolanaConnection } from '@/config/crossmint';

// PDA seeds for membership accounts
const MEMBERSHIP_SEED = 'blockdrive_membership';

// BlockDrive program ID (placeholder - would be actual deployed program)
const BLOCKDRIVE_PROGRAM_ID = new PublicKey('BLKDr1vE111111111111111111111111111111111111');

// Tier display configuration
const TIER_COLORS: Record<SubscriptionTier, string> = {
  trial: 'emerald',
  pro: 'blue',
  scale: 'purple',
  enterprise: 'gold',
};

const TIER_ICONS: Record<SubscriptionTier, string> = {
  trial: '',
  pro: '',
  scale: '',
  enterprise: '',
};

// Get Crossmint-configured Solana connection (Devnet for MVP)
const getConnection = () => createSolanaConnection();

class NFTMembershipService {
  private connection: Connection;

  constructor() {
    this.connection = getConnection();
  }

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
   * Generate a deterministic mint keypair for a user's tier
   * Used for on-chain verification lookups
   */
  private async generateDeterministicMintKeypair(
    walletAddress: string,
    tier: SubscriptionTier
  ): Promise<Keypair> {
    const seed = `blockdrive-membership-mint-${walletAddress}-${tier}-v1`;
    const encoder = new TextEncoder();
    const seedBytes = encoder.encode(seed);

    const seedBuffer = new ArrayBuffer(seedBytes.length);
    const view = new Uint8Array(seedBuffer);
    view.set(seedBytes);

    const hashBuffer = await crypto.subtle.digest('SHA-256', seedBuffer);
    const hashBytes = new Uint8Array(hashBuffer);

    return Keypair.fromSeed(hashBytes);
  }

  /**
   * Verify membership validity for a wallet (using Crossmint embedded wallet address)
   * Checks if the wallet owns a valid BlockDrive membership NFT
   */
  async verifyMembership(walletAddress: string): Promise<MembershipVerification> {
    try {
      // Check cached membership first
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
          features: tierConfig.features,
          nftMint: cachedMembership.mint,
        };
      }

      // Try to verify on-chain Token-2022 ownership
      try {
        const walletPubkey = new PublicKey(walletAddress);

        // Check for each tier's token
        for (const tier of ['enterprise', 'scale', 'pro'] as SubscriptionTier[]) {
          const mintKeypair = await this.generateDeterministicMintKeypair(walletAddress, tier);
          const ata = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            walletPubkey,
            false,
            TOKEN_2022_PROGRAM_ID
          );

          try {
            const tokenAccount = await this.connection.getTokenAccountBalance(ata);
            if (tokenAccount.value.uiAmount && tokenAccount.value.uiAmount > 0) {
              const tierConfig = TIER_CONFIGS[tier];
              return {
                isValid: true,
                tier,
                expiresAt: null,
                daysRemaining: -1,
                storageRemaining: gbToBytes(tierConfig.storageGB),
                bandwidthRemaining: gbToBytes(tierConfig.bandwidthGB),
                features: tierConfig.features,
                nftMint: mintKeypair.publicKey.toBase58(),
              };
            }
          } catch {
            // Token account doesn't exist, continue checking
          }
        }
      } catch (onChainError) {
        console.warn('[NFTMembership] On-chain verification failed:', onChainError);
      }

      // No membership found - return trial tier (free)
      return {
        isValid: true,
        tier: 'trial',
        expiresAt: null,
        daysRemaining: -1,
        storageRemaining: gbToBytes(TIER_CONFIGS.trial.storageGB),
        bandwidthRemaining: gbToBytes(TIER_CONFIGS.trial.bandwidthGB),
        features: TIER_CONFIGS.trial.features,
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
        features: null,
        nftMint: null,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Update storage usage in local cache
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

    return {
      name: `BlockDrive ${config.name} Membership`,
      symbol: config.nftSymbol,
      color: TIER_COLORS[tier],
      icon: TIER_ICONS[tier],
    };
  }

  // ============= Private Helper Methods =============

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
      };

      localStorage.setItem(key, JSON.stringify(serializable));
    } catch (err) {
      console.warn('[NFTMembership] Failed to cache membership:', err);
    }
  }
}

// Export singleton instance
export const nftMembershipService = new NFTMembershipService();
