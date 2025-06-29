
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NFTVerificationResult {
  hasNFT: boolean;
  nftData?: any;
  error?: string;
}

export class NFTVerificationService {
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
}
