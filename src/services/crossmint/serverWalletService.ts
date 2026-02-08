/**
 * Server-Side Wallet Creation Service
 *
 * Creates Crossmint wallets via Supabase edge function when
 * the client-side SDK approach fails (e.g., custom JWT auth issues).
 */

import { crossmintConfig } from '@/config/crossmint';

interface CreateWalletParams {
  clerkUserId: string;
  email: string;
  token: string;
}

interface CreateWalletResult {
  success: boolean;
  wallet?: {
    address: string;
    id?: string;
    type: string;
    alreadyExists?: boolean;
  };
  error?: string;
}

/**
 * Create a Crossmint wallet via server-side API
 *
 * This bypasses the Crossmint React SDK and creates wallets
 * directly via the Crossmint Server API through our edge function.
 */
export async function createWalletServerSide(
  params: CreateWalletParams
): Promise<CreateWalletResult> {
  const { clerkUserId, email, token } = params;

  console.log('[serverWalletService] Creating wallet for:', clerkUserId);

  try {
    const response = await fetch(
      `${crossmintConfig.supabaseUrl}/functions/v1/create-crossmint-wallet`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId,
          email,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[serverWalletService] API error:', data);
      return {
        success: false,
        error: data.error || 'Failed to create wallet',
      };
    }

    console.log('[serverWalletService] Wallet created:', data);

    return {
      success: true,
      wallet: data.wallet,
    };
  } catch (error) {
    console.error('[serverWalletService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get existing wallet from database
 */
export async function getExistingWallet(
  clerkUserId: string,
  token: string
): Promise<{ address: string | null }> {
  try {
    const response = await fetch(
      `${crossmintConfig.supabaseUrl}/rest/v1/crossmint_wallets?clerk_user_id=eq.${clerkUserId}&select=wallet_address`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
      }
    );

    if (!response.ok) {
      return { address: null };
    }

    const data = await response.json();
    return { address: data[0]?.wallet_address || null };
  } catch (error) {
    console.error('[serverWalletService] Get wallet error:', error);
    return { address: null };
  }
}
