---
name: create-wallet-flow
description: Generate complete wallet creation flow matching Alchemy + Clerk integration exactly. Creates React provider, wallet hook, Supabase edge function, and database migration following Clerk → Crossmint → Supabase pattern.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Create Wallet Flow

Generates a complete wallet creation flow that matches the existing Alchemy + Clerk integration pattern exactly. Creates all necessary files for Clerk → Crossmint → Supabase authentication flow.

## Instructions

When this command is invoked, execute the following workflow:

### 1. Verify Prerequisites

Check that setup has been completed:

```
Verifying prerequisites...

✓ Crossmint configuration found (src/config/crossmint.ts)
✓ Environment variables set (.env)
✓ Clerk integration detected
✓ Supabase configuration found
```

If any prerequisite is missing:
```
✗ Error: Crossmint not configured

Please run the setup wizard first:
  /crossmint:setup
```

### 2. Analyze Existing Alchemy Implementation

Scan the codebase to understand the current Alchemy pattern:

1. **Find Alchemy Provider**:
   - Search for `AlchemyProvider` in `src/components/`
   - Read the file to understand the structure

2. **Find Alchemy Hooks**:
   - Search for `useAlchemy*` hooks
   - Identify wallet state management patterns

3. **Find Supabase Integration**:
   - Search for `supabase/functions/` related to wallets
   - Check for existing wallet sync patterns

Display findings:
```
Current Alchemy Implementation Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provider:   src/components/auth/AlchemyProvider.tsx
Hook:       src/hooks/useAlchemySolanaWallet.tsx
Edge Fn:    Not found (may need creation)
Pattern:    Clerk → Alchemy Account Kit → Manual sync
```

### 3. Generate Configuration File

Create `src/config/crossmint.ts` (if not already created by setup):

```typescript
/**
 * Crossmint Configuration
 *
 * Multichain embedded wallet configuration for BlockDrive.
 * Matches Alchemy Account Kit pattern with Clerk OIDC authentication.
 */

import { type Chain } from '@crossmint/wallets-sdk';

// Environment variables validation
const requiredEnvVars = {
  clientApiKey: import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY,
  serverApiKey: import.meta.env.CROSSMINT_SERVER_API_KEY,
} as const;

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key.toUpperCase()}\n` +
      'Please run /crossmint:setup to configure Crossmint.'
    );
  }
});

/**
 * Supported blockchain networks
 * Crossmint creates wallets on ALL these chains automatically
 */
export const SUPPORTED_CHAINS: Chain[] = [
  'solana',           // Primary: Solana devnet/mainnet
  'base',             // EVM Layer 2 (low cost)
  'ethereum',         // EVM mainnet
  'polygon',          // EVM sidechain
] as const;

/**
 * Crossmint SDK Configuration
 */
export const crossmintConfig = {
  // API Keys
  clientApiKey: requiredEnvVars.clientApiKey,
  serverApiKey: requiredEnvVars.serverApiKey,

  // Environment (staging or production)
  environment: (import.meta.env.VITE_CROSSMINT_ENVIRONMENT || 'staging') as 'staging' | 'production',

  // Blockchain Networks
  chains: {
    primary: 'solana' as const,
    supported: SUPPORTED_CHAINS,
  },

  // Wallet Creation Settings
  wallet: {
    // Automatically create wallet when user signs in via Clerk
    // Matches Alchemy Account Kit behavior
    createOnLogin: true,

    // Wallet type (EVM Smart Wallet or Solana MPC)
    type: 'evm-smart-wallet' as const,
  },

  // Optional: Gas Sponsorship
  gasSponsorship: {
    enabled: !!import.meta.env.VITE_CROSSMINT_POLICY_ID,
    policyId: import.meta.env.VITE_CROSSMINT_POLICY_ID,
  },

  // Optional: NFT Collections
  nft: {
    collectionId: import.meta.env.CROSSMINT_COLLECTION_ID,
  },
} as const;

