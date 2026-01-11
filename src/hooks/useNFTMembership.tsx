/**
 * NFT Membership Hook (MVP Version)
 * 
 * Provides simulated membership data for MVP demo mode.
 * All users get "pro" tier access in MVP mode.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  SubscriptionTier,
  MembershipVerification,
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
  const { user, walletData } = useAuth();
  
  const [membership, setMembership] = useState<MembershipVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Create MVP membership when user is authenticated
  const verifyMembership = useCallback(async (): Promise<MembershipVerification | null> => {
    if (!user) {
      setMembership(null);
      setIsLoading(false);
      return null;
    }

    setIsVerifying(true);
    
    try {
      // In MVP mode, give all users "pro" tier access
      const mvpMembership: MembershipVerification = {
        isValid: true,
        tier: 'pro',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
        daysRemaining: 30,
        storageRemaining: BigInt(100 * 1024 * 1024 * 1024), // 100 GB
        bandwidthRemaining: BigInt(100 * 1024 * 1024 * 1024), // 100 GB
        gasCreditsRemaining: BigInt(50_000_000), // $50 in credits
        features: TIER_CONFIGS['pro'].features,
        nftMint: null, // No actual NFT in MVP mode
      };
      
      setMembership(mvpMembership);
      return mvpMembership;
    } catch (error) {
      console.error('[useNFTMembership] Verification failed:', error);
      setMembership(null);
      return null;
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  }, [user]);

  // Auto-verify when user changes
  useEffect(() => {
    if (user) {
      verifyMembership();
    } else {
      setMembership(null);
      setIsLoading(false);
    }
  }, [user, verifyMembership]);

  // Purchase membership - MVP stub
  const purchaseMembership = useCallback(async (
    tier: SubscriptionTier,
    billingPeriod: 'monthly' | 'quarterly' | 'annual'
  ): Promise<MembershipPurchaseResult> => {
    setIsPurchasing(true);
    
    try {
      // Simulate purchase in MVP mode
      toast.success('Membership activated!', {
        description: `Your ${TIER_CONFIGS[tier].name} membership is now active. (Demo mode)`
      });
      
      await verifyMembership();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Purchase simulation failed' };
    } finally {
      setIsPurchasing(false);
    }
  }, [verifyMembership]);

  // Renew membership - MVP stub
  const renewMembership = useCallback(async (
    billingPeriod: 'monthly' | 'quarterly' | 'annual'
  ): Promise<MembershipPurchaseResult> => {
    setIsPurchasing(true);
    
    try {
      toast.success('Membership renewed!', {
        description: 'Your subscription has been extended. (Demo mode)'
      });
      
      await verifyMembership();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Renewal simulation failed' };
    } finally {
      setIsPurchasing(false);
    }
  }, [verifyMembership]);

  // Upgrade membership - MVP stub
  const upgradeMembership = useCallback(async (
    newTier: SubscriptionTier
  ): Promise<MembershipPurchaseResult> => {
    setIsPurchasing(true);
    
    try {
      toast.success('Membership upgraded!', {
        description: `Welcome to ${TIER_CONFIGS[newTier].name}! (Demo mode)`
      });
      
      await verifyMembership();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Upgrade simulation failed' };
    } finally {
      setIsPurchasing(false);
    }
  }, [verifyMembership]);

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
    const tierDisplayMap = {
      basic: { name: 'BlockDrive Basic', symbol: 'BDB', color: '#64748b', icon: '🛡️' },
      pro: { name: 'BlockDrive Pro', symbol: 'BDP', color: '#3b82f6', icon: '⭐' },
      premium: { name: 'BlockDrive Premium', symbol: 'BDPM', color: '#8b5cf6', icon: '👑' },
      enterprise: { name: 'BlockDrive Enterprise', symbol: 'BDE', color: '#f59e0b', icon: '⚡' },
    };
    return tierDisplayMap[tier];
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
