/**
 * Alchemy Account Kit Configuration for BlockDrive
 * 
 * Configures embedded Solana smart wallets with Clerk OIDC authentication
 * and gas sponsorship for transaction fees.
 * 
 * MVP Configuration: Solana Devnet only
 */

import { Connection } from '@solana/web3.js';

// Hardcoded Alchemy Solana Devnet RPC for MVP
const ALCHEMY_DEVNET_RPC = 'https://solana-devnet.g.alchemy.com/v2/RRZ6SsTGQpak0qtwGve5F';

// Gas sponsorship policy ID
const ALCHEMY_POLICY_ID = 'b54fccd1-b3c0-44e8-8933-1331daa4f0a8';

// API Key (extracted from RPC URL for SDK use)
const ALCHEMY_API_KEY = 'RRZ6SsTGQpak0qtwGve5F';

// Force devnet for MVP
const SOLANA_RPC_URL = ALCHEMY_DEVNET_RPC;
const isProduction = false; // MVP is devnet only

// Clerk OIDC issuer URL for JWT validation
const CLERK_ISSUER_URL = 'https://good-squirrel-87.clerk.accounts.dev/';

/**
 * Alchemy configuration for the Account Kit
 */
export interface AlchemyConfig {
  apiKey: string;
  policyId: string;
  solanaRpcUrl: string;
  clerkIssuerUrl: string;
  isProduction: boolean;
  network: 'devnet' | 'mainnet';
}

export const alchemyConfig: AlchemyConfig = {
  apiKey: ALCHEMY_API_KEY,
  policyId: ALCHEMY_POLICY_ID,
  solanaRpcUrl: SOLANA_RPC_URL,
  clerkIssuerUrl: CLERK_ISSUER_URL,
  isProduction,
  network: 'devnet',
};

/**
 * Create a Solana connection using Alchemy's RPC
 */
export function createAlchemySolanaConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, {
    commitment: 'confirmed',
    wsEndpoint: 'wss://api.devnet.solana.com',
  });
}

/**
 * Validate that all required Alchemy configuration is present
 */
export function validateAlchemyConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // For MVP, all config is hardcoded so always valid
  if (!ALCHEMY_API_KEY) {
    missing.push('ALCHEMY_API_KEY');
  }
  
  if (!ALCHEMY_POLICY_ID) {
    missing.push('ALCHEMY_POLICY_ID');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get the Alchemy Signer configuration for OIDC auth
 */
export function getAlchemySignerConfig(clerkSessionToken: string) {
  return {
    orgId: ALCHEMY_API_KEY,
    authMethod: {
      type: 'oidc' as const,
      token: clerkSessionToken,
      idToken: clerkSessionToken,
    },
    policyId: ALCHEMY_POLICY_ID,
  };
}

export default alchemyConfig;
