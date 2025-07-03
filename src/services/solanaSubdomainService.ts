
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class SolanaSubdomainService {
  /**
   * Register a Solana subdomain via SNS (Solana Name Service)
   */
  static async registerSubdomain(
    subdomain: string,
    walletAddress: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Registering Solana subdomain:', subdomain);
      
      // First, check if subdomain is available
      const { data: existing, error: checkError } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomain)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking subdomain availability:', checkError);
        return { success: false, error: 'Failed to check subdomain availability' };
      }

      if (existing) {
        return { success: false, error: 'Subdomain is already taken' };
      }

      // Create the full domain name
      const fullDomain = `${subdomain}.blockdrive.sol`;

      // For now, we'll simulate the SNS registration
      // In production, this would integrate with https://v1.sns.id/sub-registrar/blockdrive
      const mockTransactionHash = `sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store the subdomain registration in our database
      const { data, error } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          subdomain_name: subdomain,
          full_domain: fullDomain,
          registration_transaction: mockTransactionHash,
          blockchain_type: 'solana',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing subdomain registration:', error);
        return { success: false, error: 'Failed to register subdomain' };
      }

      // Update the user's profile with their Solana subdomain
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          solana_subdomain: fullDomain,
          username: subdomain 
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating user profile:', profileError);
        // Don't fail the whole process if profile update fails
      }

      toast.success(`Successfully registered ${fullDomain}!`);
      return { success: true };

    } catch (error: any) {
      console.error('Subdomain registration error:', error);
      return { success: false, error: error.message || 'Failed to register subdomain' };
    }
  }

  /**
   * Check if a subdomain is available
   */
  static async checkSubdomainAvailability(subdomain: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomain)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking subdomain availability:', error);
        return false;
      }

      return !data; // Available if no existing record found
    } catch (error) {
      console.error('Subdomain availability check error:', error);
      return false;
    }
  }
}
