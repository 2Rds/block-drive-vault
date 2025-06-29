
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SPLTokenService } from './metaplex/splTokenService';
import { NFTAirdropResult } from '@/types/subdomain';

export class NFTService {
  /**
   * Airdrop BlockDrive NFT/Token to new user
   */
  static async airdropBlockDriveNFT(
    walletAddress: string, 
    blockchainType: 'ethereum' | 'solana'
  ): Promise<NFTAirdropResult> {
    try {
      console.log(`Starting NFT/Token airdrop for ${blockchainType} wallet:`, walletAddress);
      
      if (blockchainType === 'solana') {
        // For Solana: Airdrop SPL token directly
        const splResult = await SPLTokenService.airdropBlockDriveSPLToken(walletAddress, 1);
        
        if (splResult.success) {
          // Also record in database for tracking
          const { data: userData } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', walletAddress)
            .maybeSingle();

          if (!userData) {
            await supabase
              .from('profiles')
              .insert({
                id: walletAddress,
                username: `solana_user_${walletAddress.slice(0, 8)}`,
                email: `${walletAddress}@blockdrive.solana`
              });
          }

          // Record SPL token in NFT table for consistency
          await supabase
            .from('blockdrive_nfts')
            .insert({
              user_id: walletAddress,
              wallet_address: walletAddress,
              blockchain_type: 'solana',
              nft_token_id: splResult.tokenAccount || 'spl_token',
              nft_contract_address: 'Coue3he4D9JMesMg9C3X9EzjkUkX1DUmrjghheWMD6cp',
              transaction_hash: splResult.signature,
              is_active: true
            });

          toast.success(`🎉 BlockDrive SPL token airdropped successfully!`);
          return {
            success: true,
            nft: {
              type: 'SPL_TOKEN',
              address: 'Coue3he4D9JMesMg9C3X9EzjkUkX1DUmrjghheWMD6cp',
              tokenAccount: splResult.tokenAccount,
              transaction_hash: splResult.signature
            },
            txHash: splResult.signature
          };
        } else {
          return {
            success: false,
            error: splResult.error || 'Failed to airdrop SPL token'
          };
        }
      } else {
        // For Ethereum: Use existing NFT minting via edge function
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
      }
    } catch (error: any) {
      console.error('NFT/Token airdrop error:', error);
      return {
        success: false,
        error: error.message || 'Failed to airdrop NFT/Token'
      };
    }
  }
}