/**
 * Chain display names for UI
 */
export const CHAIN_NAMES: Record<Chain, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  base: 'Base',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  // Add other chains as needed
} as const;

export default crossmintConfig;
```

### 4. Generate React Provider Component

Create `src/providers/CrossmintProvider.tsx`:

**CRITICAL**: This must match the Alchemy provider pattern exactly.

```typescript
/**
 * Crossmint Provider
 *
 * Wraps the application with Crossmint embedded wallet context.
 * Matches AlchemyProvider pattern with Clerk authentication.
 *
 * Flow: Clerk (auth) → Crossmint (wallet) → Supabase (sync)
 */

import React, { type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { CrossmintProvider as CrossmintSDKProvider } from '@crossmint/client-sdk-react-ui';
import crossmintConfig from '@/config/crossmint';

interface CrossmintProviderProps {
  children: ReactNode;
}

/**
 * Crossmint Provider Component
 *
 * Provides Crossmint wallet context to child components.
 * Automatically creates wallet when user is authenticated via Clerk.
 */
export function CrossmintProvider({ children }: CrossmintProviderProps) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // Don't initialize Crossmint until user is signed in via Clerk
  if (!isSignedIn || !user) {
    return <>{children}</>;
  }

  return (
    <CrossmintSDKProvider
      // API Key
      apiKey={crossmintConfig.clientApiKey}

      // Environment
      environment={crossmintConfig.environment}

      // OIDC Authentication (Clerk)
      // This matches the Alchemy Account Kit pattern
      oidcAuth={{
        // Get JWT from Clerk for Crossmint authentication
        // Crossmint will use this to create/retrieve user's wallets
        getJwtToken: async () => {
          const token = await getToken({ template: 'crossmint' });
          if (!token) {
            throw new Error('Failed to get Clerk JWT token for Crossmint');
          }
          return token;
        },
      }}

      // Wallet Creation Settings
      wallet={{
        // Automatically create wallet on login (matches Alchemy)
        createOnLogin: crossmintConfig.wallet.createOnLogin,

        // Default chain for wallet creation
        chain: crossmintConfig.chains.primary,
      }}
    >
      {children}
    </CrossmintSDKProvider>
  );
}

export default CrossmintProvider;
```

### 5. Generate Wallet Hook

Create `src/hooks/useCrossmintWallet.tsx`:

**CRITICAL**: Must provide same interface as `useAlchemySolanaWallet` for easy migration.

```typescript
/**
 * Crossmint Wallet Hook
 *
 * Custom hook for accessing Crossmint embedded wallets.
 * Matches useAlchemySolanaWallet interface for easy migration.
 *
 * Provides:
 * - Wallet addresses (all chains)
 * - Transaction signing
 * - Balance queries
 * - Wallet state management
 * - Automatic Supabase sync
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { supabase } from '@/lib/supabase';
import crossmintConfig, { type SUPPORTED_CHAINS } from '@/config/crossmint';

interface WalletAddresses {
  solana?: string;
  ethereum?: string;
  base?: string;
  polygon?: string;
  arbitrum?: string;
  optimism?: string;
}

interface CrossmintWalletState {
  // Wallet addresses (multichain)
  addresses: WalletAddresses;
  primaryAddress: string | null;

  // Wallet status
  isConnected: boolean;
  isCreating: boolean;
  error: Error | null;

  // Actions
  createWallet: () => Promise<void>;
  switchChain: (chain: typeof SUPPORTED_CHAINS[number]) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signTransaction: (transaction: any) => Promise<any>;

  // Supabase sync
  syncToSupabase: () => Promise<void>;
}

/**
 * Use Crossmint Wallet Hook
 *
 * Manages wallet state and provides wallet operations.
 * Automatically syncs wallet addresses to Supabase.
 */
