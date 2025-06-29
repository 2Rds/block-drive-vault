
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class AuthenticationService {
  static async connectWallet(incomingWalletData: any) {
    try {
      console.log('Connecting wallet with data:', incomingWalletData);

      const walletAddress = incomingWalletData.address || incomingWalletData.wallet_address;
      const signature = incomingWalletData.signature || `mock-signature-${Date.now()}`;
      const blockchainType = incomingWalletData.blockchain_type || 'ethereum';
      
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      console.log(`Attempting to authenticate ${blockchainType} wallet:`, walletAddress);
      
      // Use the secure wallet authentication endpoint
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message: 'Sign this message to authenticate with BlockDrive',
          timestamp: Date.now(),
          nonce: crypto.randomUUID(),
          blockchainType
        }
      });

      if (error) {
        console.error('Wallet authentication error:', error);
        throw new Error(`Failed to authenticate wallet: ${error.message}`);
      }

      if (data?.success && data?.authToken) {
        console.log('Wallet authentication successful, creating session...');
        
        // Create a comprehensive session using the auth token
        const sessionData = {
          user: {
            id: data.authToken,
            email: `${walletAddress}@blockdrive.wallet`,
            wallet_address: walletAddress,
            user_metadata: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType,
              username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
              full_name: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet User`
            }
          },
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (24 * 60 * 60 * 1000),
          token_type: 'bearer'
        };

        // Store session in localStorage for persistence
        localStorage.setItem('sb-supabase-auth-token', JSON.stringify(sessionData));
        
        if (data.isFirstTime) {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully! Welcome to BlockDrive!`);
        } else {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully! Welcome back!`);
        }
        
        // Immediate redirect after setting all state
        console.log('Redirecting to dashboard...');
        window.location.href = '/index';

        return { error: null, data: sessionData };
      } else {
        throw new Error('Wallet authentication failed');
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
      return { error: { message: error.message } };
    }
  }

  static async disconnectWallet() {
    try {
      console.log('Disconnecting wallet...');
      
      // Clear wallet session storage
      localStorage.removeItem('sb-supabase-auth-token');
      
      toast.success('Wallet disconnected');
      
      // Redirect to auth page
      window.location.href = '/auth';
      
      return { error: null };
    } catch (error: any) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
      return { error };
    }
  }

  static async signOut() {
    try {
      // Clear wallet session storage
      localStorage.removeItem('sb-supabase-auth-token');
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  static checkWalletSession() {
    const storedSession = localStorage.getItem('sb-supabase-auth-token');
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        console.log('Found stored wallet session:', sessionData.user?.id);
        
        // Check if session is still valid
        if (sessionData.expires_at > Date.now()) {
          return sessionData;
        } else {
          // Session expired, remove it
          localStorage.removeItem('sb-supabase-auth-token');
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
        localStorage.removeItem('sb-supabase-auth-token');
      }
    }
    return null;
  }
}
