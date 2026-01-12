// Stub - Legacy signup service deprecated with Clerk auth
export interface SignupData {
  email: string;
  fullName: string;
  organization?: string;
  subscriptionTier?: string;
}

export class SignupService {
  static async registerUser(_signupData: SignupData) {
    console.warn('SignupService is deprecated. Use Clerk authentication.');
    return { error: { message: 'Use Clerk authentication' } };
  }

  static async checkEmailExists(_email: string) {
    return false;
  }

  static async linkWalletToSignup(_email: string, _walletAddress: string) {
    return { error: null };
  }
}
      return { data, error: null };
    } catch (error: any) {
      console.error('Signup service error:', error);
      return { error: { message: error.message || 'Failed to register user' } };
    }
  }

  static async updateWalletConnection(email: string, walletAddress: string, blockchainType: string) {
    try {
      // Enhanced security logging for wallet connection attempts
      console.log('Wallet connection attempt for email:', email);
      
      // First try to link the signup to the current user for enhanced security
      await SignupService.linkSignupToUser();
      
      const { data, error } = await supabase
        .from('user_signups')
        .update({
          wallet_connected: true,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select('id, email, full_name, organization, subscription_tier, wallet_connected, created_at, updated_at, user_id') // Include user_id
        .maybeSingle();

      if (error) {
        console.error('Error updating wallet connection:', error);
        return { error };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Update wallet connection error:', error);
      return { error: { message: error.message } };
    }
  }

  static async getSignupByEmail(email: string) {
    try {
      // Only select non-sensitive fields for security
      const { data, error } = await supabase
        .from('user_signups')
        .select('id, email, full_name, organization, subscription_tier, wallet_connected, created_at, updated_at, user_id')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching signup:', error);
        return { error };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Get signup error:', error);
      return { error: { message: error.message } };
    }
  }

  // New method to link signup to authenticated user for enhanced security
  static async linkSignupToUser() {
    try {
      const { error } = await supabase.rpc('link_signup_to_user');

      if (error) {
        console.error('Error linking signup to user:', error);
        return { error };
      }

      console.log('Successfully linked signup to authenticated user');
      return { error: null };
    } catch (error: any) {
      console.error('Link signup error:', error);
      return { error: { message: error.message } };
    }
  }
}
