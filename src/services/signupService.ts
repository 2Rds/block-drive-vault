
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
      
      const { data, error } = await supabase
        .from('user_signups')
        .insert({
          email: signupData.email,
          full_name: signupData.fullName,
          organization: signupData.organization,
          subscription_tier: signupData.subscriptionTier || 'free_trial'
        })
        .select()
        .single();

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
      const { data, error } = await supabase
        .from('user_signups')
        .update({
          wallet_connected: true,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select()
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
      const { data, error } = await supabase
        .from('user_signups')
        .select('*')
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
