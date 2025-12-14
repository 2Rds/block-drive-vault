/**
 * NFT Membership Hook
 * 
 * React hook for managing BlockDrive NFT-based subscriptions.
 * Provides membership verification, purchase, and status tracking.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSolanaWalletSigning } from './useSolanaWalletSigning';
import { nftMembershipService } from '@/services/nftMembershipService';
import {
  SubscriptionTier,
  MembershipVerification,
  MembershipPurchaseRequest,
  MembershipPurchaseResult,
  TIER_CONFIGS,
} from '@/types/nftMembership';
import { toast } from 'sonner';

interface UseNFTMembershipReturn {
  // State
  membership: MembershipVerification | null;
  isLoading: boolean;
  isVerifying: boolean;
  isPurchasing: boolean;
  
  // Actions
  verifyMembership: () => Promise<MembershipVerification | null>;
  purchaseMembership: (tier: SubscriptionTier, billingPeriod: 'monthly' | 'quarterly' | 'annual') => Promise<MembershipPurchaseResult>;
  renewMembership: (billingPeriod: 'monthly' | 'quarterly' | 'annual') => Promise<MembershipPurchaseResult>;
  upgradeMembership: (newTier: SubscriptionTier) => Promise<MembershipPurchaseResult>;
  
  // Utilities
  getTierConfig: (tier: SubscriptionTier) => typeof TIER_CONFIGS[SubscriptionTier];
  formatStorageSize: (bytes: bigint) => string;
  getDisplayInfo: (tier: SubscriptionTier) => { name: string; symbol: string; color: string; icon: string };
}

export function useNFTMembership(): UseNFTMembershipReturn {
  const { walletData } = useAuth();
  const { signTransaction } = useSolanaWalletSigning();
  
  const [membership, setMembership] = useState<MembershipVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Verify membership on wallet connect
  const verifyMembership = useCallback(async (): Promise<MembershipVerification | null> => {
    if (!walletData?.address) {
      setMembership(null);
      setIsLoading(false);
      return null;
    }

    setIsVerifying(true);
    try {
      const result = await nftMembershipService.verifyMembership(walletData.address);
      setMembership(result);
      return result;
    } catch (error) {
      console.error('[useNFTMembership] Verification failed:', error);
      setMembership(null);
      return null;
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  }, [walletData?.address]);

  // Auto-verify on wallet change
  useEffect(() => {
    if (walletData?.connected && walletData?.address) {
      verifyMembership();
    } else {
      setMembership(null);
      setIsLoading(false);
    }
  }, [walletData?.connected, walletData?.address, verifyMembership]);

  // Purchase new membership
  const purchaseMembership = useCallback(async (
    tier: SubscriptionTier,
    billingPeriod: 'monthly' | 'quarterly' | 'annual'
  ): Promise<MembershipPurchaseResult> => {
    if (!walletData?.address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPurchasing(true);
    try {
      const request: MembershipPurchaseRequest = {
        tier,
        billingPeriod,
        paymentMethod: 'crypto',
        walletAddress: walletData.address,
        autoRenew: true,
      };

      const result = await nftMembershipService.createMembership(request, signTransaction);

      if (result.success) {
        toast.success('Membership NFT minted successfully!', {
          description: `Your ${TIER_CONFIGS[tier].name} membership is now active.`
        });
        
        // Refresh membership status
        await verifyMembership();
      } else {
        toast.error('Failed to create membership', {
          description: result.error
        });
      }

      return result;
    } catch (error) {
      console.error('[useNFTMembership] Purchase failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Purchase failed';
      toast.error('Purchase failed', { description: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      setIsPurchasing(false);
    }
  }, [walletData?.address, signTransaction, verifyMembership]);

  // Renew existing membership
  const renewMembership = useCallback(async (
    billingPeriod: 'monthly' | 'quarterly' | 'annual'
  ): Promise<MembershipPurchaseResult> => {
    if (!walletData?.address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPurchasing(true);
    try {
      const result = await nftMembershipService.renewMembership(
        walletData.address,
        billingPeriod,
        signTransaction
      );

      if (result.success) {
        toast.success('Membership renewed!', {
          description: 'Your subscription has been extended.'
        });
        await verifyMembership();
      }

      return result;
    } catch (error) {
      console.error('[useNFTMembership] Renewal failed:', error);
      return { success: false, error: 'Renewal failed' };
    } finally {
      setIsPurchasing(false);
    }
  }, [walletData?.address, signTransaction, verifyMembership]);

  // Upgrade to higher tier
  const upgradeMembership = useCallback(async (
    newTier: SubscriptionTier
  ): Promise<MembershipPurchaseResult> => {
    if (!walletData?.address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPurchasing(true);
    try {
      const result = await nftMembershipService.upgradeMembership(
        walletData.address,
        newTier,
        signTransaction
      );

      if (result.success) {
        toast.success('Membership upgraded!', {
          description: `Welcome to ${TIER_CONFIGS[newTier].name}!`
        });
        await verifyMembership();
      }

      return result;
    } catch (error) {
      console.error('[useNFTMembership] Upgrade failed:', error);
      return { success: false, error: 'Upgrade failed' };
    } finally {
      setIsPurchasing(false);
    }
  }, [walletData?.address, signTransaction, verifyMembership]);

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
    return nftMembershipService.getMembershipDisplayInfo(tier);
  }, []);

  return {
    membership,
    isLoading,
    isVerifying,
    isPurchasing,
    verifyMembership,
    purchaseMembership,
    renewMembership,
    upgradeMembership,
    getTierConfig,
    formatStorageSize,
    getDisplayInfo,
  };
}
