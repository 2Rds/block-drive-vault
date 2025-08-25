// Enhanced wallet security service with simplified, robust security measures
// Replaces complex validation functions with straightforward security checks

import { supabase } from '@/integrations/supabase/client';
import { SecurityService } from './securityService';

export class WalletSecurityService {
  // Simple user ownership validation - the core security principle
  static async validateUserOwnership(userId: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        await SecurityService.logSecurityEvent('wallet_auth_failed', {
          reason: 'no_authenticated_user',
          targetUserId: userId
        }, 'high');
        return false;
      }
      
      if (user.id !== userId) {
        await SecurityService.logSecurityEvent('wallet_unauthorized_access', {
          reason: 'user_id_mismatch',
          authenticatedUser: user.id,
          targetUserId: userId
        }, 'critical');
        return false;
      }
      
      return true;
    } catch (error) {
      await SecurityService.logSecurityEvent('wallet_validation_error', {
        error: error.message,
        targetUserId: userId
      }, 'high');
      return false;
    }
  }

  // Validate wallet creation data before database insertion
  static validateWalletCreationData(walletData: {
    wallet_address: string;
    public_key: string;
    private_key_encrypted: string;
    blockchain_type: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate wallet address
    if (!walletData.wallet_address || walletData.wallet_address.length < 20) {
      errors.push('Invalid wallet address');
    }

    // Validate public key
    if (!walletData.public_key || walletData.public_key.length < 20) {
      errors.push('Invalid public key');
    }

    // Validate encrypted private key
    if (!walletData.private_key_encrypted || walletData.private_key_encrypted.length < 64) {
      errors.push('Invalid encrypted private key');
    }

    // Validate blockchain type
    if (!['solana', 'ethereum'].includes(walletData.blockchain_type)) {
      errors.push('Unsupported blockchain type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Secure wallet creation with enhanced validation
  static async createWalletSecurely(
    userId: string,
    walletData: {
      wallet_address: string;
      public_key: string;
      private_key_encrypted: string;
      blockchain_type: string;
    }
  ): Promise<{ success: boolean; wallet?: any; error?: string }> {
    try {
      // Validate user ownership first
      if (!(await this.validateUserOwnership(userId))) {
        return { success: false, error: 'Unauthorized wallet creation attempt' };
      }

      // Validate wallet data
      const validation = this.validateWalletCreationData(walletData);
      if (!validation.isValid) {
        await SecurityService.logSecurityEvent('wallet_creation_validation_failed', {
          userId,
          errors: validation.errors
        }, 'medium');
        return { success: false, error: 'Invalid wallet data provided' };
      }

      // Check if user already has a wallet
      const existingWallet = await this.getUserWalletCount(userId);
      if (existingWallet > 0) {
        await SecurityService.logSecurityEvent('duplicate_wallet_creation_attempt', {
          userId,
          existingWalletCount: existingWallet
        }, 'medium');
        return { success: false, error: 'User already has a wallet' };
      }

      // Create wallet in database
      const { data: wallet, error } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          ...walletData
        })
        .select()
        .single();

      if (error) {
        await SecurityService.logSecurityEvent('wallet_creation_failed', {
          userId,
          error: error.message
        }, 'high');
        return { success: false, error: 'Failed to create wallet' };
      }

      await SecurityService.logSecurityEvent('wallet_created_successfully', {
        userId,
        walletId: wallet.id,
        walletAddress: walletData.wallet_address.substring(0, 8) + '...',
        blockchainType: walletData.blockchain_type
      }, 'medium');

      return { success: true, wallet };
    } catch (error) {
      await SecurityService.logSecurityEvent('wallet_creation_error', {
        userId,
        error: error.message
      }, 'critical');
      return { success: false, error: 'Wallet creation failed' };
    }
  }

  // Get wallet count for user (to prevent multiple wallets)
  static async getUserWalletCount(userId: string): Promise<number> {
    try {
      if (!(await this.validateUserOwnership(userId))) {
        return 0;
      }

      const { count, error } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error counting user wallets:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUserWalletCount:', error);
      return 0;
    }
  }

  // Enhanced session validation for wallet operations
  static async validateWalletSession(userId: string): Promise<boolean> {
    try {
      // Basic user ownership check
      if (!(await this.validateUserOwnership(userId))) {
        return false;
      }

      // Check session validity
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        await SecurityService.logSecurityEvent('invalid_wallet_session', {
          userId,
          error: error?.message
        }, 'high');
        return false;
      }

      // Check session expiration
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        await SecurityService.logSecurityEvent('expired_wallet_session', {
          userId,
          expiresAt: session.expires_at,
          currentTime: now
        }, 'high');
        return false;
      }

      return true;
    } catch (error) {
      await SecurityService.logSecurityEvent('wallet_session_validation_error', {
        userId,
        error: error.message
      }, 'high');
      return false;
    }
  }

  // Rate limiting for wallet operations
  static isWalletOperationRateLimited(userId: string, operation: string): boolean {
    const key = `wallet_${operation}_${userId}`;
    // Allow 5 operations per 5 minutes for wallet operations
    return SecurityService.isRateLimited(key, 5, 5 * 60 * 1000);
  }

  // Monitor wallet access patterns for security
  static async monitorWalletAccess(userId: string, operation: string): Promise<void> {
    try {
      // Check rate limiting
      if (this.isWalletOperationRateLimited(userId, operation)) {
        await SecurityService.logSecurityEvent('wallet_rate_limit_exceeded', {
          userId,
          operation
        }, 'high');
        return;
      }

      // Log normal wallet access
      await SecurityService.logSecurityEvent('wallet_access_monitored', {
        userId,
        operation,
        timestamp: new Date().toISOString()
      }, 'low');
    } catch (error) {
      console.error('Error monitoring wallet access:', error);
    }
  }

  // Secure wallet data retrieval (never includes private keys)
  static async getWalletSecurely(userId: string): Promise<any> {
    try {
      // Validate session and ownership
      if (!(await this.validateWalletSession(userId))) {
        throw new Error('Invalid wallet session');
      }

      // Monitor the access
      await this.monitorWalletAccess(userId, 'read');

      // Use the secure RPC function that never returns private keys
      const { data: walletResult, error } = await supabase
        .rpc('get_user_wallet_safe', { target_user_id: userId });

      if (error) {
        await SecurityService.logSecurityEvent('secure_wallet_fetch_failed', {
          userId,
          error: error.message
        }, 'high');
        throw error;
      }

      if (!walletResult || walletResult.length === 0) {
        return null;
      }

      const walletData = walletResult[0];

      // Fetch blockchain tokens separately
      const { data: tokens } = await supabase
        .from('blockchain_tokens')
        .select('*')
        .eq('wallet_id', walletData.id);

      return {
        ...walletData,
        blockchain_tokens: tokens || []
      };
    } catch (error) {
      await SecurityService.logSecurityEvent('secure_wallet_retrieval_error', {
        userId,
        error: error.message
      }, 'high');
      throw error;
    }
  }
}