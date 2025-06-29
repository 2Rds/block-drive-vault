
import { PublicKey } from '@solana/web3.js';
import { MetaplexConfig } from './metaplexConfig';
import { SPLTokenService } from './splTokenService';

export interface NFTVerificationResult {
  hasNFT: boolean;
  nfts: any[];
  hasSPLToken: boolean;
  splTokenBalance?: number;
  error?: string;
}

export class NFTVerificationService {
  /**
   * Verify BlockDrive SPL token ownership (new first factor)
   */
  static async verifySPLToken(walletAddress: string): Promise<NFTVerificationResult> {
    try {
      console.log('Verifying BlockDrive SPL token ownership:', walletAddress);
      
      const splVerification = await SPLTokenService.verifyBlockDriveSPLToken(walletAddress);
      
      if (splVerification.error) {
        return {
          hasNFT: false,
          nfts: [],
          hasSPLToken: false,
          error: splVerification.error
        };
      }

      return {
        hasNFT: splVerification.hasToken, // Using SPL token as NFT equivalent
        nfts: splVerification.hasToken ? [{
          type: 'SPL_TOKEN',
          address: MetaplexConfig.getBlockDriveSPLToken(),
          balance: splVerification.balance,
          name: 'BlockDrive Access Token',
          symbol: 'BDRIVE'
        }] : [],
        hasSPLToken: splVerification.hasToken,
        splTokenBalance: splVerification.balance
      };

    } catch (error: any) {
      console.error('SPL token verification error:', error);
      return {
        hasNFT: false,
        nfts: [],
        hasSPLToken: false,
        error: error.message
      };
    }
  }
}
