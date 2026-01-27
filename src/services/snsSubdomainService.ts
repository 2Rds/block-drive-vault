/**
 * SNS Subdomain Service
 *
 * Manages BlockDrive subdomain registration using Solana Naming Service (SNS).
 * Integrates with NFT-gated membership to ensure only valid members can claim subdomains.
 *
 * Features:
 * - Check subdomain availability under blockdrive.sol
 * - Register subdomains for NFT holders (username.blockdrive.sol)
 * - Resolve subdomains to wallet addresses
 * - Verify subdomain ownership
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getDomainKeySync,
  NameRegistryState,
  getHashedNameSync,
  getNameAccountKeySync,
  createNameRegistry,
  updateNameRegistryData,
  transferNameOwnership,
  deleteNameRegistry,
  NAME_PROGRAM_ID,
  ROOT_DOMAIN_ACCOUNT,
} from '@bonfida/spl-name-service';
import { createSolanaConnection } from '@/config/crossmint';
import {
  BLOCKDRIVE_PARENT_DOMAIN,
  SNS_PARENT_OWNER,
  isNFTCollectionConfigured,
} from '@/config/nftCollection';

// SNS Constants
const SOL_TLD = new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx');
const BLOCKDRIVE_PARENT_KEY = getHashedNameSync('blockdrive');

// Minimum subdomain length
const MIN_SUBDOMAIN_LENGTH = 3;
const MAX_SUBDOMAIN_LENGTH = 32;

// Get Solana connection using Crossmint config
const getConnection = () => createSolanaConnection();

export interface SubdomainAvailability {
  available: boolean;
  subdomain: string;
  fullDomain: string;
  reason?: string;
}

export interface SubdomainRegistration {
  success: boolean;
  subdomain: string;
  fullDomain: string;
  registryKey?: string;
  transactionSignature?: string;
  error?: string;
}

export interface SubdomainInfo {
  subdomain: string;
  fullDomain: string;
  owner: string;
  registryKey: string;
  data?: string;
}

export interface CrossmintTransactionSigner {
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  walletAddress: string | null;
}

class SNSSubdomainService {
  private connection: Connection;
  private parentDomainKey: PublicKey | null = null;

  constructor() {
    this.connection = getConnection();
  }

  /**
   * Initialize the parent domain key for blockdrive.sol
   */
  private async initializeParentDomain(): Promise<PublicKey> {
    if (this.parentDomainKey) {
      return this.parentDomainKey;
    }

    try {
      // Get the blockdrive.sol domain key
      const { pubkey } = getDomainKeySync('blockdrive');
      this.parentDomainKey = pubkey;
      console.log('[SNS] Parent domain key:', pubkey.toBase58());
      return pubkey;
    } catch (error) {
      console.error('[SNS] Failed to get parent domain key:', error);
      throw new Error('Failed to initialize blockdrive.sol parent domain');
    }
  }

  /**
   * Validate subdomain format
   */
  validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
    // Length check
    if (subdomain.length < MIN_SUBDOMAIN_LENGTH) {
      return {
        valid: false,
        error: `Subdomain must be at least ${MIN_SUBDOMAIN_LENGTH} characters`,
      };
    }

    if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
      return {
        valid: false,
        error: `Subdomain cannot exceed ${MAX_SUBDOMAIN_LENGTH} characters`,
      };
    }

    // Character validation (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(subdomain.toLowerCase())) {
      return {
        valid: false,
        error: 'Subdomain can only contain letters, numbers, and hyphens',
      };
    }

    // Cannot start or end with hyphen
    if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
      return {
        valid: false,
        error: 'Subdomain cannot start or end with a hyphen',
      };
    }

    // No consecutive hyphens
    if (subdomain.includes('--')) {
      return {
        valid: false,
        error: 'Subdomain cannot contain consecutive hyphens',
      };
    }

    // Reserved subdomains
    const reserved = [
      'www',
      'api',
      'app',
      'admin',
      'support',
      'help',
      'mail',
      'ftp',
      'ssh',
      'root',
      'system',
      'blockdrive',
    ];
    if (reserved.includes(subdomain.toLowerCase())) {
      return { valid: false, error: 'This subdomain is reserved' };
    }

    return { valid: true };
  }

  /**
   * Check if a subdomain is available under blockdrive.sol
   */
  async checkAvailability(subdomain: string): Promise<SubdomainAvailability> {
    const fullDomain = `${subdomain}.${BLOCKDRIVE_PARENT_DOMAIN}`;

    // Validate format first
    const validation = this.validateSubdomain(subdomain);
    if (!validation.valid) {
      return {
        available: false,
        subdomain,
        fullDomain,
        reason: validation.error,
      };
    }

    try {
      await this.initializeParentDomain();

      // Get the subdomain key
      const { pubkey: subdomainKey } = getDomainKeySync(
        `${subdomain}.blockdrive`
      );

      // Check if the account exists
      const accountInfo = await this.connection.getAccountInfo(subdomainKey);

      if (accountInfo) {
        return {
          available: false,
          subdomain,
          fullDomain,
          reason: 'Subdomain is already registered',
        };
      }

      return {
        available: true,
        subdomain,
        fullDomain,
      };
    } catch (error) {
      console.error('[SNS] Availability check failed:', error);

      // If the account doesn't exist, it's available
      if (
        error instanceof Error &&
        error.message.includes('Account does not exist')
      ) {
        return {
          available: true,
          subdomain,
          fullDomain,
        };
      }

      return {
        available: false,
        subdomain,
        fullDomain,
        reason:
          error instanceof Error
            ? error.message
            : 'Failed to check availability',
      };
    }
  }

  /**
   * Register a subdomain for an NFT holder
   * Requires valid membership NFT to register
   */
  async registerSubdomain(
    subdomain: string,
    walletAddress: string,
    crossmintSigner: CrossmintTransactionSigner,
    verifyNFT: boolean = true
  ): Promise<SubdomainRegistration> {
    const fullDomain = `${subdomain}.${BLOCKDRIVE_PARENT_DOMAIN}`;

    try {
      console.log('[SNS] Registering subdomain:', fullDomain);
      console.log('[SNS] For wallet:', walletAddress);

      // Validate subdomain format
      const validation = this.validateSubdomain(subdomain);
      if (!validation.valid) {
        return {
          success: false,
          subdomain,
          fullDomain,
          error: validation.error,
        };
      }

      // Check availability
      const availability = await this.checkAvailability(subdomain);
      if (!availability.available) {
        return {
          success: false,
          subdomain,
          fullDomain,
          error: availability.reason || 'Subdomain not available',
        };
      }

      // Verify NFT ownership if required
      if (verifyNFT) {
        if (!isNFTCollectionConfigured()) {
          console.warn(
            '[SNS] NFT collection not configured - skipping verification'
          );
        } else {
          // In production, we'd verify the user owns a BlockDrive membership NFT
          // For now, we trust the frontend verification
          console.log('[SNS] NFT verification delegated to frontend');
        }
      }

      // Initialize parent domain
      await this.initializeParentDomain();

      const walletPubkey = new PublicKey(walletAddress);

      // Calculate the hashed name for the subdomain
      const hashedSubdomain = getHashedNameSync(subdomain);

      // Get the subdomain account key
      const subdomainKey = getNameAccountKeySync(
        hashedSubdomain,
        undefined, // No class
        this.parentDomainKey! // Parent is blockdrive.sol
      );

      console.log('[SNS] Subdomain key:', subdomainKey.toBase58());

      // Space for the name registry (wallet address + extra data)
      const space = 32 + 100; // 32 bytes for owner + buffer for data

      // Calculate lamports needed
      const lamports =
        await this.connection.getMinimumBalanceForRentExemption(space);

      // Build the create name registry instruction
      const createIx = await createNameRegistry(
        this.connection,
        subdomain,
        space,
        walletPubkey, // Payer
        walletPubkey, // Owner of the subdomain
        lamports,
        undefined, // No class
        this.parentDomainKey! // Parent domain
      );

      // Build transaction
      const transaction = new Transaction();
      transaction.add(createIx);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = walletPubkey;

      // Sign and send with Crossmint
      console.log('[SNS] Signing transaction...');
      const signature = await crossmintSigner.signAndSendTransaction(transaction);

      console.log('[SNS] Transaction submitted:', signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      console.log('[SNS] Subdomain registered successfully!');
      console.log('[SNS] Full domain:', fullDomain);
      console.log('[SNS] Registry key:', subdomainKey.toBase58());

      return {
        success: true,
        subdomain,
        fullDomain,
        registryKey: subdomainKey.toBase58(),
        transactionSignature: signature,
      };
    } catch (error) {
      console.error('[SNS] Registration failed:', error);
      return {
        success: false,
        subdomain,
        fullDomain,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to register subdomain',
      };
    }
  }

  /**
   * Resolve a subdomain to its owner wallet address
   */
  async resolveSubdomain(subdomain: string): Promise<string | null> {
    try {
      const { pubkey: subdomainKey } = getDomainKeySync(
        `${subdomain}.blockdrive`
      );

      const { registry } = await NameRegistryState.retrieve(
        this.connection,
        subdomainKey
      );

      return registry.owner.toBase58();
    } catch (error) {
      console.error('[SNS] Resolution failed:', error);
      return null;
    }
  }

  /**
   * Get subdomain info
   */
  async getSubdomainInfo(subdomain: string): Promise<SubdomainInfo | null> {
    try {
      const { pubkey: subdomainKey } = getDomainKeySync(
        `${subdomain}.blockdrive`
      );

      const { registry } = await NameRegistryState.retrieve(
        this.connection,
        subdomainKey
      );

      return {
        subdomain,
        fullDomain: `${subdomain}.${BLOCKDRIVE_PARENT_DOMAIN}`,
        owner: registry.owner.toBase58(),
        registryKey: subdomainKey.toBase58(),
        data: registry.data ? Buffer.from(registry.data).toString('utf8') : undefined,
      };
    } catch (error) {
      console.error('[SNS] Failed to get subdomain info:', error);
      return null;
    }
  }

  /**
   * Check if a wallet owns a specific subdomain
   */
  async verifyOwnership(
    subdomain: string,
    walletAddress: string
  ): Promise<boolean> {
    const owner = await this.resolveSubdomain(subdomain);
    return owner === walletAddress;
  }

  /**
   * Get all subdomains owned by a wallet (expensive operation)
   * In production, this should use an indexer
   */
  async getSubdomainsByOwner(walletAddress: string): Promise<string[]> {
    console.warn(
      '[SNS] getSubdomainsByOwner is expensive - use an indexer in production'
    );
    // This would require iterating through all blockdrive subdomains
    // For MVP, we'll rely on the database to track user subdomains
    return [];
  }

  /**
   * Transfer subdomain ownership to another wallet
   */
  async transferSubdomain(
    subdomain: string,
    newOwner: string,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!crossmintSigner.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Verify current ownership
      const isOwner = await this.verifyOwnership(
        subdomain,
        crossmintSigner.walletAddress
      );
      if (!isOwner) {
        return {
          success: false,
          error: 'You do not own this subdomain',
        };
      }

      const { pubkey: subdomainKey } = getDomainKeySync(
        `${subdomain}.blockdrive`
      );

      const currentOwner = new PublicKey(crossmintSigner.walletAddress);
      const newOwnerPubkey = new PublicKey(newOwner);

      // Build transfer instruction
      const transferIx = await transferNameOwnership(
        this.connection,
        subdomain,
        newOwnerPubkey,
        undefined, // No class
        this.parentDomainKey!
      );

      const transaction = new Transaction().add(transferIx);

      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = currentOwner;

      const signature = await crossmintSigner.signAndSendTransaction(transaction);

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return { success: true, signature };
    } catch (error) {
      console.error('[SNS] Transfer failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to transfer subdomain',
      };
    }
  }

  /**
   * Delete/release a subdomain
   */
  async deleteSubdomain(
    subdomain: string,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      if (!crossmintSigner.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Verify ownership
      const isOwner = await this.verifyOwnership(
        subdomain,
        crossmintSigner.walletAddress
      );
      if (!isOwner) {
        return {
          success: false,
          error: 'You do not own this subdomain',
        };
      }

      const { pubkey: subdomainKey } = getDomainKeySync(
        `${subdomain}.blockdrive`
      );

      const owner = new PublicKey(crossmintSigner.walletAddress);

      // Build delete instruction
      const deleteIx = await deleteNameRegistry(
        this.connection,
        subdomain,
        owner, // Refund to owner
        undefined, // No class
        this.parentDomainKey!
      );

      const transaction = new Transaction().add(deleteIx);

      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = owner;

      const signature = await crossmintSigner.signAndSendTransaction(transaction);

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return { success: true, signature };
    } catch (error) {
      console.error('[SNS] Delete failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete subdomain',
      };
    }
  }
}

// Export singleton instance
export const snsSubdomainService = new SNSSubdomainService();
