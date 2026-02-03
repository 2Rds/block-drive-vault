/**
 * Crossmint Configuration for BlockDrive
 *
 * Configures multichain embedded wallets with Clerk authentication
 * and automatic wallet creation on signup.
 */

import { Connection } from '@solana/web3.js';

// Environment
const CROSSMINT_CLIENT_API_KEY = import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY || '';
const CROSSMINT_ENVIRONMENT = import.meta.env.VITE_CROSSMINT_ENVIRONMENT || 'staging';

// Supabase URL for API calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// Solana RPC URL (use public devnet for now, can be configured)
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Supported chains for BlockDrive
export const SUPPORTED_CHAINS = {
  // Solana networks
  solana: {
    devnet: 'solana:devnet',
    mainnet: 'solana:mainnet',
  },
  // EVM networks
  evm: {
    ethereum: 'ethereum',
    base: 'base',
    polygon: 'polygon',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
  }
} as const;

// Default chain configuration
export const DEFAULT_CHAIN_CONFIG = {
  primary: SUPPORTED_CHAINS.solana.devnet,  // Start with Solana devnet
  secondary: [
    SUPPORTED_CHAINS.evm.base,              // Base for low-cost EVM operations
  ],
};

/**
 * Crossmint provider configuration
 */
export interface CrossmintConfig {
  apiKey: string;
  environment: 'staging' | 'production';
  chains: {
    primary: string;
    secondary: string[];
  };
  supabaseUrl: string;
  solanaRpcUrl: string;
}

export const crossmintConfig: CrossmintConfig = {
  apiKey: CROSSMINT_CLIENT_API_KEY,
  environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
  chains: DEFAULT_CHAIN_CONFIG,
  supabaseUrl: SUPABASE_URL,
  solanaRpcUrl: SOLANA_RPC_URL,
};

/**
 * Get the appropriate chain identifier based on environment
 * Note: For Crossmint Smart Wallets, use "solana" (not "solana:devnet")
 * The network is determined by the Crossmint project settings (staging vs production)
 */
export function getCurrentChain(): string {
  // Crossmint Smart Wallets use "solana" as the chain identifier
  // The actual network (devnet/mainnet) is determined by your Crossmint project environment
  return 'solana';
}

/**
 * Validate Crossmint configuration
 */
export function validateCrossmintConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!CROSSMINT_CLIENT_API_KEY) {
    missing.push('VITE_CROSSMINT_CLIENT_API_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Crossmint SDK v1.9.x wallet configuration
 * @see https://docs.crossmint.com/wallets/embedded/react
 */
export interface CrossmintWalletConfig {
  createOnLogin: {
    type: 'email' | 'passkey';
    linkedUser: string;
  };
  defaultChain: string;
}

/**
 * Create wallet configuration for automatic creation on login
 * Uses Crossmint SDK v1.9.x format
 */
export function getWalletCreationConfig(userEmail: string): CrossmintWalletConfig {
  return {
    createOnLogin: {
      type: 'email',
      linkedUser: userEmail,
    },
    defaultChain: getCurrentChain(),
  };
}

/**
 * Create a Solana connection
 */
export function createSolanaConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, {
    commitment: 'confirmed',
    wsEndpoint: crossmintConfig.environment === 'production'
      ? 'wss://api.mainnet-beta.solana.com'
      : 'wss://api.devnet.solana.com',
  });
}

export default crossmintConfig;
