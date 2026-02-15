/**
 * NFT Membership Hook
 *
 * Provides read-only NFT membership verification and display utilities.
 * All minting/purchasing is handled server-side via Crossmint edge functions.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useCrossmintWallet } from './useCrossmintWallet';
import {
  SubscriptionTier,
  MembershipVerification,
  TIER_CONFIGS,
} from '@/types/nftMembership';
import { nftMembershipService } from '@/services/nftMembershipService';

interface UseNFTMembershipReturn {
  // State
  membership: MembershipVerification | null;
  isLoading: boolean;
  isVerifying: boolean;
  walletAddress: string | null;
  isWalletReady: boolean;

  // Actions
  verifyMembership: () => Promise<MembershipVerification | null>;

  // Utilities
  getTierConfig: (tier: SubscriptionTier) => typeof TIER_CONFIGS[SubscriptionTier];
  formatStorageSize: (bytes: bigint) => string;
  getDisplayInfo: (tier: SubscriptionTier) => { name: string; symbol: string; color: string; icon: string };
}

export function useNFTMembership(): UseNFTMembershipReturn {
  const { user } = useAuth();
  const crossmintWallet = useCrossmintWallet();

  const [membership, setMembership] = useState<MembershipVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  // Verify membership using Crossmint wallet address
  const verifyMembership = useCallback(async (): Promise<MembershipVerification | null> => {
    if (!user) {
      setMembership(null);
      setIsLoading(false);
      return null;
    }

    // If wallet is still initializing, provide MVP fallback
    const isWalletReady = crossmintWallet.isInitialized && !!crossmintWallet.walletAddress;
    if (!isWalletReady) {
      // Provide pro tier access while wallet initializes
      const mvpMembership: MembershipVerification = {
        isValid: true,
        tier: 'pro',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        daysRemaining: 30,
        storageRemaining: BigInt(100 * 1024 * 1024 * 1024),
        bandwidthRemaining: BigInt(100 * 1024 * 1024 * 1024),
        features: TIER_CONFIGS['pro'].features,
        nftMint: null,
      };

      setMembership(mvpMembership);
      setIsLoading(false);
      return mvpMembership;
    }

    setIsVerifying(true);

    try {
      const verification = await nftMembershipService.verifyMembership(crossmintWallet.walletAddress!);
      setMembership(verification);
      return verification;
    } catch (error) {
      console.error('[useNFTMembership] Verification failed:', error);
      setMembership(null);
      return null;
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  }, [user, crossmintWallet.isInitialized, crossmintWallet.walletAddress]);

  // Auto-verify when user or wallet changes
  useEffect(() => {
    if (user) {
      verifyMembership();
    } else {
      setMembership(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, crossmintWallet.isInitialized, crossmintWallet.walletAddress]);

  // Get tier configuration
  const getTierConfig = useCallback((tier: SubscriptionTier) => {
    return TIER_CONFIGS[tier];
  }, []);

  // Format storage size
  const formatStorageSize = useCallback((bytes: bigint): string => {
    const gb = Number(bytes) / (1024 * 1024 * 1024);
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = Number(bytes) / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }, []);

  // Get display info
  const getDisplayInfo = useCallback((tier: SubscriptionTier) => {
    const tierDisplayMap: Record<SubscriptionTier, { name: string; symbol: string; color: string; icon: string }> = {
      trial: { name: 'BlockDrive Trial', symbol: 'BDT', color: '#10b981', icon: '🛡️' },
      pro: { name: 'BlockDrive Pro', symbol: 'BDP', color: '#3b82f6', icon: '⭐' },
      scale: { name: 'BlockDrive Scale', symbol: 'BDS', color: '#8b5cf6', icon: '👑' },
      enterprise: { name: 'BlockDrive Enterprise', symbol: 'BDE', color: '#f59e0b', icon: '⚡' },
    };
    return tierDisplayMap[tier];
  }, []);

  return {
    membership,
    isLoading,
    isVerifying,
    walletAddress: crossmintWallet.walletAddress,
    isWalletReady: crossmintWallet.isInitialized && !!crossmintWallet.walletAddress,
    verifyMembership,
    getTierConfig,
    formatStorageSize,
    getDisplayInfo,
  };
}
