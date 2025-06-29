
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NFTAirdropResult } from '@/types/subdomain';

export class NFTService {
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
}
