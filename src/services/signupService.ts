
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SignupData {
  email: string;
  fullName: string;
  organization?: string;
  subscriptionTier?: string;
}

export class SignupService {
  static async registerUser(signupData: SignupData) {
    try {
      console.log('Registering user with email:', signupData.email);
      
      // Use the secure signup function instead of direct table insertion
      const { data, error } = await supabase.rpc('secure_user_signup', {
        email_param: signupData.email,
        full_name_param: signupData.fullName,
        organization_param: signupData.organization || null,
        subscription_tier_param: signupData.subscriptionTier || 'free_trial'
      });

      if (error) {
        console.error('Signup error:', error);
        return { error: { message: error.message } };
      }

      console.log('User registered successfully:', data);
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
      
      const { data, error } = await supabase
        .from('user_signups')
        .update({
          wallet_connected: true,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select('id, email, full_name, organization, subscription_tier, wallet_connected, created_at, updated_at') // Exclude sensitive data
        .single();

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
        .select('id, email, full_name, organization, subscription_tier, wallet_connected, created_at, updated_at')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching signup:', error);
        return { error };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Get signup error:', error);
      return { error: { message: error.message } };
    }
  }
}
