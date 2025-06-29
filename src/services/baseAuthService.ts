
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BaseAuthResult {
  success: boolean;
  isFirstTime?: boolean;
  requiresSubdomain?: boolean;
  error?: string;
  sessionToken?: string;
}

export interface BaseSoulboundNFTResult {
  success: boolean;
  nft?: any;
  error?: string;
  txHash?: string;
}

export class BaseAuthService {
  // Collectify soulbound NFT contract on Base
  private static readonly SOULBOUND_NFT_LAUNCHPAD = 'https://launchpad.collectify.app/#/mint?id=B1W814EY5';
  private static readonly BASE_CHAIN_ID = 8453; // Base mainnet chain ID

  /**
   * Verify if user has the required Base soulbound NFT
   */
  static async verifySoulboundNFT(walletAddress: string): Promise<{
    hasNFT: boolean;
    nftData?: any;
    error?: string;
  }> {
    try {
      console.log('Verifying Base soulbound NFT for:', walletAddress);
      
      const { data: nftData, error } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', 'ethereum')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('NFT verification error:', error);
        return { hasNFT: false, error: error.message };
      }

      return {
        hasNFT: !!nftData,
        nftData: nftData || undefined
      };
    } catch (error: any) {
      console.error('Base soulbound NFT verification error:', error);
      return { hasNFT: false, error: error.message };
    }
  }

  /**
   * Direct user to mint their free Base soulbound NFT
   */
  static redirectToSoulboundNFTMint(): void {
    console.log('Redirecting to Base soulbound NFT launchpad...');
    window.open(this.SOULBOUND_NFT_LAUNCHPAD, '_blank');
    toast.info('Please mint your free Base soulbound NFT to continue authentication');
  }

  /**
   * Verify Base subdomain ownership
   */
  static async verifyBaseSubdomain(walletAddress: string): Promise<{
    hasSubdomain: boolean;
    subdomainData?: any;
    error?: string;
  }> {
    try {
      console.log('Verifying Base subdomain for:', walletAddress);
      
      const { data: subdomainData, error } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', 'ethereum')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Subdomain verification error:', error);
        return { hasSubdomain: false, error: error.message };
      }

      return {
        hasSubdomain: !!subdomainData,
        subdomainData: subdomainData || undefined
      };
    } catch (error: any) {
      console.error('Base subdomain verification error:', error);
      return { hasSubdomain: false, error: error.message };
    }
  }

  /**
   * Complete Base 2FA authentication (Soulbound NFT + Base subdomain)
   */
  static async authenticateWithBase2FA(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<BaseAuthResult> {
    try {
      console.log('Starting Base 2FA authentication:', walletAddress);

      // Step 1: Verify soulbound NFT ownership (First Factor)
      const nftVerification = await this.verifySoulboundNFT(walletAddress);
      
      if (!nftVerification.hasNFT) {
        console.log('No soulbound NFT found, directing user to mint...');
        this.redirectToSoulboundNFTMint();
        
        return {
          success: false,
          isFirstTime: true,
          error: 'Please mint your free Base soulbound NFT first. The minting page has been opened in a new tab.'
        };
      }

      // Step 2: Verify Base subdomain ownership (Second Factor)
      const subdomainVerification = await this.verifyBaseSubdomain(walletAddress);
      
      if (!subdomainVerification.hasSubdomain) {
        return {
          success: false,
          requiresSubdomain: true,
          error: 'Please create your blockdrive.eth subdomain to complete 2FA setup'
        };
      }

      // Both factors verified - create auth session using existing wallet auth
      const { data, error } = await supabase.functions.invoke('secure-wallet-auth', {
        body: {
          walletAddress,
          signature,
          message,
          timestamp: Date.now(),
          nonce: crypto.randomUUID(),
          blockchainType: 'ethereum'
        }
      });

      if (error || !data?.success) {
        return {
          success: false,
          error: 'Authentication session creation failed'
        };
      }

      return {
        success: true,
        sessionToken: data.authToken,
        isFirstTime: false
      };

    } catch (error: any) {
      console.error('Base 2FA authentication error:', error);
      return {
        success: false,
        error: error.message || 'Base authentication failed'
      };
    }
  }

  /**
   * Create Base subdomain (second factor)
   */
  static async createBaseSubdomain(
    walletAddress: string,
    subdomainName: string
  ): Promise<{ success: boolean; error?: string; subdomain?: string }> {
    try {
      // First verify user has soulbound NFT
      const nftVerification = await this.verifySoulboundNFT(walletAddress);
      
      if (!nftVerification.hasNFT) {
        return {
          success: false,
          error: 'Base soulbound NFT required for subdomain creation'
        };
      }

      // Check subdomain availability
      const { data: existingSubdomain } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomainName.toLowerCase())
        .eq('blockchain_type', 'ethereum')
        .eq('is_active', true)
        .maybeSingle();

      if (existingSubdomain) {
        return {
          success: false,
          error: 'Subdomain is not available. Please choose another name.'
        };
      }

      // Create subdomain record
      const fullDomain = `${subdomainName}.blockdrive.eth`;
      const mockTxHash = `base_subdomain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: walletAddress,
          wallet_address: walletAddress,
          blockchain_type: 'ethereum',
          subdomain_name: subdomainName.toLowerCase(),
          full_domain: fullDomain,
          registration_transaction: mockTxHash,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Base subdomain creation error:', subdomainError);
        return {
          success: false,
          error: 'Failed to create Base subdomain. Please try again.'
        };
      }

      toast.success(`🌐 Base subdomain ${fullDomain} created successfully!`);
      
      return {
        success: true,
        subdomain: fullDomain
      };

    } catch (error: any) {
      console.error('Base subdomain creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Base subdomain'
      };
    }
  }
}
