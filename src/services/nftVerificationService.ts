
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NFTVerificationResult {
  hasNFT: boolean;
  nftData?: any;
  isSoulbound?: boolean;
  error?: string;
}

export class NFTVerificationService {
  /**
   * Mint BlockDrive Soulbound NFT for new users
   */
  static async mintBlockDriveNFT(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana',
    signature: string,
    message: string
  ): Promise<{ success: boolean; nft?: any; error?: string; isFirstTime?: boolean }> {
    try {
      console.log('Minting BlockDrive Soulbound NFT:', { walletAddress, blockchainType });
      
      const { data, error } = await supabase.functions.invoke('mint-solbound-nft', {
        body: {
          walletAddress,
          blockchainType,
          signature,
          message
        }
      });

      if (error) {
        console.error('Soulbound NFT minting error:', error);
        return { success: false, error: error.message || 'Failed to mint soulbound NFT' };
      }

      if (data.success) {
        const nftType = blockchainType === 'solana' ? 'Soulbound' : 'BlockDrive';
        toast.success(`🔒 ${nftType} NFT successfully minted to your ${blockchainType} wallet! This NFT is permanently bound to your wallet for authentication.`);
        return { 
          success: true, 
          nft: data.nft, 
          isFirstTime: data.isFirstTime 
        };
      } else {
        return { 
          success: false, 
          error: data.error || 'Soulbound NFT minting failed' 
        };
      }
    } catch (error: any) {
      console.error('Mint soulbound NFT error:', error);
      return { success: false, error: error.message || 'Failed to mint soulbound NFT' };
    }
  }

  /**
   * Verify if user has BlockDrive Soulbound NFT in their wallet
   */
  static async verifyNFTOwnership(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana'
  ): Promise<NFTVerificationResult> {
    try {
      console.log('Verifying soulbound NFT ownership:', { walletAddress, blockchainType });
      
      const { data: nftData, error } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', blockchainType)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Soulbound NFT verification error:', error);
        return { hasNFT: false, error: error.message };
      }

      // Check if NFT has soulbound metadata (if it exists)
      const isSoulbound = nftData ? true : false; // For now, all BlockDrive NFTs are considered soulbound

      return {
        hasNFT: !!nftData,
        nftData: nftData || undefined,
        isSoulbound
      };
    } catch (error: any) {
      console.error('Soulbound NFT verification error:', error);
      return { hasNFT: false, error: error.message };
    }
  }
}
