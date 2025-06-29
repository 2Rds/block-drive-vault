
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubdomainCreationResult {
  success: boolean;
  subdomain?: string;
  error?: string;
  txHash?: string;
}

export interface NFTAirdropResult {
  success: boolean;
  nft?: any;
  error?: string;
  txHash?: string;
}

export class CustomSubdomainService {
  
  /**
   * Check if subdomain is available
   */
  static async checkSubdomainAvailability(subdomainName: string, blockchainType: 'ethereum' | 'solana'): Promise<boolean> {
    try {
      const { data: existingSubdomain, error } = await supabase
        .from('subdomain_registrations')
        .select('id')
        .eq('subdomain_name', subdomainName.toLowerCase())
        .eq('blockchain_type', blockchainType)
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

  /**
   * Airdrop BlockDrive NFT to new user
   */
  static async airdropBlockDriveNFT(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana'
  ): Promise<NFTAirdropResult> {
    try {
      console.log(`Starting NFT airdrop for ${blockchainType} wallet:`, walletAddress);
      
      // Call the mint NFT edge function
      const { data, error } = await supabase.functions.invoke('mint-solbound-nft', {
        body: {
          walletAddress,
          blockchainType,
          signature: `airdrop-signature-${Date.now()}`,
          message: 'BlockDrive NFT Airdrop Authentication'
        }
      });

      if (error) {
        console.error('NFT airdrop error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to airdrop NFT' 
        };
      }

      if (data.success) {
        toast.success(`🎉 BlockDrive ${blockchainType.toUpperCase()} NFT airdropped successfully!`);
        return {
          success: true,
          nft: data.nft,
          txHash: data.nft?.transaction_hash
        };
      } else {
        return {
          success: false,
          error: data.error || 'NFT airdrop failed'
        };
      }
    } catch (error: any) {
      console.error('NFT airdrop error:', error);
      return {
        success: false,
        error: error.message || 'Failed to airdrop NFT'
      };
    }
  }

  /**
   * Create custom subdomain with NFT verification
   */
  static async createSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ): Promise<SubdomainCreationResult> {
    try {
      console.log('Creating subdomain:', { walletAddress, blockchainType, subdomainName });

      // First, verify user has the required NFT
      const { data: nftData, error: nftError } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      if (nftError || !nftData) {
        console.error('NFT verification failed:', nftError);
        return {
          success: false,
          error: 'BlockDrive NFT required for subdomain creation. Please ensure you have the required NFT.'
        };
      }

      // Check subdomain availability
      const isAvailable = await this.checkSubdomainAvailability(subdomainName, blockchainType);
      if (!isAvailable) {
        return {
          success: false,
          error: 'Subdomain is not available. Please choose another name.'
        };
      }

      // Create the subdomain record
      const fullDomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
      const mockTxHash = `subdomain_tx_${blockchainType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: nftData.user_id,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          subdomain_name: subdomainName.toLowerCase(),
          full_domain: fullDomain,
          registration_transaction: mockTxHash,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Subdomain creation error:', subdomainError);
        return {
          success: false,
          error: 'Failed to create subdomain. Please try again.'
        };
      }

      toast.success(`🌐 Subdomain ${fullDomain} created successfully!`);
      
      return {
        success: true,
        subdomain: fullDomain,
        txHash: mockTxHash
      };

    } catch (error: any) {
      console.error('Custom subdomain creation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create subdomain'
      };
    }
  }

  /**
   * Complete new user onboarding: NFT airdrop + subdomain creation
   */
  static async completeNewUserOnboarding(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName?: string
  ): Promise<{ nftResult: NFTAirdropResult; subdomainResult?: SubdomainCreationResult }> {
    console.log('Starting complete onboarding for:', { walletAddress, blockchainType, subdomainName });

    // Step 1: Airdrop NFT
    const nftResult = await this.airdropBlockDriveNFT(walletAddress, blockchainType);
    
    if (!nftResult.success) {
      return { nftResult };
    }

    // Step 2: Create subdomain if provided (mainly for Ethereum users)
    if (subdomainName && blockchainType === 'ethereum') {
      // Wait a moment for NFT to be confirmed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const subdomainResult = await this.createSubdomain(walletAddress, blockchainType, subdomainName);
      return { nftResult, subdomainResult };
    }

    return { nftResult };
  }

  /**
   * Verify user has both factors for 2FA (NFT + Subdomain for Ethereum, just NFT for Solana)
   */
  static async verify2FA(walletAddress: string, blockchainType: 'ethereum' | 'solana'): Promise<{
    hasNFT: boolean;
    hasSubdomain: boolean;
    isFullyVerified: boolean;
  }> {
    try {
      // Check NFT ownership (Factor 1)
      const { data: nftData } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      const hasNFT = !!nftData;

      // Check subdomain ownership (Factor 2) - required for Ethereum
      const { data: subdomainData } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      const hasSubdomain = !!subdomainData;

      // Determine if fully verified based on blockchain type
      const isFullyVerified = blockchainType === 'ethereum' 
        ? (hasNFT && hasSubdomain)  // Ethereum needs both factors
        : hasNFT;                   // Solana only needs NFT

      return {
        hasNFT,
        hasSubdomain,
        isFullyVerified
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        hasNFT: false,
        hasSubdomain: false,
        isFullyVerified: false
      };
    }
  }
}
