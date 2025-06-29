
import { BaseAuthService } from './baseAuthService';

// Legacy compatibility wrapper for Base authentication
export class NFTService {
  /**
   * @deprecated Use BaseAuthService.redirectToSoulboundNFTMint() instead
   */
  static async airdropBlockDriveNFT(
    walletAddress: string,
    blockchainType: 'ethereum' | 'solana'
  ): Promise<{ success: boolean; nft?: any; error?: string; txHash?: string }> {
    if (blockchainType !== 'ethereum') {
      return {
        success: false,
        error: 'Only Base L2 (Ethereum) is supported. Solana authentication has been discontinued.'
      };
    }

    // Redirect to Base soulbound NFT mint
    BaseAuthService.redirectToSoulboundNFTMint();
    
    return {
      success: true,
      nft: { message: 'Redirected to Base soulbound NFT launchpad' }
    };
  }

  /**
   * @deprecated Use BaseAuthService.verifySoulboundNFT() instead
   */
  static async verifyNFTOwnership(walletAddress: string, blockchainType: 'ethereum' | 'solana') {
    if (blockchainType !== 'ethereum') {
      return {
        hasNFT: false,
        error: 'Only Base L2 (Ethereum) is supported'
      };
    }

    return await BaseAuthService.verifySoulboundNFT(walletAddress);
  }
}
