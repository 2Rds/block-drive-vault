/**
 * Alchemy Account Kit Configuration for BlockDrive
 * 
 * Configures embedded Solana smart wallets with Clerk OIDC authentication
 * and gas sponsorship for transaction fees.
 */

import { Connection } from '@solana/web3.js';

// Environment configuration
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || '';
const ALCHEMY_POLICY_ID = import.meta.env.VITE_ALCHEMY_POLICY_ID || '';

// Solana RPC endpoints via Alchemy
const SOLANA_MAINNET_RPC = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const SOLANA_DEVNET_RPC = `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Use devnet for development, mainnet for production
const isProduction = import.meta.env.PROD;
const SOLANA_RPC_URL = isProduction ? SOLANA_MAINNET_RPC : SOLANA_DEVNET_RPC;

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
}

export const alchemyConfig: AlchemyConfig = {
  apiKey: ALCHEMY_API_KEY,
  policyId: ALCHEMY_POLICY_ID,
  solanaRpcUrl: SOLANA_RPC_URL,
  clerkIssuerUrl: CLERK_ISSUER_URL,
  isProduction,
};

/**
 * Create a Solana connection using Alchemy's RPC
 */
export function createAlchemySolanaConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, {
    commitment: 'confirmed',
    wsEndpoint: isProduction 
      ? 'wss://api.mainnet.solana.com' 
      : 'wss://api.devnet.solana.com',
  });
}

/**
 * Validate that all required Alchemy configuration is present
 */
export function validateAlchemyConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!ALCHEMY_API_KEY) {
    missing.push('VITE_ALCHEMY_API_KEY');
  }
  
  if (!ALCHEMY_POLICY_ID) {
    missing.push('VITE_ALCHEMY_POLICY_ID');
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
