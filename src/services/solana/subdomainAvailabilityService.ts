
import { supabase } from '@/integrations/supabase/client';

export class SubdomainAvailabilityService {
  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string): Promise<boolean> {
    try {
      const { data: existingSubdomain, error } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomainName.toLowerCase())
        .eq('blockchain_type', 'solana')
        .eq('full_domain', `${subdomainName.toLowerCase()}.blockdrive.sol`)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking subdomain availability:', error);
        return false;
      }

      return !existingSubdomain;
    } catch (error) {
      console.error('Subdomain availability check failed:', error);
      return false;
    }
  }
}
