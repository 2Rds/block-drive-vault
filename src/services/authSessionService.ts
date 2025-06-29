
import { supabase } from '@/integrations/supabase/client';

export interface AuthSessionResult {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

export class AuthSessionService {
  /**
   * Create authentication session
   */
  static async createAuthSession(
    nftData: any,
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana'
  ): Promise<AuthSessionResult> {
    try {
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('auth_sessions')
        .insert({
          user_id: nftData.user_id,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          nft_verified: true,
          subdomain_verified: true,
          authentication_successful: true,
          session_token: sessionToken
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return {
          success: false,
          error: 'Failed to create authentication session'
        };
      }

      console.log('Auth session created successfully:', sessionData);
      
      return {
        success: true,
        sessionToken: sessionToken
      };

    } catch (error: any) {
      console.error('Auth session creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create session'
      };
    }
  }
}
