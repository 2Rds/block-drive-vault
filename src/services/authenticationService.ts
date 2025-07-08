
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class AuthenticationService {
  static async connectWallet(incomingWalletData: any) {
    try {
      console.log('Fresh wallet connection attempt:', incomingWalletData);

      const walletAddress = incomingWalletData.address || incomingWalletData.wallet_address;
      const signature = incomingWalletData.signature || `mock-signature-${Date.now()}`;
      const blockchainType = incomingWalletData.blockchain_type || 'ethereum';
      
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      console.log(`Attempting fresh ${blockchainType} wallet authentication:`, walletAddress);
      
      // Generate fresh authentication parameters
      const timestamp = Date.now();
      const nonce = crypto.randomUUID();
      const message = `Sign this message to authenticate with BlockDrive - ${timestamp}`;
      
      // Use the secure wallet authentication endpoint with fresh parameters
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message,
          timestamp,
          nonce,
          blockchainType
        }
      });

      if (error) {
        console.error('Fresh wallet authentication error:', error);
        throw new Error(`Failed to authenticate wallet: ${error.message}`);
      }

      if (data?.success && data?.authToken) {
        console.log('Fresh wallet authentication successful, creating temporary session...');
        
        // Create a session with shorter expiration time for security
        const sessionData = {
          user: {
            id: data.authToken,
            email: `${walletAddress}@blockdrive.wallet`,
            wallet_address: walletAddress,
            user_metadata: {
              wallet_address: walletAddress,
              blockchain_type: blockchainType,
              username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
              full_name: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet User`,
              auth_timestamp: timestamp
            }
          },
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (8 * 60 * 60 * 1000), // 8 hours for better security
          token_type: 'bearer'
        };

        // Store in sessionStorage instead of localStorage for better security
        // sessionStorage is cleared when the browser tab is closed
        sessionStorage.setItem('wallet-session-temp', JSON.stringify(sessionData));
        
        if (data.isFirstTime) {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully! Welcome to BlockDrive!`);
        } else {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully! Welcome back!`);
        }
        
        // Immediate redirect after setting all state
        console.log('Fresh authentication complete, redirecting to dashboard...');
        window.location.href = '/dashboard';

        return { error: null, data: sessionData };
      } else {
        throw new Error('Wallet authentication failed');
      }
    } catch (error: any) {
      console.error('Fresh wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
      return { error: { message: error.message } };
    }
  }

  static async disconnectWallet() {
    try {
      console.log('Disconnecting wallet and clearing all session data...');
      
      // Clear all session storage
      localStorage.removeItem('wallet-session');
      localStorage.removeItem('sb-supabase-auth-token');
      sessionStorage.removeItem('wallet-session');
      sessionStorage.removeItem('wallet-session-temp');
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success('Wallet disconnected - fresh authentication required for next session');
      
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
      // Clear all session storage
      localStorage.removeItem('wallet-session');
      localStorage.removeItem('sb-supabase-auth-token');
      sessionStorage.removeItem('wallet-session');
      sessionStorage.removeItem('wallet-session-temp');
      localStorage.clear();
      sessionStorage.clear();
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  static checkWalletSession() {
    // SECURITY FIX: Do not restore sessions automatically
    console.log('Session check - fresh authentication required for security');
    
    // Clear any existing sessions
    localStorage.removeItem('wallet-session');
    localStorage.removeItem('sb-supabase-auth-token');
    sessionStorage.removeItem('wallet-session');
    sessionStorage.removeItem('wallet-session-temp');
    
    return null;
  }
}
