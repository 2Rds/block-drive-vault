// Stub - Legacy auth service deprecated with Clerk
export class AuthService {
  static async loadWalletData(_userId: string) {
    console.warn('AuthService.loadWalletData is deprecated. Use Clerk authentication.');
    return null;
  }

  static async validateSession() {
    return true;
  }
}

      if (error) {
        console.error('Secure wallet loading failed:', error);
        
        // Log security event for failed wallet access
        logSecurityEvent('wallet_access_failed', { 
          userId,
          error: error.message || 'Unknown error'
        }, 'medium');
        
        return null;
      }

      // Note: private_key_encrypted is intentionally excluded for security
      // Enhanced access validation is handled by RLS policies
      return wallet;
    } catch (error: any) {
      console.error('Security: Wallet data access denied:', error);
      
      // Log security event for failed wallet access
      logSecurityEvent('wallet_access_exception', { 
        userId,
        error: error.message || 'Unknown error'
      }, 'high');
      
      return null;
    }
  }

  static async connectWallet(walletAddress: string, signature: string, blockchainType: 'solana' | 'ethereum') {
    const startTime = Date.now();
    
    try {
      // Enhanced rate limiting with progressive delays
      const rateLimitKey = `wallet_auth_${walletAddress}`;
      const attemptKey = `auth_attempts_${walletAddress}`;
      
      if (isRateLimited(rateLimitKey, 3, 5 * 60 * 1000)) {
        logSecurityEvent('auth_rate_limited', { 
          walletAddress: walletAddress.slice(0, 6) + '...', 
          blockchainType 
        }, 'medium');
        
        return { error: { message: standardizeError(null, 'rate_limit') } };
      }

      // Get current attempt count for progressive delays
      const attemptCount = parseInt(localStorage.getItem(attemptKey) || '0') + 1;
      localStorage.setItem(attemptKey, attemptCount.toString());
      
      if (attemptCount > 1) {
        const delay = getAuthDelay(attemptCount);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Enhanced input validation with security logging
      const walletValidation = validateWalletSecurely(walletAddress, blockchainType);
      if (!walletValidation.isValid) {
        logSecurityEvent('invalid_wallet_input', { 
          blockchainType,
          error: walletValidation.error 
        });
        
        return { error: { message: standardizeError(walletValidation.error, 'validation') } };
      }

      // Validate signature format
      if (!signature || signature.length < 10) {
        logSecurityEvent('invalid_signature_format', { blockchainType });
        return { error: { message: standardizeError(null, 'validation') } };
      }

      console.log(`Attempting to authenticate ${blockchainType} wallet:`, walletAddress);
      
      // Use the secure authentication endpoint
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
        logSecurityEvent('wallet_auth_failed', { 
          walletAddress: walletAddress.slice(0, 6) + '...', 
          blockchainType,
          error: error.message,
          duration: Date.now() - startTime
        }, 'medium');
        
        window.dispatchEvent(new CustomEvent('auth-failure'));
        return { error: { message: standardizeError(error, 'wallet') } };
      }

      if (data?.success && data?.authToken) {
        // Clear failed attempt counter on success
        localStorage.removeItem(attemptKey);
        
        logSecurityEvent('wallet_auth_success', { 
          walletAddress: walletAddress.slice(0, 6) + '...', 
          blockchainType,
          isFirstTime: data.isFirstTime,
          duration: Date.now() - startTime
        });
        
        console.log('Wallet authentication successful, creating session...');
        
        // Create a comprehensive session using the auth token
        const sessionData = {
          user: {
            id: data.authToken,
            email: `${walletAddress}@blockdrive.wallet`,
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

        // Store session securely using SecureSessionManager
        const mockUser = {
          id: data.authToken,
          email: `${walletAddress}@blockdrive.wallet`,
          user_metadata: {
            wallet_address: walletAddress,
            blockchain_type: blockchainType,
            username: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} User`,
            full_name: `${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} Wallet User`
          }
        };
        
        const mockSession = {
          access_token: data.authToken,
          refresh_token: data.authToken,
          expires_at: Date.now() + (24 * 60 * 60 * 1000),
          token_type: 'bearer',
          user: mockUser
        };
        
        SecureSessionManager.storeSession(mockUser as any, mockSession as any);
        
        // Set wallet data immediately for UI consistency
        const walletData = {
          address: walletAddress,
          publicKey: null,
          adapter: null,
          connected: true,
          autoConnect: false,
          id: blockchainType,
          wallet_address: walletAddress,
          blockchain_type: blockchainType
        };
        
        // Trigger auth state change manually with wallet data
        window.dispatchEvent(new CustomEvent('wallet-auth-success', { 
          detail: { ...sessionData, walletData }
        }));

        if (data.isFirstTime) {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet registered successfully! Welcome to BlockDrive!`);
        } else {
          toast.success(`${blockchainType.charAt(0).toUpperCase() + blockchainType.slice(1)} wallet authenticated successfully! Welcome back!`);
        }
        
        return { error: null, data: sessionData };
      } else {
        logSecurityEvent('wallet_auth_unexpected_failure', { 
          walletAddress: walletAddress.slice(0, 6) + '...', 
          blockchainType 
        });
        
        window.dispatchEvent(new CustomEvent('auth-failure'));
        return { error: { message: standardizeError(null, 'wallet') } };
      }
    } catch (error: any) {
      logSecurityEvent('wallet_auth_exception', { 
        walletAddress: walletAddress.slice(0, 6) + '...', 
        blockchainType,
        error: error.message,
        duration: Date.now() - startTime
      }, 'high');
      
      window.dispatchEvent(new CustomEvent('auth-failure'));
      return { error: { message: standardizeError(error, 'network') } };
    }
  }

  static async signOut() {
    try {
      logSecurityEvent('signout_initiated', {});
      
      // Clear secure session
      SecureSessionManager.clearSession();
      
      const { error } = await supabase.auth.signOut();
      if (!error) {
        toast.success('Signed out successfully');
        logSecurityEvent('signout_success', {});
        
        // Redirect to auth page
        window.location.href = '/auth';
      } else {
        logSecurityEvent('signout_error', { error: error.message }, 'medium');
      }
      return { error };
    } catch (error: any) {
      logSecurityEvent('signout_exception', { error: error.message }, 'high');
      return { error: standardizeError(error, 'auth') };
    }
  }
}
