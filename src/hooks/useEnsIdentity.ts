/**
 * ENS Identity Hook
 *
 * Manages ENS subdomain registration via Namestone API.
 * Registers `username.blockdrive.eth` during onboarding.
 */

import { useState, useCallback, useEffect } from 'react';
import { useUserWallets } from '@dynamic-labs/sdk-react-core';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import { dynamicConfig } from '@/config/dynamic';

interface EnsIdentityState {
  ensName: string | null;
  isRegistering: boolean;
  isLoading: boolean;
  error: string | null;
  registerEns: (username: string) => Promise<{ success: boolean; name?: string; error?: string }>;
}

export function useEnsIdentity(): EnsIdentityState {
  const { supabase, userId } = useDynamicAuth();
  const userWallets = useUserWallets();
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evmWallet = userWallets.find((w) => w.chain === 'EVM');

  // Check if user already has an ENS subdomain
  useEffect(() => {
    if (!userId || !supabase) return;

    const checkExisting = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('ens_name')
          .eq('user_id', userId)
          .single();

        if (data?.ens_name) {
          setEnsName(data.ens_name);
        }
      } catch (err) {
        // No profile or no ens_name column yet — non-fatal
        console.warn('[useEnsIdentity] Failed to check existing ENS name:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkExisting();
  }, [userId, supabase]);

  const registerEns = useCallback(
    async (username: string): Promise<{ success: boolean; name?: string; error?: string }> => {
      if (!evmWallet?.address) {
        return { success: false, error: 'No EVM wallet available for ENS registration' };
      }

      if (!username) {
        return { success: false, error: 'Username is required' };
      }

      setIsRegistering(true);
      setError(null);

      try {
        const fullEnsName = `${username}.${dynamicConfig.ensParentDomain}`;

        // Call Edge Function for server-side Namestone API registration
        const { data, error: fnError } = await supabase.functions.invoke(
          'register-ens-subdomain',
          {
            body: {
              username,
              evmAddress: evmWallet.address,
            },
          },
        );

        if (fnError) {
          const msg = fnError.message || 'ENS registration failed';
          setError(msg);
          return { success: false, error: msg };
        }

        setEnsName(fullEnsName);
        return { success: true, name: fullEnsName };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ENS registration failed';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsRegistering(false);
      }
    },
    [evmWallet?.address, supabase],
  );

  return { ensName, isRegistering, isLoading, error, registerEns };
}
