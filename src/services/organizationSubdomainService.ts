/**
 * Organization Subdomain Service
 *
 * Manages hierarchical subdomain registration for organizations on Solana Name Service (SNS).
 *
 * Domain Hierarchy:
 * - blockdrive.sol (root - owned by BlockDrive)
 *   ├── acme.blockdrive.sol (organization subdomain)
 *   │   ├── alice.acme.blockdrive.sol (user in org)
 *   │   └── bob.acme.blockdrive.sol (user in org)
 *   ├── demo.blockdrive.sol (individual user)
 *   └── john.blockdrive.sol (individual user)
 *
 * This service extends the base SNS service to support nested organization subdomains.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  getDomainKeySync,
  NameRegistryState,
  getHashedNameSync,
  getNameAccountKeySync,
  createNameRegistry,
} from '@bonfida/spl-name-service';
import { createSolanaConnection } from '@/config/crossmint';
import { BLOCKDRIVE_PARENT_DOMAIN } from '@/config/nftCollection';

// Minimum subdomain length
const MIN_ORG_SUBDOMAIN_LENGTH = 2;
const MAX_ORG_SUBDOMAIN_LENGTH = 20;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;

// Reserved organization subdomains
const RESERVED_ORG_SUBDOMAINS = [
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
  'official',
  'team',
  'org',
  'enterprise',
  'business',
];

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

export interface CrossmintTransactionSigner {
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
  walletAddress: string | null;
}

class OrganizationSubdomainService {
  private connection: Connection;

  constructor() {
    this.connection = createSolanaConnection();
  }

  /**
   * Validate organization subdomain format
   */
  validateOrgSubdomain(subdomain: string): { valid: boolean; error?: string } {
    // Length check
    if (subdomain.length < MIN_ORG_SUBDOMAIN_LENGTH) {
      return {
        valid: false,
        error: `Organization subdomain must be at least ${MIN_ORG_SUBDOMAIN_LENGTH} characters`,
      };
    }

    if (subdomain.length > MAX_ORG_SUBDOMAIN_LENGTH) {
      return {
        valid: false,
        error: `Organization subdomain cannot exceed ${MAX_ORG_SUBDOMAIN_LENGTH} characters`,
      };
    }

    // Character validation (alphanumeric only, no hyphens for org subdomains)
    if (!/^[a-z0-9]+$/.test(subdomain.toLowerCase())) {
      return {
        valid: false,
        error: 'Organization subdomain can only contain letters and numbers',
      };
    }

    // Reserved subdomains
    if (RESERVED_ORG_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return { valid: false, error: 'This organization subdomain is reserved' };
    }

    return { valid: true };
  }

  /**
   * Validate username for organization subdomain
   */
  validateOrgUsername(username: string): { valid: boolean; error?: string } {
    if (username.length < MIN_USERNAME_LENGTH) {
      return {
        valid: false,
        error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
      };
    }

    if (username.length > MAX_USERNAME_LENGTH) {
      return {
        valid: false,
        error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters`,
      };
    }

    // Allow alphanumeric and underscores
    if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, and underscores',
      };
    }

    return { valid: true };
  }

  /**
   * Build the full domain string for an organization user
   * @param username The user's username (e.g., "alice")
   * @param orgSubdomain The organization's subdomain (e.g., "acme")
   * @returns Full domain string (e.g., "alice.acme.blockdrive.sol")
   */
  buildOrgUserDomain(username: string, orgSubdomain: string): string {
    return `${username.toLowerCase()}.${orgSubdomain.toLowerCase()}.${BLOCKDRIVE_PARENT_DOMAIN}`;
  }

  /**
   * Build the full domain string for an organization
   * @param orgSubdomain The organization's subdomain (e.g., "acme")
   * @returns Full domain string (e.g., "acme.blockdrive.sol")
   */
  buildOrgDomain(orgSubdomain: string): string {
    return `${orgSubdomain.toLowerCase()}.${BLOCKDRIVE_PARENT_DOMAIN}`;
  }

  /**
   * Get the SNS domain key path for nested subdomains
   * For alice.acme.blockdrive.sol, the path is "alice.acme.blockdrive"
   */
  private getNestedDomainPath(username: string, orgSubdomain: string): string {
    return `${username.toLowerCase()}.${orgSubdomain.toLowerCase()}.blockdrive`;
  }

  /**
   * Get the SNS domain key path for organization subdomains
   * For acme.blockdrive.sol, the path is "acme.blockdrive"
   */
  private getOrgDomainPath(orgSubdomain: string): string {
    return `${orgSubdomain.toLowerCase()}.blockdrive`;
  }

  /**
   * Check if an organization subdomain is available
   */
  async checkOrgSubdomainAvailability(orgSubdomain: string): Promise<SubdomainAvailability> {
    const fullDomain = this.buildOrgDomain(orgSubdomain);

    // Validate format first
    const validation = this.validateOrgSubdomain(orgSubdomain);
    if (!validation.valid) {
      return {
        available: false,
        subdomain: orgSubdomain,
        fullDomain,
        reason: validation.error,
      };
    }

    try {
      const domainPath = this.getOrgDomainPath(orgSubdomain);
      const { pubkey: domainKey } = getDomainKeySync(domainPath);

      // Check if the account exists
      const accountInfo = await this.connection.getAccountInfo(domainKey);

      if (accountInfo) {
        return {
          available: false,
          subdomain: orgSubdomain,
          fullDomain,
          reason: 'Organization subdomain is already registered',
        };
      }

      return {
        available: true,
        subdomain: orgSubdomain,
        fullDomain,
      };
    } catch (error) {
      console.error('[OrgSubdomain] Availability check failed:', error);

      // If the account doesn't exist, it's available
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        return {
          available: true,
          subdomain: orgSubdomain,
          fullDomain,
        };
      }

      return {
        available: false,
        subdomain: orgSubdomain,
        fullDomain,
        reason: error instanceof Error ? error.message : 'Failed to check availability',
      };
    }
  }

  /**
   * Check if a user subdomain under an organization is available
   */
  async checkUserOrgSubdomainAvailability(
    username: string,
    orgSubdomain: string
  ): Promise<SubdomainAvailability> {
    const fullDomain = this.buildOrgUserDomain(username, orgSubdomain);

    // Validate username format
    const usernameValidation = this.validateOrgUsername(username);
    if (!usernameValidation.valid) {
      return {
        available: false,
        subdomain: username,
        fullDomain,
        reason: usernameValidation.error,
      };
    }

    try {
      const domainPath = this.getNestedDomainPath(username, orgSubdomain);
      const { pubkey: domainKey } = getDomainKeySync(domainPath);

      // Check if the account exists
      const accountInfo = await this.connection.getAccountInfo(domainKey);

      if (accountInfo) {
        return {
          available: false,
          subdomain: username,
          fullDomain,
          reason: 'Username is already taken in this organization',
        };
      }

      return {
        available: true,
        subdomain: username,
        fullDomain,
      };
    } catch (error) {
      console.error('[OrgSubdomain] User availability check failed:', error);

      if (error instanceof Error && error.message.includes('Account does not exist')) {
        return {
          available: true,
          subdomain: username,
          fullDomain,
        };
      }

      return {
        available: false,
        subdomain: username,
        fullDomain,
        reason: error instanceof Error ? error.message : 'Failed to check availability',
      };
    }
  }

  /**
   * Register an organization's root subdomain (e.g., acme.blockdrive.sol)
   *
   * This creates the parent domain that user subdomains will be registered under.
   * Should be called when an organization is first created.
   */
  async registerOrgSubdomain(
    orgSubdomain: string,
    ownerWalletAddress: string,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<SubdomainRegistration> {
    const fullDomain = this.buildOrgDomain(orgSubdomain);

    try {
      console.log('[OrgSubdomain] Registering org subdomain:', fullDomain);
      console.log('[OrgSubdomain] Owner wallet:', ownerWalletAddress);

      // Validate subdomain format
      const validation = this.validateOrgSubdomain(orgSubdomain);
      if (!validation.valid) {
        return {
          success: false,
          subdomain: orgSubdomain,
          fullDomain,
          error: validation.error,
        };
      }

      // Check availability
      const availability = await this.checkOrgSubdomainAvailability(orgSubdomain);
      if (!availability.available) {
        return {
          success: false,
          subdomain: orgSubdomain,
          fullDomain,
          error: availability.reason || 'Subdomain not available',
        };
      }

      // Get the blockdrive.sol parent domain key
      const { pubkey: blockdriveKey } = getDomainKeySync('blockdrive');

      const walletPubkey = new PublicKey(ownerWalletAddress);

      // Calculate the hashed name for the org subdomain
      const hashedSubdomain = getHashedNameSync(orgSubdomain.toLowerCase());

      // Get the subdomain account key
      const subdomainKey = getNameAccountKeySync(
        hashedSubdomain,
        undefined, // No class
        blockdriveKey // Parent is blockdrive.sol
      );

      console.log('[OrgSubdomain] Org subdomain key:', subdomainKey.toBase58());

      // Space for the name registry
      const space = 32 + 100; // 32 bytes for owner + buffer

      // Calculate lamports needed
      const lamports = await this.connection.getMinimumBalanceForRentExemption(space);

      // Build the create name registry instruction
      const createIx = await createNameRegistry(
        this.connection,
        orgSubdomain.toLowerCase(),
        space,
        walletPubkey, // Payer
        walletPubkey, // Owner of the subdomain
        lamports,
        undefined, // No class
        blockdriveKey // Parent domain
      );

      // Build transaction
      const transaction = new Transaction();
      transaction.add(createIx);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = walletPubkey;

      // Sign and send with Crossmint
      console.log('[OrgSubdomain] Signing transaction...');
      const signature = await crossmintSigner.signAndSendTransaction(transaction);

      console.log('[OrgSubdomain] Transaction submitted:', signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('[OrgSubdomain] Org subdomain registered successfully!');

      return {
        success: true,
        subdomain: orgSubdomain,
        fullDomain,
        registryKey: subdomainKey.toBase58(),
        transactionSignature: signature,
      };
    } catch (error) {
      console.error('[OrgSubdomain] Registration failed:', error);
      return {
        success: false,
        subdomain: orgSubdomain,
        fullDomain,
        error: error instanceof Error ? error.message : 'Failed to register org subdomain',
      };
    }
  }

  /**
   * Register a user subdomain under an organization (e.g., alice.acme.blockdrive.sol)
   *
   * This requires the organization subdomain to already exist.
   */
  async registerUserOrgSubdomain(
    username: string,
    orgSubdomain: string,
    userWalletAddress: string,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<SubdomainRegistration> {
    const fullDomain = this.buildOrgUserDomain(username, orgSubdomain);

    try {
      console.log('[OrgSubdomain] Registering user subdomain:', fullDomain);
      console.log('[OrgSubdomain] User wallet:', userWalletAddress);

      // Validate username format
      const validation = this.validateOrgUsername(username);
      if (!validation.valid) {
        return {
          success: false,
          subdomain: username,
          fullDomain,
          error: validation.error,
        };
      }

      // Check availability
      const availability = await this.checkUserOrgSubdomainAvailability(username, orgSubdomain);
      if (!availability.available) {
        return {
          success: false,
          subdomain: username,
          fullDomain,
          error: availability.reason || 'Username not available',
        };
      }

      // Get the organization's parent domain key (acme.blockdrive)
      const orgDomainPath = this.getOrgDomainPath(orgSubdomain);
      const { pubkey: orgDomainKey } = getDomainKeySync(orgDomainPath);

      // Verify the org domain exists
      const orgAccountInfo = await this.connection.getAccountInfo(orgDomainKey);
      if (!orgAccountInfo) {
        return {
          success: false,
          subdomain: username,
          fullDomain,
          error: `Organization subdomain ${orgSubdomain}.blockdrive.sol does not exist`,
        };
      }

      const walletPubkey = new PublicKey(userWalletAddress);

      // Calculate the hashed name for the username
      const hashedUsername = getHashedNameSync(username.toLowerCase());

      // Get the user subdomain account key (child of org domain)
      const userSubdomainKey = getNameAccountKeySync(
        hashedUsername,
        undefined, // No class
        orgDomainKey // Parent is the org domain (acme.blockdrive)
      );

      console.log('[OrgSubdomain] User subdomain key:', userSubdomainKey.toBase58());

      // Space for the name registry
      const space = 32 + 100;

      // Calculate lamports needed
      const lamports = await this.connection.getMinimumBalanceForRentExemption(space);

      // Build the create name registry instruction
      const createIx = await createNameRegistry(
        this.connection,
        username.toLowerCase(),
        space,
        walletPubkey, // Payer
        walletPubkey, // Owner of the subdomain
        lamports,
        undefined, // No class
        orgDomainKey // Parent is the org domain
      );

      // Build transaction
      const transaction = new Transaction();
      transaction.add(createIx);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = walletPubkey;

      // Sign and send with Crossmint
      console.log('[OrgSubdomain] Signing transaction...');
      const signature = await crossmintSigner.signAndSendTransaction(transaction);

      console.log('[OrgSubdomain] Transaction submitted:', signature);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('[OrgSubdomain] User subdomain registered successfully!');

      return {
        success: true,
        subdomain: username,
        fullDomain,
        registryKey: userSubdomainKey.toBase58(),
        transactionSignature: signature,
      };
    } catch (error) {
      console.error('[OrgSubdomain] User registration failed:', error);
      return {
        success: false,
        subdomain: username,
        fullDomain,
        error: error instanceof Error ? error.message : 'Failed to register user subdomain',
      };
    }
  }

  /**
   * Resolve a user's org subdomain to their wallet address
   */
  async resolveUserOrgSubdomain(username: string, orgSubdomain: string): Promise<string | null> {
    try {
      const domainPath = this.getNestedDomainPath(username, orgSubdomain);
      const { pubkey: domainKey } = getDomainKeySync(domainPath);

      const { registry } = await NameRegistryState.retrieve(this.connection, domainKey);

      return registry.owner.toBase58();
    } catch (error) {
      console.error('[OrgSubdomain] Resolution failed:', error);
      return null;
    }
  }

  /**
   * Resolve an organization's subdomain to its owner wallet address
   */
  async resolveOrgSubdomain(orgSubdomain: string): Promise<string | null> {
    try {
      const domainPath = this.getOrgDomainPath(orgSubdomain);
      const { pubkey: domainKey } = getDomainKeySync(domainPath);

      const { registry } = await NameRegistryState.retrieve(this.connection, domainKey);

      return registry.owner.toBase58();
    } catch (error) {
      console.error('[OrgSubdomain] Org resolution failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const organizationSubdomainService = new OrganizationSubdomainService();
