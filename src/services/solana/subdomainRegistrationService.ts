
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubdomainRegistrationResult {
  success: boolean;
  subdomain?: string;
  error?: string;
  txHash?: string;
}

export class SubdomainRegistrationService {
  /**
   * Register blockdrive.sol subdomain in database
   */
  static async registerSubdomainInDatabase(
    walletAddress: string,
    subdomainName: string,
    userId: string
  ): Promise<SubdomainRegistrationResult> {
    try {
      const fullDomain = `${subdomainName.toLowerCase()}.blockdrive.sol`;
      const registrationTx = `blockdrive_sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: userId,
          wallet_address: walletAddress,
          blockchain_type: 'solana',
          subdomain_name: subdomainName.toLowerCase(),
          full_domain: fullDomain,
          registration_transaction: registrationTx,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Subdomain registration error:', subdomainError);
        return {
          success: false,
          error: 'Failed to register subdomain. Please try again.'
        };
      }

      toast.success(`🎉 ${fullDomain} registered successfully! Your BlockDrive.sol subdomain is now active.`);
      
      return {
        success: true,
        subdomain: fullDomain,
        txHash: registrationTx
      };

    } catch (error: any) {
      console.error('Database subdomain registration error:', error);
      return {
        success: false,
        error: error.message || 'Failed to register subdomain in database'
      };
    }
  }
}
