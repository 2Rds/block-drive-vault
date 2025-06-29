
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { MetaplexConfig } from './metaplexConfig';

export interface SPLTokenAirdropResult {
  success: boolean;
  signature?: string;
  error?: string;
  tokenAccount?: string;
}

export class SPLTokenService {
  /**
   * Airdrop BlockDrive SPL token to user wallet
   */
  static async airdropBlockDriveSPLToken(
    walletAddress: string,
    amount: number = 1
  ): Promise<SPLTokenAirdropResult> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();
      const connection = metaplex.connection;
      const tokenMint = new PublicKey(MetaplexConfig.getBlockDriveSPLToken());
      const recipientPublicKey = new PublicKey(walletAddress);

      console.log('Airdropping BlockDrive SPL token:', {
        tokenMint: tokenMint.toString(),
        recipient: walletAddress,
        amount
      });

      // Get or create associated token account for recipient
      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        recipientPublicKey
      );

      // Check if token account exists
      let createTokenAccount = false;
      try {
        await getAccount(connection, recipientTokenAccount);
      } catch (error) {
        // Token account doesn't exist, we need to create it
        createTokenAccount = true;
      }

      // Get authority token account (assuming we have tokens to distribute)
      const authorityPublicKey = metaplex.identity().publicKey;
      const authorityTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        authorityPublicKey
      );

      const transaction = new Transaction();

      // Add create token account instruction if needed
      if (createTokenAccount) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            authorityPublicKey, // payer
            recipientTokenAccount, // ata
            recipientPublicKey, // owner
            tokenMint // mint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          authorityTokenAccount, // source
          recipientTokenAccount, // destination
          authorityPublicKey, // owner
          amount * Math.pow(10, 9) // amount (assuming 9 decimals)
        )
      );

      // Send transaction
      const signature = await connection.sendTransaction(transaction, [metaplex.identity()]);
      await connection.confirmTransaction(signature);

      console.log('🎉 BlockDrive SPL token airdropped successfully!');
      console.log('📍 Transaction:', signature);
      console.log('🏷️  Token Account:', recipientTokenAccount.toString());

      return {
        success: true,
        signature,
        tokenAccount: recipientTokenAccount.toString()
      };

    } catch (error: any) {
      console.error('SPL token airdrop error:', error);
      return {
        success: false,
        error: error.message || 'Failed to airdrop SPL token'
      };
    }
  }

  /**
   * Verify user owns BlockDrive SPL token
   */
  static async verifyBlockDriveSPLToken(walletAddress: string): Promise<{
    hasToken: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const metaplex = await MetaplexConfig.initializeMetaplex();
      const connection = metaplex.connection;
      const tokenMint = new PublicKey(MetaplexConfig.getBlockDriveSPLToken());
      const ownerPublicKey = new PublicKey(walletAddress);

      const tokenAccount = await getAssociatedTokenAddress(tokenMint, ownerPublicKey);
      
      try {
        const account = await getAccount(connection, tokenAccount);
        const balance = Number(account.amount) / Math.pow(10, 9); // Assuming 9 decimals
        
        return {
          hasToken: balance > 0,
          balance
        };
      } catch (error) {
        // Token account doesn't exist
        return {
          hasToken: false,
          balance: 0
        };
      }

    } catch (error: any) {
      console.error('SPL token verification error:', error);
      return {
        hasToken: false,
        error: error.message
      };
    }
  }
}
