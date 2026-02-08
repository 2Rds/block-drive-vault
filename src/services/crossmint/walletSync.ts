/**
 * Crossmint Wallet Sync Service
 *
 * Syncs Crossmint wallet addresses to Supabase database
 */

import { crossmintConfig } from '@/config/crossmint';

interface SyncWalletParams {
  clerkUserId: string;
  walletId: string;
  addresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
    arbitrum?: string;
    optimism?: string;
  };
  token: string;
}

export async function syncCrossmintWallet(params: SyncWalletParams): Promise<void> {
  const { clerkUserId, walletId, addresses, token } = params;

  try {
    const response = await fetch(
      `${crossmintConfig.supabaseUrl}/functions/v1/sync-crossmint-wallet`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId,
          walletId,
          addresses,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Wallet sync failed: ${error.message}`);
    }

    const data = await response.json();
    console.log('[syncCrossmintWallet] Success:', data);
  } catch (error) {
    console.error('[syncCrossmintWallet] Error:', error);
    throw error;
  }
}
