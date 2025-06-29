
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BaseAuthService } from './baseAuthService';

export interface BaseSubdomainResult {
  success: boolean;
  subdomain?: string;
  error?: string;
  txHash?: string;
}

export class BaseSubdomainService {
  /**
   * Check if Base subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string): Promise<boolean> {
    try {
      const { data: existingSubdomain, error } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomainName.toLowerCase())
        .eq('blockchain_type', 'ethereum')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking Base subdomain availability:', error);
        return false;
      }

      return !existingSubdomain;
    } catch (error) {
      console.error('Base subdomain availability check failed:', error);
      return false;
    }
  }

  /**
   * Create Base subdomain with soulbound NFT verification
   */
  static async createBaseSubdomain(
    walletAddress: string,
    subdomainName: string
  ): Promise<BaseSubdomainResult> {
    return await BaseAuthService.createBaseSubdomain(walletAddress, subdomainName);
  }

  /**
   * Get user's Base subdomain
   */
  static async getUserBaseSubdomain(walletAddress: string): Promise<{
    hasSubdomain: boolean;
    subdomainData?: any;
    error?: string;
  }> {
    return await BaseAuthService.verifyBaseSubdomain(walletAddress);
  }

  /**
   * Verify complete Base 2FA setup (NFT + Subdomain)
   */
  static async verifyBase2FA(walletAddress: string): Promise<{
    hasNFT: boolean;
    hasSubdomain: boolean;
    isFullyVerified: boolean;
  }> {
    try {
      const nftVerification = await BaseAuthService.verifySoulboundNFT(walletAddress);
      const subdomainVerification = await BaseAuthService.verifyBaseSubdomain(walletAddress);

      const isFullyVerified = nftVerification.hasNFT && subdomainVerification.hasSubdomain;

      return {
        hasNFT: nftVerification.hasNFT,
        hasSubdomain: subdomainVerification.hasSubdomain,
        isFullyVerified
      };
    } catch (error) {
      console.error('Base 2FA verification error:', error);
      return {
        hasNFT: false,
        hasSubdomain: false,
        isFullyVerified: false
      };
    }
  }
}
