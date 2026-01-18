/**
 * NFT Membership Service
 * 
 * Manages BlockDrive's NFT-based subscription system with Alchemy embedded wallets.
 * Subscriptions are SPL Token-2022 tokens on Solana that users truly own.
 * Uses Alchemy's gas sponsorship for transaction fees.
 * 
 * Features:
 * - Mint membership NFTs using Token-2022 program (gas-sponsored)
 * - Verify membership validity from wallet
 * - Handle renewals and upgrades
 *
 * Note: Gas fees are handled by Alchemy Gas Manager, not per-user credits.
 */

import {
  PublicKey,
  Connection,
  Transaction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeMetadataPointerInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMintLen,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from '@solana/spl-token-metadata';
import {
  SubscriptionTier,
  MembershipMetadata,
  MembershipNFT,
  MembershipVerification,
  MembershipPurchaseRequest,
  MembershipPurchaseResult,
  TIER_CONFIGS,
  gbToBytes,
  isMembershipExpired,
  getDaysRemaining,
} from '@/types/nftMembership';
import { alchemyConfig } from '@/config/alchemy';

// PDA seeds for membership accounts
const MEMBERSHIP_SEED = 'blockdrive_membership';

// BlockDrive program ID (placeholder - would be actual deployed program)
const BLOCKDRIVE_PROGRAM_ID = new PublicKey('BLKDr1vE111111111111111111111111111111111111');

// Get Alchemy-configured Solana connection (Devnet for MVP)
const getConnection = () => new Connection(alchemyConfig.solanaRpcUrl, {
  commitment: 'confirmed',
});

export interface AlchemyTransactionSigner {
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  solanaAddress: string | null;
}

class NFTMembershipService {
  private connection: Connection;

  constructor() {
    this.connection = getConnection();
  }

  /**
   * Derive the membership PDA for a wallet
   */
  async deriveMembershipPDA(walletAddress: string): Promise<[PublicKey, number]> {
    const walletPubkey = new PublicKey(walletAddress);
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(MEMBERSHIP_SEED),
        walletPubkey.toBuffer(),
      ],
      BLOCKDRIVE_PROGRAM_ID
    );
  }

  /**
   * Generate a deterministic mint keypair for a user's tier
   * This ensures consistent mint addresses across sessions
   */
  private async generateDeterministicMintKeypair(
    walletAddress: string,
    tier: SubscriptionTier
  ): Promise<Keypair> {
    const seed = `blockdrive-membership-mint-${walletAddress}-${tier}-v1`;
    const encoder = new TextEncoder();
    const seedBytes = encoder.encode(seed);
    
    // Create ArrayBuffer for crypto.subtle
    const seedBuffer = new ArrayBuffer(seedBytes.length);
    const view = new Uint8Array(seedBuffer);
    view.set(seedBytes);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', seedBuffer);
    const hashBytes = new Uint8Array(hashBuffer);
    
    return Keypair.fromSeed(hashBytes);
  }

  /**
   * Verify membership validity for a wallet (using Alchemy embedded wallet address)
   * Checks if the wallet owns a valid BlockDrive membership NFT
   */
  async verifyMembership(walletAddress: string): Promise<MembershipVerification> {
    try {
      console.log('[NFTMembership] Verifying membership for Alchemy wallet:', walletAddress);

      // Check cached membership first
      const cachedMembership = this.getCachedMembership(walletAddress);
      
      if (cachedMembership) {
        const expired = isMembershipExpired(cachedMembership.metadata.validUntil);
        
        if (expired) {
          return {
            isValid: false,
            tier: cachedMembership.metadata.tier,
            expiresAt: cachedMembership.metadata.validUntil,
            daysRemaining: 0,
            storageRemaining: BigInt(0),
            bandwidthRemaining: BigInt(0),
            features: null,
            nftMint: cachedMembership.mint,
            error: 'Membership has expired',
          };
        }

        const tierConfig = TIER_CONFIGS[cachedMembership.metadata.tier];

        return {
          isValid: true,
          tier: cachedMembership.metadata.tier,
          expiresAt: cachedMembership.metadata.validUntil,
          daysRemaining: getDaysRemaining(cachedMembership.metadata.validUntil),
          storageRemaining: cachedMembership.metadata.storageQuota - cachedMembership.metadata.storageUsed,
          bandwidthRemaining: cachedMembership.metadata.bandwidthQuota - cachedMembership.metadata.bandwidthUsed,
          features: tierConfig.features,
          nftMint: cachedMembership.mint,
        };
      }

      // Try to verify on-chain Token-2022 ownership
      try {
        const walletPubkey = new PublicKey(walletAddress);
        
        // Check for each tier's token
        for (const tier of ['enterprise', 'premium', 'pro', 'basic'] as SubscriptionTier[]) {
          const mintKeypair = await this.generateDeterministicMintKeypair(walletAddress, tier);
          const ata = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            walletPubkey,
            false,
            TOKEN_2022_PROGRAM_ID
          );
          
          try {
            const tokenAccount = await this.connection.getTokenAccountBalance(ata);
            if (tokenAccount.value.uiAmount && tokenAccount.value.uiAmount > 0) {
              console.log('[NFTMembership] Found on-chain Token-2022 membership:', tier);
              // Found a membership token - return basic verification
              const tierConfig = TIER_CONFIGS[tier];
              return {
                isValid: true,
                tier,
                expiresAt: null, // Would need to read from metadata
                daysRemaining: -1,
                storageRemaining: gbToBytes(tierConfig.storageGB),
                bandwidthRemaining: gbToBytes(tierConfig.bandwidthGB),
                features: tierConfig.features,
                nftMint: mintKeypair.publicKey.toBase58(),
              };
            }
          } catch {
            // Token account doesn't exist, continue checking
          }
        }
      } catch (onChainError) {
        console.warn('[NFTMembership] On-chain verification failed:', onChainError);
      }

      // No membership found - return basic tier (free)
      return {
        isValid: true,
        tier: 'basic',
        expiresAt: null,
        daysRemaining: -1, // Unlimited for free tier
        storageRemaining: gbToBytes(TIER_CONFIGS.basic.storageGB),
        bandwidthRemaining: gbToBytes(TIER_CONFIGS.basic.bandwidthGB),
        features: TIER_CONFIGS.basic.features,
        nftMint: null,
      };

    } catch (error) {
      console.error('[NFTMembership] Verification failed:', error);
      return {
        isValid: false,
        tier: null,
        expiresAt: null,
        daysRemaining: 0,
        storageRemaining: BigInt(0),
        bandwidthRemaining: BigInt(0),
        features: null,
        nftMint: null,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Create a new membership NFT using Token-2022 with metadata extension
   * Transaction fees are covered by Alchemy Gas Manager on Devnet
   */
  async createMembership(
    request: MembershipPurchaseRequest,
    alchemySigner: AlchemyTransactionSigner
  ): Promise<MembershipPurchaseResult> {
    try {
      console.log('[NFTMembership] Creating Token-2022 membership NFT:', request);
      console.log('[NFTMembership] Network:', alchemyConfig.network);
      console.log('[NFTMembership] RPC:', alchemyConfig.solanaRpcUrl);

      if (!alchemySigner.solanaAddress) {
        throw new Error('Alchemy wallet not initialized');
      }

      const tierConfig = TIER_CONFIGS[request.tier];
      const walletPubkey = new PublicKey(alchemySigner.solanaAddress);
      
      // Calculate expiration based on billing period
      const now = Date.now();
      let validUntil: number;
      let price: number;
      
      switch (request.billingPeriod) {
        case 'quarterly':
          validUntil = now + (90 * 24 * 60 * 60 * 1000);
          price = tierConfig.quarterlyPrice;
          break;
        case 'annual':
          validUntil = now + (365 * 24 * 60 * 60 * 1000);
          price = tierConfig.annualPrice;
          break;
        default:
          validUntil = now + (30 * 24 * 60 * 60 * 1000);
          price = tierConfig.monthlyPrice;
      }

      // Generate deterministic mint keypair for this user/tier
      const mintKeypair = await this.generateDeterministicMintKeypair(
        alchemySigner.solanaAddress,
        request.tier
      );
      
      console.log('[NFTMembership] Mint address:', mintKeypair.publicKey.toBase58());

      // Create the Token-2022 metadata
      const tokenMetadata: TokenMetadata = {
        mint: mintKeypair.publicKey,
        name: `BlockDrive ${tierConfig.name} Membership`,
        symbol: tierConfig.nftSymbol,
        uri: tierConfig.nftUri,
        additionalMetadata: [
          ['tier', request.tier],
          ['validUntil', validUntil.toString()],
          ['storageGB', tierConfig.storageGB.toString()],
          ['bandwidthGB', tierConfig.bandwidthGB.toString()],
          ['createdAt', now.toString()],
        ],
      };

      // Calculate space needed for mint with metadata extension
      const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
      const metadataLen = pack(tokenMetadata).length;
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const lamports = await this.connection.getMinimumBalanceForRentExemption(
        mintLen + metadataExtension + metadataLen
      );

      console.log('[NFTMembership] Rent-exempt lamports:', lamports);
      console.log('[NFTMembership] Mint account size:', mintLen + metadataExtension + metadataLen);

      // Build the transaction with Token-2022 instructions
      const transaction = new Transaction();

      // 1. Create the mint account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: walletPubkey,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        })
      );

      // 2. Initialize metadata pointer extension
      transaction.add(
        createInitializeMetadataPointerInstruction(
          mintKeypair.publicKey,
          walletPubkey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      // 3. Initialize the mint (0 decimals for NFT, supply of 1)
      transaction.add(
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          0, // decimals (0 for NFT)
          walletPubkey, // mint authority
          walletPubkey, // freeze authority
          TOKEN_2022_PROGRAM_ID
        )
      );

      // 4. Initialize token metadata
      transaction.add(
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: mintKeypair.publicKey,
          metadata: mintKeypair.publicKey,
          name: tokenMetadata.name,
          symbol: tokenMetadata.symbol,
          uri: tokenMetadata.uri,
          mintAuthority: walletPubkey,
          updateAuthority: walletPubkey,
        })
      );

      // 5. Add custom metadata fields
      for (const [key, value] of tokenMetadata.additionalMetadata) {
        transaction.add(
          createUpdateFieldInstruction({
            programId: TOKEN_2022_PROGRAM_ID,
            metadata: mintKeypair.publicKey,
            updateAuthority: walletPubkey,
            field: key,
            value: value,
          })
        );
      }

      // 6. Create associated token account for the user
      const ata = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        walletPubkey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      transaction.add(
        createAssociatedTokenAccountInstruction(
          walletPubkey,
          ata,
          walletPubkey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );

      // 7. Mint 1 token to the user's ATA
      transaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          ata,
          walletPubkey,
          1, // amount (1 NFT)
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = walletPubkey;

      // Partially sign with the mint keypair (new account needs to sign)
      transaction.partialSign(mintKeypair);

      // Sign and send with Alchemy gas sponsorship
      console.log('[NFTMembership] Signing Token-2022 mint transaction...');
      console.log('[NFTMembership] Gas Sponsorship Policy:', alchemyConfig.policyId);
      
      const transactionSignature = await alchemySigner.signAndSendTransaction(transaction);
      
      console.log('[NFTMembership] Transaction submitted:', transactionSignature);
      console.log('[NFTMembership] Explorer: https://explorer.solana.com/tx/' + transactionSignature + '?cluster=devnet');

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature: transactionSignature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('[NFTMembership] Token-2022 NFT minted successfully!');
      console.log('[NFTMembership] Mint:', mintKeypair.publicKey.toBase58());
      console.log('[NFTMembership] ATA:', ata.toBase58());

      // Create membership metadata
      const metadata: MembershipMetadata = {
        tier: request.tier,
        validUntil,
        isActive: true,
        storageQuota: gbToBytes(tierConfig.storageGB),
        storageUsed: BigInt(0),
        bandwidthQuota: gbToBytes(tierConfig.bandwidthGB),
        bandwidthUsed: BigInt(0),
        features: tierConfig.features,
        autoRenew: request.autoRenew,
        renewalPrice: price * 100, // In cents
        createdAt: now,
        lastRenewedAt: now,
      };

      // Create membership NFT structure with real mint address
      const membershipNFT: MembershipNFT = {
        bump: 255,
        mint: mintKeypair.publicKey.toBase58(),
        owner: alchemySigner.solanaAddress,
        metadata,
        delegations: [],
      };

      // Cache the membership locally
      this.cacheMembership(alchemySigner.solanaAddress, membershipNFT);

      console.log('[NFTMembership] Membership created successfully with Token-2022');
      console.log('[NFTMembership] NFT Mint:', mintKeypair.publicKey.toBase58());
      console.log('[NFTMembership] Token Account:', ata.toBase58());

      return {
        success: true,
        transactionSignature,
        nftMint: mintKeypair.publicKey.toBase58(),
        expiresAt: validUntil,
      };

    } catch (error) {
      console.error('[NFTMembership] Token-2022 minting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create membership',
      };
    }
  }

  /**
   * Renew an existing membership using Alchemy gas sponsorship
   */
  async renewMembership(
    walletAddress: string,
    billingPeriod: 'monthly' | 'quarterly' | 'annual',
    alchemySigner: AlchemyTransactionSigner
  ): Promise<MembershipPurchaseResult> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    if (!cachedMembership) {
      return {
        success: false,
        error: 'No existing membership found',
      };
    }

    // For renewal, we update the metadata on-chain
    // For MVP, we'll mint a new token (in production, we'd update existing)
    const request: MembershipPurchaseRequest = {
      tier: cachedMembership.metadata.tier,
      billingPeriod,
      paymentMethod: 'crypto',
      walletAddress,
      autoRenew: cachedMembership.metadata.autoRenew,
    };

    return this.createMembership(request, alchemySigner);
  }

  /**
   * Upgrade membership to a higher tier using Alchemy gas sponsorship
   */
  async upgradeMembership(
    walletAddress: string,
    newTier: SubscriptionTier,
    alchemySigner: AlchemyTransactionSigner
  ): Promise<MembershipPurchaseResult> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    // Create upgrade request (mints new tier token)
    const request: MembershipPurchaseRequest = {
      tier: newTier,
      billingPeriod: 'monthly',
      paymentMethod: 'crypto',
      walletAddress,
      autoRenew: cachedMembership?.metadata.autoRenew ?? false,
    };

    return this.createMembership(request, alchemySigner);
  }

  /**
   * Update storage usage
   */
  async updateStorageUsage(
    walletAddress: string,
    bytesUsed: bigint
  ): Promise<boolean> {
    const cachedMembership = this.getCachedMembership(walletAddress);
    
    if (!cachedMembership) {
      return false;
    }

    cachedMembership.metadata.storageUsed = bytesUsed;
    this.cacheMembership(walletAddress, cachedMembership);
    
    return true;
  }

  /**
   * Get membership NFT display info
   */
  getMembershipDisplayInfo(tier: SubscriptionTier): {
    name: string;
    symbol: string;
    color: string;
    icon: string;
  } {
    const config = TIER_CONFIGS[tier];
    
    const colors: Record<SubscriptionTier, string> = {
      trial: 'emerald',
      basic: 'gray',
      pro: 'blue',
      premium: 'purple',
      enterprise: 'gold',
    };

    const icons: Record<SubscriptionTier, string> = {
      trial: '✨',
      basic: '🔵',
      pro: '💎',
      premium: '👑',
      enterprise: '🏆',
    };

    return {
      name: `BlockDrive ${config.name} Membership`,
      symbol: config.nftSymbol,
      color: colors[tier],
      icon: icons[tier],
    };
  }

  // ============= Private Helper Methods =============

  private getCachedMembership(walletAddress: string): MembershipNFT | null {
    try {
      const key = `blockdrive_membership_${walletAddress}`;
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);

      // Convert bigint strings back to bigints
      parsed.metadata.storageQuota = BigInt(parsed.metadata.storageQuota);
      parsed.metadata.storageUsed = BigInt(parsed.metadata.storageUsed);
      parsed.metadata.bandwidthQuota = BigInt(parsed.metadata.bandwidthQuota);
      parsed.metadata.bandwidthUsed = BigInt(parsed.metadata.bandwidthUsed);

      return parsed;
    } catch {
      return null;
    }
  }

  private cacheMembership(walletAddress: string, membership: MembershipNFT): void {
    try {
      const key = `blockdrive_membership_${walletAddress}`;

      // Convert bigints to strings for JSON serialization
      const serializable = {
        ...membership,
        metadata: {
          ...membership.metadata,
          storageQuota: membership.metadata.storageQuota.toString(),
          storageUsed: membership.metadata.storageUsed.toString(),
          bandwidthQuota: membership.metadata.bandwidthQuota.toString(),
          bandwidthUsed: membership.metadata.bandwidthUsed.toString(),
        },
      };

      localStorage.setItem(key, JSON.stringify(serializable));
    } catch (err) {
      console.warn('[NFTMembership] Failed to cache membership:', err);
    }
  }
}

// Export singleton instance
export const nftMembershipService = new NFTMembershipService();
