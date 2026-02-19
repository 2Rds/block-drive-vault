/**
 * Dynamic.xyz Configuration for BlockDrive
 *
 * Fireblocks TSS-MPC embedded wallets + Global Identity (ENS).
 */

import { Connection } from '@solana/web3.js';

// Environment
const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || '';
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

export const dynamicConfig = {
  environmentId: DYNAMIC_ENVIRONMENT_ID,
  solanaRpcUrl: SOLANA_RPC_URL,
} as const;

/**
 * Validate Dynamic configuration
 */
export function validateDynamicConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!DYNAMIC_ENVIRONMENT_ID) missing.push('VITE_DYNAMIC_ENVIRONMENT_ID');
  return { valid: missing.length === 0, missing };
}

/**
 * Create a Solana connection
 */
export function createSolanaConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, {
    commitment: 'confirmed',
  });
}

export default dynamicConfig;
