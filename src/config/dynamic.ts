/**
 * Dynamic.xyz Configuration for BlockDrive
 *
 * Fireblocks TSS-MPC embedded wallets + Global Identity (ENS).
 * Dual-chain: Solana (SNS, cNFTs, files) + EVM/Base (USDC subscriptions, Aave yield, ENS).
 */

import { Connection } from '@solana/web3.js';

// Environment
const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || '';
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BASE_RPC_URL = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org';

export const dynamicConfig = {
  environmentId: DYNAMIC_ENVIRONMENT_ID,

  // App branding
  appName: 'BlockDrive',
  appLogoUrl: '/logo.svg',

  // Auth cookie domain — enables auth.blockdrive.co cookie propagation
  cookieDomain: '.blockdrive.co',

  // Global Wallet — cross-app ecosystem
  globalWalletDomain: 'wallet.blockdrive.co',

  // Solana
  solanaRpcUrl: SOLANA_RPC_URL,

  // EVM — Base chain for USDC subscriptions, Aave yield, ENS
  baseChainId: 8453 as const,
  baseRpcUrl: BASE_RPC_URL,

  // Treasury addresses
  treasurySolana: 'FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3',
  treasuryEvm: import.meta.env.VITE_TREASURY_EVM_ADDRESS || '',

  // Subscription processor — CDP server wallet that has USDC.approve() from users
  subscriptionProcessorAddress: import.meta.env.VITE_SUBSCRIPTION_PROCESSOR_ADDRESS || '',

  // ENS parent domain for Namestone subdomains
  ensParentDomain: 'blockdrive.eth',

  // USDC contract addresses
  usdcBase: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base mainnet
  usdcBaseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // USDC on Base Sepolia

  // Aave V3 Pool on Base
  aavePoolBase: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as `0x${string}`,
  aaveAUsdcBase: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' as `0x${string}`, // aUSDC on Base
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
