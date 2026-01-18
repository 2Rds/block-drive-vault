/**
 * NFT Membership Hook
 * 
 * Provides NFT membership functionality using Alchemy embedded wallet.
 * Integrates with gas-sponsored transactions for seamless UX.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Transaction } from '@solana/web3.js';
import { useAuth } from './useAuth';
import { useAlchemySolanaWallet } from './useAlchemySolanaWallet';
import {
  SubscriptionTier,
  MembershipVerification,
  MembershipPurchaseResult,
  TIER_CONFIGS,
} from '@/types/nftMembership';
import { nftMembershipService, AlchemyTransactionSigner } from '@/services/nftMembershipService';
import { toast } from 'sonner';

interface UseNFTMembershipReturn {
  // State
  membership: MembershipVerification | null;
  isLoading: boolean;
  isVerifying: boolean;
  isPurchasing: boolean;
  walletAddress: string | null;
  isWalletReady: boolean;
  
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
  const { user } = useAuth();
  const alchemyWallet = useAlchemySolanaWallet();
  
  const [membership, setMembership] = useState<MembershipVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Create Alchemy signer interface for the membership service
  const alchemySigner = useMemo((): AlchemyTransactionSigner => ({
    signTransaction: async (transaction: Transaction) => {
      return alchemyWallet.signTransaction(transaction) as Promise<Transaction>;
    },
    signAndSendTransaction: alchemyWallet.signAndSendTransaction as (tx: Transaction) => Promise<string>,
    solanaAddress: alchemyWallet.solanaAddress,
  }), [alchemyWallet]);

  // Verify membership using Alchemy wallet address
  const verifyMembership = useCallback(async (): Promise<MembershipVerification | null> => {
    if (!user) {
      setMembership(null);
      setIsLoading(false);
      return null;
    }

    // If wallet is still initializing, provide MVP fallback
    if (!alchemyWallet.isReady || !alchemyWallet.solanaAddress) {
      console.log('[useNFTMembership] Wallet not ready, using MVP fallback');
      
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
      console.log('[useNFTMembership] Verifying with Alchemy wallet:', alchemyWallet.solanaAddress);
      
      // Use the membership service with the Alchemy wallet address
      const verification = await nftMembershipService.verifyMembership(alchemyWallet.solanaAddress);
      
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
  }, [user, alchemyWallet.isReady, alchemyWallet.solanaAddress]);

  // Auto-verify when user or wallet changes
  useEffect(() => {
    if (user) {
      verifyMembership();
    } else {
      setMembership(null);
      setIsLoading(false);
    }
  }, [user, alchemyWallet.isReady, verifyMembership]);

  // Purchase membership using Alchemy gas-sponsored transaction
  const purchaseMembership = useCallback(async (
    tier: SubscriptionTier,
    billingPeriod: 'monthly' | 'quarterly' | 'annual'
  ): Promise<MembershipPurchaseResult> => {
    if (!alchemyWallet.isReady || !alchemyWallet.solanaAddress) {
      toast.error('Wallet not ready', {
        description: 'Please wait for your wallet to initialize'
      });
      return { success: false, error: 'Wallet not initialized' };
    }

    setIsPurchasing(true);
    
    try {
      toast.loading('Processing membership purchase...', { id: 'membership-purchase' });
      
      const result = await nftMembershipService.createMembership(
        {
          tier,
          billingPeriod,
          paymentMethod: 'crypto',
          walletAddress: alchemyWallet.solanaAddress,
          autoRenew: false,
        },
        alchemySigner
      );

      if (result.success) {
        toast.success('Membership activated!', {
          id: 'membership-purchase',
          description: `Your ${TIER_CONFIGS[tier].name} membership is now active. Transaction: ${result.transactionSignature?.slice(0, 8)}...`
        });
        
        await verifyMembership();
      } else {
        toast.error('Purchase failed', {
          id: 'membership-purchase',
          description: result.error || 'Please try again'
        });
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Purchase failed';
      toast.error('Purchase failed', {
        id: 'membership-purchase',
        description: errorMsg
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsPurchasing(false);
    }
  }, [alchemyWallet.isReady, alchemyWallet.solanaAddress, alchemySigner, verifyMembership]);

  // Renew membership using Alchemy gas-sponsored transaction
  const renewMembership = useCallback(async (
    billingPeriod: 'monthly' | 'quarterly' | 'annual'
  ): Promise<MembershipPurchaseResult> => {
    if (!alchemyWallet.isReady || !alchemyWallet.solanaAddress) {
      toast.error('Wallet not ready');
      return { success: false, error: 'Wallet not initialized' };
    }

    setIsPurchasing(true);
    
    try {
      toast.loading('Processing renewal...', { id: 'membership-renewal' });
      
      const result = await nftMembershipService.renewMembership(
        alchemyWallet.solanaAddress,
        billingPeriod,
        alchemySigner
      );

      if (result.success) {
        toast.success('Membership renewed!', {
          id: 'membership-renewal',
          description: 'Your subscription has been extended.'
        });
        
        await verifyMembership();
      } else {
        toast.error('Renewal failed', {
          id: 'membership-renewal',
          description: result.error
        });
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Renewal failed';
      toast.error('Renewal failed', {
        id: 'membership-renewal',
        description: errorMsg
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsPurchasing(false);
    }
  }, [alchemyWallet.isReady, alchemyWallet.solanaAddress, alchemySigner, verifyMembership]);

  // Upgrade membership using Alchemy gas-sponsored transaction
  const upgradeMembership = useCallback(async (
    newTier: SubscriptionTier
  ): Promise<MembershipPurchaseResult> => {
    if (!alchemyWallet.isReady || !alchemyWallet.solanaAddress) {
      toast.error('Wallet not ready');
      return { success: false, error: 'Wallet not initialized' };
    }

    setIsPurchasing(true);
    
    try {
      toast.loading('Processing upgrade...', { id: 'membership-upgrade' });
      
      const result = await nftMembershipService.upgradeMembership(
        alchemyWallet.solanaAddress,
        newTier,
        alchemySigner
      );

      if (result.success) {
        toast.success('Membership upgraded!', {
          id: 'membership-upgrade',
          description: `Welcome to ${TIER_CONFIGS[newTier].name}!`
        });
        
        await verifyMembership();
      } else {
        toast.error('Upgrade failed', {
          id: 'membership-upgrade',
          description: result.error
        });
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upgrade failed';
      toast.error('Upgrade failed', {
        id: 'membership-upgrade',
        description: errorMsg
      });
      return { success: false, error: errorMsg };
    } finally {
      setIsPurchasing(false);
    }
  }, [alchemyWallet.isReady, alchemyWallet.solanaAddress, alchemySigner, verifyMembership]);

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
    walletAddress: alchemyWallet.solanaAddress,
    isWalletReady: alchemyWallet.isReady,
    verifyMembership,
    purchaseMembership,
    renewMembership,
    upgradeMembership,
    getTierConfig,
    formatStorageSize,
    getDisplayInfo,
  };
}
