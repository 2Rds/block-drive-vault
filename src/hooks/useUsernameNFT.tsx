/**
 * Hook for managing username NFT minting
 *
 * Provides functionality to:
 * - Check username availability
 * - Mint username NFT
 * - Get current user's username NFT
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useUser } from '@clerk/clerk-react';
import {
  validateUsername,
  checkUsernameAvailability,
  mintUsernameNFT,
  getUsernameNFT,
} from '@/services/crossmint/usernameNFTService';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';

// Organization context for minting (optional)
export interface MintOrganizationContext {
  organizationId?: string;
  organizationSubdomain?: string;
}

interface UseUsernameNFTReturn {
  // State
  hasUsernameNFT: boolean;
  username: string | null;
  fullDomain: string | null;
  mintStatus: string | null;
  isLoading: boolean;
  isMinting: boolean;
  error: string | null;

  // Actions
  checkAvailability: (username: string) => Promise<{ available: boolean; error?: string }>;
  mintUsername: (username: string, orgContext?: MintOrganizationContext) => Promise<{ success: boolean; error?: string }>;
  refreshUsernameNFT: () => Promise<void>;
}

export function useUsernameNFT(): UseUsernameNFTReturn {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { walletAddress } = useCrossmintWallet();

  const [hasUsernameNFT, setHasUsernameNFT] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [fullDomain, setFullDomain] = useState<string | null>(null);
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's username NFT on mount
  const refreshUsernameNFT = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUsernameNFT(userId);

      if (result.error) {
        setError(result.error);
      } else {
        setHasUsernameNFT(result.hasNFT);
        setUsername(result.username || null);
        setFullDomain(result.fullDomain || null);
        setMintStatus(result.status || null);
      }
    } catch (err) {
      console.error('[useUsernameNFT] Error fetching:', err);
      setError('Failed to fetch username NFT');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load on mount and when userId changes
  useEffect(() => {
    refreshUsernameNFT();
  }, [refreshUsernameNFT]);

  // Check username availability
  const checkAvailability = useCallback(
    async (usernameToCheck: string): Promise<{ available: boolean; error?: string }> => {
      // First validate format
      const validation = validateUsername(usernameToCheck);
      if (!validation.valid) {
        return { available: false, error: validation.error };
      }

      // Then check against database
      const result = await checkUsernameAvailability(usernameToCheck);
      return result;
    },
    []
  );

  // Mint username NFT (supports organization context for org subdomains)
  const mintUsername = useCallback(
    async (
      usernameToMint: string,
      orgContext?: MintOrganizationContext
    ): Promise<{ success: boolean; error?: string }> => {
      if (!userId || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Validate format
      const validation = validateUsername(usernameToMint);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      setIsMinting(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Get user email
        const email = user.primaryEmailAddress?.emailAddress;

        // Log organization context if present
        if (orgContext?.organizationId) {
          console.log(`[useUsernameNFT] Minting with org context: ${orgContext.organizationSubdomain}`);
        }

        const result = await mintUsernameNFT({
          clerkUserId: userId,
          username: usernameToMint,
          recipientEmail: email,
          recipientWalletAddress: walletAddress || undefined,
          token,
          // Pass organization context
          organizationId: orgContext?.organizationId,
          organizationSubdomain: orgContext?.organizationSubdomain,
        });

        if (result.success) {
          // Update local state
          setHasUsernameNFT(true);
          setUsername(result.username || null);
          setFullDomain(result.fullDomain || null);
          setMintStatus(result.status || 'pending');

          return { success: true };
        } else {
          setError(result.error || 'Minting failed');
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to mint username NFT';
        console.error('[useUsernameNFT] Mint error:', err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsMinting(false);
      }
    },
    [userId, user, getToken, walletAddress]
  );

  return {
    hasUsernameNFT,
    username,
    fullDomain,
    mintStatus,
    isLoading,
    isMinting,
    error,
    checkAvailability,
    mintUsername,
    refreshUsernameNFT,
  };
}

export default useUsernameNFT;
