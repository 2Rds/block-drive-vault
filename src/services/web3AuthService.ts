
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NFTVerificationResult {
  hasNFT: boolean;
  nftData?: any;
  error?: string;
}

export interface SubdomainVerificationResult {
  hasSubdomain: boolean;
  subdomainData?: any;
  error?: string;
}

export interface AuthenticationResult {
  success: boolean;
  isFirstTime?: boolean;
  requiresSubdomain?: boolean;
  error?: string;
  sessionToken?: string;
}

export class Web3AuthService {
  
  /**
   * Mint BlockDrive NFT for new users
   */
  static async mintBlockDriveNFT(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ): Promise<{ success: boolean; nft?: any; error?: string; isFirstTime?: boolean }> {
    try {
      console.log('Minting BlockDrive NFT:', { walletAddress, blockchainType });
      
      const { data, error } = await supabase.functions.invoke('mint-solbound-nft', {
        body: {
          walletAddress,
          blockchainType,
          signature,
          message
        }
      });

      if (error) {
        console.error('NFT minting error:', error);
        return { success: false, error: error.message || 'Failed to mint NFT' };
      }

      if (data.success) {
        toast.success(`BlockDrive NFT successfully minted to your ${blockchainType} wallet!`);
        return { 
          success: true, 
          nft: data.nft, 
          isFirstTime: data.isFirstTime 
        };
      } else {
        return { 
          success: false, 
          error: data.error || 'NFT minting failed' 
        };
      }
    } catch (error: any) {
      console.error('Mint NFT error:', error);
      return { success: false, error: error.message || 'Failed to mint NFT' };
    }
  }

  /**
   * Verify if user has BlockDrive NFT in their wallet
   */
  static async verifyNFTOwnership(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana'
  ): Promise<NFTVerificationResult> {
    try {
      console.log('Verifying NFT ownership:', { walletAddress, blockchainType });
      
      const { data: nftData, error } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
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
      console.error('NFT verification error:', error);
      return { hasNFT: false, error: error.message };
    }
  }

  /**
   * Verify subdomain ownership and wallet match
   */
  static async verifySubdomainOwnership(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana'
  ): Promise<SubdomainVerificationResult> {
    try {
      console.log('Verifying subdomain ownership:', { walletAddress, blockchainType });
      
      const { data: subdomainData, error } = await supabase
        .from('subdomain_registrations')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
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
      console.error('Subdomain verification error:', error);
      return { hasSubdomain: false, error: error.message };
    }
  }

  /**
   * Complete Web3 Multi-Factor Authentication
   */
  static async authenticateUser(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ): Promise<AuthenticationResult> {
    try {
      console.log('Starting Web3 MFA:', { walletAddress, blockchainType });

      // Step 1: Verify NFT ownership (First Factor)
      const nftVerification = await this.verifyNFTOwnership(walletAddress, blockchainType);
      
      if (!nftVerification.hasNFT) {
        // If no NFT, this might be a first-time user - try to mint NFT
        console.log('No NFT found, attempting to mint for new user...');
        
        const mintResult = await this.mintBlockDriveNFT(walletAddress, blockchainType, signature, message);
        
        if (mintResult.success) {
          return {
            success: true,
            isFirstTime: true,
            requiresSubdomain: true // User needs to create subdomain next
          };
        } else {
          return {
            success: false,
            error: 'Authentication failed: No BlockDrive NFT found and unable to mint new NFT'
          };
        }
      }

      // Step 2: Verify subdomain ownership (Second Factor)
      const subdomainVerification = await this.verifySubdomainOwnership(walletAddress, blockchainType);
      
      if (!subdomainVerification.hasSubdomain) {
        return {
          success: false,
          requiresSubdomain: true,
          error: 'Authentication incomplete: Please create your BlockDrive subdomain to complete setup'
        };
      }

      // Both factors verified - create auth session
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('auth_sessions')
        .insert({
          user_id: nftVerification.nftData.user_id,
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

      console.log('Web3 MFA successful:', sessionData);
      
      return {
        success: true,
        sessionToken: sessionToken,
        isFirstTime: false
      };

    } catch (error: any) {
      console.error('Web3 MFA error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  /**
   * Register subdomain for user (completes second factor setup)
   */
  static async registerSubdomain(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana',
    subdomainName: string
  ): Promise<{ success: boolean; error?: string; subdomain?: any }> {
    try {
      const fullDomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
      
      // Get user ID from NFT record
      const { data: nftData, error: nftError } = await supabase
        .from('blockdrive_nfts')
        .select('user_id')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .single();

      if (nftError || !nftData) {
        return { success: false, error: 'NFT verification required before subdomain registration' };
      }

      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomain_registrations')
        .insert({
          user_id: nftData.user_id,
          wallet_address: walletAddress,
          blockchain_type: blockchainType,
          subdomain_name: subdomainName,
          full_domain: fullDomain,
          registration_transaction: `mock_tx_${Date.now()}`,
          is_active: true
        })
        .select()
        .single();

      if (subdomainError) {
        console.error('Subdomain registration error:', subdomainError);
        return { success: false, error: 'Failed to register subdomain' };
      }

      toast.success(`Subdomain ${fullDomain} successfully registered!`);
      return { success: true, subdomain: subdomainData };

    } catch (error: any) {
      console.error('Subdomain registration error:', error);
      return { success: false, error: error.message || 'Failed to register subdomain' };
    }
  }
}
