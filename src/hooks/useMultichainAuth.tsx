import { useState, useCallback } from 'react';
import { useDynamicContext, useUserWallets } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { MultichainChallenge, MultichainVerificationRequest, MultichainAuthResponse, ConnectedWallets } from '@/types/multichainAuth';

export const useMultichainAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [challenge, setChallenge] = useState<MultichainChallenge | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const { primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets();

  // Get connected wallets organized by chain
  const getConnectedWallets = useCallback((): ConnectedWallets => {
    const wallets: ConnectedWallets = {};
    
    userWallets.forEach(wallet => {
      if (wallet.chain === 'SOL') {
        wallets.solana = {
          address: wallet.address,
          chain: wallet.chain,
          connector: wallet.connector
        };
      } else if (wallet.chain?.startsWith('eip155')) {
        // Extract chain ID from eip155:8453 format
        const chainId = parseInt(wallet.chain.split(':')[1]);
        wallets.evm = {
          address: wallet.address,
          chain: wallet.chain,
          chainId,
          connector: wallet.connector
        };
      }
    });
    
    return wallets;
  }, [userWallets]);

  // Start multichain authentication process
  const startAuth = useCallback(async (label: string) => {
    const wallets = getConnectedWallets();
    
    if (!wallets.solana || !wallets.evm) {
      toast.error('Both Solana and EVM wallets must be connected for multichain authentication');
      return false;
    }

    setIsAuthenticating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('mca-start', {
        body: {
          label,
          sol_pubkey: wallets.solana.address,
          evm_addr: wallets.evm.address
        }
      });

      if (error) {
        toast.error('Failed to start authentication: ' + error.message);
        return false;
      }

      setChallenge(data.challenge);
      return true;
    } catch (error: any) {
      toast.error('Failed to start authentication: ' + error.message);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [getConnectedWallets]);

  // Sign challenge with both wallets
  const signChallenge = useCallback(async () => {
    if (!challenge) {
      toast.error('No challenge available to sign');
      return false;
    }

    const wallets = getConnectedWallets();
    if (!wallets.solana || !wallets.evm) {
      toast.error('Both wallets must be connected');
      return false;
    }

    setIsAuthenticating(true);

    try {
      // Create challenge message
      const challengeMessage = JSON.stringify(challenge);
      const challengeBytes = new TextEncoder().encode(challengeMessage);

      // Sign with Solana wallet
      const solanaSignature = await wallets.solana.connector.signMessage(challengeMessage);
      const solanaSignatureHex = Array.from(new Uint8Array(solanaSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Sign with EVM wallet  
      const evmSignature = await wallets.evm.connector.signMessage(challengeMessage);

      // Verify signatures and ownership
      const verificationRequest: MultichainVerificationRequest = {
        label: challenge.label,
        sol_pubkey: challenge.sol_pubkey,
        evm_addr: challenge.evm_addr,
        sig_solana: solanaSignatureHex,
        sig_evm: evmSignature,
        challenge
      };

      const { data, error } = await supabase.functions.invoke('mca-verify', {
        body: verificationRequest
      });

      if (error) {
        toast.error('Authentication failed: ' + error.message);
        return false;
      }

      const response: MultichainAuthResponse = data;
      
      if (response.authenticated && response.jwt) {
        setAuthToken(response.jwt);
        toast.success(`Multichain authentication successful! Factors: ${response.factors?.join(', ')}`);
        return true;
      } else {
        toast.error('Authentication failed: ' + (response.error || 'Unknown error'));
        return false;
      }

    } catch (error: any) {
      console.error('Error during signing:', error);
      toast.error('Failed to sign challenge: ' + error.message);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [challenge, getConnectedWallets]);

  // Check if current JWT is valid
  const checkTokengate = useCallback(async (jwt?: string) => {
    const tokenToCheck = jwt || authToken;
    if (!tokenToCheck) {
      return { valid: false, error: 'No token available' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('mca-check', {
        body: { jwt: tokenToCheck }
      });

      if (error) {
        return { valid: false, error: error.message };
      }

      return data;
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }, [authToken]);

  return {
    isAuthenticating,
    challenge,
    authToken,
    connectedWallets: getConnectedWallets(),
    startAuth,
    signChallenge,
    checkTokengate,
    clearAuth: () => {
      setChallenge(null);
      setAuthToken(null);
    }
  };
};