export function useCrossmintWallet(): CrossmintWalletState {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const wallet = useWallet();

  const [addresses, setAddresses] = useState<WalletAddresses>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch wallet addresses for all supported chains
   */
  const fetchAddresses = useCallback(async () => {
    if (!wallet || !isSignedIn) return;

    try {
      const newAddresses: WalletAddresses = {};

      // Get address for each supported chain
      for (const chain of crossmintConfig.chains.supported) {
        try {
          // Switch to chain and get address
          await wallet.switchChain(chain);
          const address = await wallet.getAddress();

          if (address) {
            newAddresses[chain] = address;
          }
        } catch (err) {
          console.warn(`Failed to get ${chain} address:`, err);
          // Continue with other chains even if one fails
        }
      }

      setAddresses(newAddresses);

      // Auto-sync to Supabase when addresses change
      if (Object.keys(newAddresses).length > 0) {
        await syncToSupabase(newAddresses);
      }
    } catch (err) {
      console.error('Failed to fetch wallet addresses:', err);
      setError(err as Error);
    }
  }, [wallet, isSignedIn]);

  /**
   * Create wallet (if not using createOnLogin)
   */
  const createWallet = useCallback(async () => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    setIsCreating(true);
    setError(null);

    try {
      await wallet.create();
      await fetchAddresses();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [wallet, fetchAddresses]);

  /**
   * Switch blockchain network
   */
  const switchChain = useCallback(async (chain: typeof SUPPORTED_CHAINS[number]) => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      await wallet.switchChain(chain);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [wallet]);

  /**
   * Sign message
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [wallet]);

  /**
   * Sign transaction
   */
  const signTransaction = useCallback(async (transaction: any) => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const signed = await wallet.signTransaction(transaction);
      return signed;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [wallet]);

  /**
   * Sync wallet addresses to Supabase
   * Matches Alchemy pattern: stores addresses in crossmint_wallets table
   */
  const syncToSupabase = useCallback(async (walletsToSync?: WalletAddresses) => {
    if (!user || !isSignedIn) {
      console.warn('Cannot sync to Supabase: user not signed in');
      return;
    }

    const addressesToSync = walletsToSync || addresses;

    if (Object.keys(addressesToSync).length === 0) {
      console.warn('No wallet addresses to sync');
      return;
    }

    try {
      // Upsert wallet addresses to Supabase
      // This matches the Alchemy sync pattern
      const { error: upsertError } = await supabase
        .from('crossmint_wallets')
        .upsert(
          {
            user_id: user.id,
            solana_address: addressesToSync.solana || null,
            ethereum_address: addressesToSync.ethereum || null,
            base_address: addressesToSync.base || null,
            polygon_address: addressesToSync.polygon || null,
            arbitrum_address: addressesToSync.arbitrum || null,
            optimism_address: addressesToSync.optimism || null,
            primary_chain: crossmintConfig.chains.primary,
            wallet_type: crossmintConfig.wallet.type,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (upsertError) {
        throw upsertError;
      }

      console.log('✓ Wallet addresses synced to Supabase');
    } catch (err) {
      console.error('Failed to sync wallet to Supabase:', err);
      setError(err as Error);
    }
  }, [user, isSignedIn, addresses]);

  /**
   * Auto-fetch addresses when wallet is ready
   */
  useEffect(() => {
    if (wallet && isSignedIn && !isCreating) {
      fetchAddresses();
    }
  }, [wallet, isSignedIn, isCreating, fetchAddresses]);

  // Get primary address (Solana by default, or first available)
  const primaryAddress =
    addresses[crossmintConfig.chains.primary] ||
    Object.values(addresses)[0] ||
    null;

  return {
    addresses,
    primaryAddress,
    isConnected: !!wallet && Object.keys(addresses).length > 0,
    isCreating,
    error,
    createWallet,
    switchChain,
    signMessage,
    signTransaction,
    syncToSupabase,
  };
}

export default useCrossmintWallet;
```

### 6. Generate Supabase Edge Function

Create `supabase/functions/sync-crossmint-wallet/index.ts`:

**CRITICAL**: Matches Alchemy edge function pattern for wallet sync.

```typescript
/**
 * Sync Crossmint Wallet - Supabase Edge Function
 *
 * Syncs Crossmint wallet addresses to Supabase database.
 * Called automatically after wallet creation via Clerk JWT.
 *
 * Matches Alchemy sync pattern.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WalletSyncRequest {
  addresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
    arbitrum?: string;
    optimism?: string;
  };
  primaryChain?: string;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: WalletSyncRequest = await req.json();
    const { addresses, primaryChain = 'solana' } = body;

    // Validate addresses
    if (!addresses || Object.keys(addresses).length === 0) {
      throw new Error('No wallet addresses provided');
    }

    // Upsert wallet record
    const { data, error } = await supabase
      .from('crossmint_wallets')
      .upsert(
        {
          user_id: user.id,
          solana_address: addresses.solana || null,
          ethereum_address: addresses.ethereum || null,
          base_address: addresses.base || null,
          polygon_address: addresses.polygon || null,
          arbitrum_address: addresses.arbitrum || null,
          optimism_address: addresses.optimism || null,
          primary_chain: primaryChain,
          wallet_type: 'evm-smart-wallet',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, wallet: data }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error syncing wallet:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to sync wallet',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
```

### 7. Generate Database Migration

Create `supabase/migrations/<timestamp>_create_crossmint_wallets.sql`:

```sql
-- Create crossmint_wallets table
-- Stores multichain wallet addresses from Crossmint embedded wallets
-- Matches Alchemy wallet sync pattern

CREATE TABLE IF NOT EXISTS crossmint_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Multichain Addresses
  -- Each user gets one wallet address per blockchain
  solana_address TEXT,
  ethereum_address TEXT,
  base_address TEXT,
  polygon_address TEXT,
  arbitrum_address TEXT,
  optimism_address TEXT,

  -- Wallet Metadata
  primary_chain TEXT NOT NULL DEFAULT 'solana',
  wallet_type TEXT NOT NULL DEFAULT 'evm-smart-wallet',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_primary_chain CHECK (
    primary_chain IN ('solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism')
  ),
  CONSTRAINT at_least_one_address CHECK (
    solana_address IS NOT NULL OR
    ethereum_address IS NOT NULL OR
    base_address IS NOT NULL OR
    polygon_address IS NOT NULL OR
    arbitrum_address IS NOT NULL OR
    optimism_address IS NOT NULL
  ),
  CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX idx_crossmint_wallets_user_id ON crossmint_wallets(user_id);
CREATE INDEX idx_crossmint_wallets_solana ON crossmint_wallets(solana_address) WHERE solana_address IS NOT NULL;
CREATE INDEX idx_crossmint_wallets_ethereum ON crossmint_wallets(ethereum_address) WHERE ethereum_address IS NOT NULL;
CREATE INDEX idx_crossmint_wallets_base ON crossmint_wallets(base_address) WHERE base_address IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE crossmint_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own wallet records
CREATE POLICY "Users can view their own wallets"
  ON crossmint_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON crossmint_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON crossmint_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crossmint_wallets_updated_at
  BEFORE UPDATE ON crossmint_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE crossmint_wallets IS 'Stores Crossmint embedded wallet addresses for multichain support (Solana, Ethereum, Base, Polygon, etc.)';
COMMENT ON COLUMN crossmint_wallets.primary_chain IS 'Primary blockchain for this user (typically Solana for BlockDrive)';
COMMENT ON COLUMN crossmint_wallets.wallet_type IS 'Wallet type: evm-smart-wallet or solana-mpc-wallet';
```

### 8. Update Main App Integration

Provide instructions for integrating the provider into `src/main.tsx`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Integration Instructions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add CrossmintProvider to your app (src/main.tsx):

1. Import the provider:
   import { CrossmintProvider } from '@/providers/CrossmintProvider';

2. Wrap your app (after ClerkProvider):
   <ClerkProvider publishableKey={...}>
     <CrossmintProvider>
       <App />
     </CrossmintProvider>
   </ClerkProvider>

3. Use the wallet hook in components:
   import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';

   function MyComponent() {
     const { addresses, primaryAddress, isConnected } = useCrossmintWallet();

     return <div>Wallet: {primaryAddress}</div>;
   }
```

### 9. Generate Clerk JWT Template

Provide instructions for creating Clerk JWT template:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Clerk Configuration Required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a JWT template in Clerk Dashboard:

1. Go to: https://dashboard.clerk.com
2. Navigate to: JWT Templates
3. Create new template named "crossmint"
4. Add these claims:
   {
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address}}",
     "iss": "https://clerk.YOUR_DOMAIN.com",
     "aud": "crossmint"
   }
5. Save template

This JWT will be used to authenticate users with Crossmint.
```

### 10. Completion Summary

Display comprehensive summary with all files created:

```
╔══════════════════════════════════════════════════════════════╗
║         Wallet Flow Generated Successfully! ✓                ║
╚══════════════════════════════════════════════════════════════╝

Pattern: Clerk → Crossmint → Supabase (matches Alchemy exactly)

Files Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ src/config/crossmint.ts
  Configuration file with multichain settings

✓ src/providers/CrossmintProvider.tsx
  React provider component (wraps app with Crossmint context)

✓ src/hooks/useCrossmintWallet.tsx
  Wallet hook for accessing addresses and signing transactions

✓ supabase/functions/sync-crossmint-wallet/index.ts
  Edge function for syncing wallets to database

✓ supabase/migrations/<timestamp>_create_crossmint_wallets.sql
  Database schema for storing multichain addresses

Integration Points:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ClerkProvider (existing)     → Authentication
2. CrossmintProvider (NEW)      → Wallet creation
3. Supabase (existing)          → Address storage
4. useCrossmintWallet (NEW)     → Access wallets in components

Wallet Flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Signs In (Clerk)
      ↓
Clerk JWT Generated
      ↓
Crossmint Creates Wallets (ALL chains)
      ↓
Addresses Retrieved
      ↓
Synced to Supabase (crossmint_wallets table)
      ↓
Available in useCrossmintWallet hook

Supported Chains:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Solana (primary)
✓ Base
✓ Ethereum
✓ Polygon

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Set up Clerk JWT template (see instructions above)

2. Run database migration:
   supabase db push

3. Deploy edge function:
   supabase functions deploy sync-crossmint-wallet

4. Integrate provider in src/main.tsx (see instructions above)

5. Test wallet creation:
   - Sign in via Clerk
   - Wallet should auto-create
   - Check Supabase for wallet record

6. (Optional) Create NFT collection:
   /crossmint:create-collection

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your wallet flow is ready! Sign in to test.
```

## Error Handling

### Missing Configuration

```
✗ Error: Crossmint configuration not found

Please run setup first:
  /crossmint:setup
```

### Existing Files

```
⚠ Warning: Files already exist

Found existing files:
- src/providers/CrossmintProvider.tsx
- src/hooks/useCrossmintWallet.tsx

Options:
[1] Overwrite existing files
[2] Create backups and overwrite
[3] Cancel

Select [1-3]:
```

### Clerk Not Configured

```
✗ Error: Clerk not configured

Crossmint requires Clerk for authentication.

Missing environment variables:
- VITE_CLERK_PUBLISHABLE_KEY

Please configure Clerk first.
```

## Example Usage

```bash
# Generate complete wallet flow
/crossmint:create-wallet-flow

# Re-generate after making config changes
/crossmint:create-wallet-flow
```

## Notes

- Matches Alchemy Account Kit pattern exactly
- Automatic wallet creation on login (createOnLogin: true)
- Multichain support from Day 1 (Solana, Base, Ethereum, Polygon)
- Type-safe TypeScript implementation
- Includes error handling and edge cases
- RLS policies for database security
- Auto-sync to Supabase after wallet creation
