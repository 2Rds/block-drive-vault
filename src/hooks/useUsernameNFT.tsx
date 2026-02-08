import { useState, useCallback, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
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

  const checkAvailability = useCallback(
    async (usernameToCheck: string): Promise<{ available: boolean; error?: string }> => {
      const validation = validateUsername(usernameToCheck);
      if (!validation.valid) {
        return { available: false, error: validation.error };
      }
      return checkUsernameAvailability(usernameToCheck);
    },
    []
  );

  const mintUsername = useCallback(
    async (
      usernameToMint: string,
      orgContext?: MintOrganizationContext
    ): Promise<{ success: boolean; error?: string }> => {
      if (!userId || !user) {
        return { success: false, error: 'User not authenticated' };
      }

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

        const result = await mintUsernameNFT({
          clerkUserId: userId,
          username: usernameToMint,
          recipientEmail: user.primaryEmailAddress?.emailAddress,
          recipientWalletAddress: walletAddress || undefined,
          token,
          organizationId: orgContext?.organizationId,
          organizationSubdomain: orgContext?.organizationSubdomain,
        });

        if (!result.success) {
          setError(result.error || 'Minting failed');
          return { success: false, error: result.error };
        }

        setHasUsernameNFT(true);
        setUsername(result.username || null);
        setFullDomain(result.fullDomain || null);
        setMintStatus(result.status || 'pending');
        return { success: true };
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
