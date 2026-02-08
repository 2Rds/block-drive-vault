---
name: Crossmint-Supabase Integration Flow
description: This skill should be used when the user asks about "Crossmint Supabase integration", "wallet sync to database", "Crossmint database storage", "multichain wallet sync", "crossmint_wallets table", "sync-crossmint-wallet edge function", "RLS policies for wallets", "Clerk → Crossmint → Supabase flow", or needs to understand or implement the complete authentication and multichain wallet synchronization pattern for Crossmint embedded wallets in BlockDrive.
version: 1.0.0
---

# Crossmint-Supabase Integration Flow

## Overview

BlockDrive uses a three-service integration pattern for multichain wallet management: **Clerk** for identity, **Crossmint** for embedded wallets, and **Supabase** for data persistence. This creates a seamless experience where users authenticate once and automatically receive blockchain wallets across **multiple chains** (Solana, Ethereum, Base, Polygon, etc.) linked to their account in the database.

This pattern mirrors the existing Alchemy integration but extends it to support **multichain address storage** from Day 1. Unlike single-chain solutions, Crossmint creates wallets on ALL supported chains from a single authentication event, requiring a more robust database schema to track addresses across chains.

**Key Differences from Alchemy Integration**:
- **Multichain by Default**: Stores Solana, Ethereum, Base, and other chain addresses
- **Richer Metadata**: Tracks wallet type (embedded vs smart contract), creation timestamps, and active status
- **Flexible Schema**: Supports future chain additions without migration
- **Unified Sync**: Single edge function handles all chain addresses

## When to Use

Activate this skill when:
- Setting up the Crossmint → Supabase integration architecture
- Creating or updating the `crossmint_wallets` database table
- Implementing the `sync-crossmint-wallet` edge function
- Syncing multichain wallet addresses to the database
- Configuring Row-Level Security (RLS) policies for wallet data
- Querying wallet addresses by chain or user
- Migrating from the single-chain `profiles` table pattern
- Troubleshooting wallet sync issues
- Extending the integration for new blockchain networks

## Complete Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│            CROSSMINT MULTICHAIN DATABASE ARCHITECTURE             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐     ┌───────────────┐     ┌──────────────┐        │
│  │  CLERK   │────▶│  CROSSMINT    │────▶│   SUPABASE   │        │
│  │ Identity │     │ Embedded SDK  │     │   Database   │        │
│  └──────────┘     └───────────────┘     └──────────────┘        │
│       │                  │                      │                │
│       │                  │                      │                │
│  1. User signs      2. Creates wallets    3. Multichain         │
│     in via Clerk       on ALL chains         addresses stored   │
│     (JWT token)        (MPC wallets)         in crossmint_      │
│                                               wallets table      │
│                                                                   │
│  ────────────────────────────────────────────────────────────   │
│                                                                   │
│  DATABASE SCHEMA                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  profiles                     crossmint_wallets            │ │
│  │  ├─ id (UUID)                 ├─ id (UUID)                │ │
│  │  ├─ clerk_user_id             ├─ user_id (FK → profiles)  │ │
│  │  ├─ email                     ├─ clerk_user_id            │ │
│  │  ├─ crossmint_wallet_id (FK)  ├─ crossmint_wallet_id      │ │
│  │  └─ preferred_wallet_provider ├─ solana_address           │ │
│  │                                ├─ ethereum_address         │ │
│  │                                ├─ base_address             │ │
│  │                                ├─ polygon_address          │ │
│  │                                ├─ arbitrum_address         │ │
│  │                                ├─ optimism_address         │ │
│  │                                ├─ wallet_type              │ │
│  │                                ├─ created_at               │ │
│  │                                ├─ updated_at               │ │
│  │                                └─ is_active                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  User Experience: Sign in once → Wallets on all chains          │
│  No seed phrases, gas-sponsored txns, multichain from Day 1     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Integration Flow

### Step 1: User Authentication (Clerk)

Users authenticate via Clerk, which provides an OIDC-compliant JWT token containing user identity information.

```typescript
/**
 * User Authentication with Clerk
 *
 * Clerk manages the entire authentication flow including:
 * - Sign up/sign in UI
 * - Session management
 * - JWT token generation
 * - OAuth providers (Google, GitHub, etc.)
 */

import { useAuth, useSession, useUser } from '@clerk/clerk-react';

function AuthenticationFlow() {
  const { isSignedIn, getToken } = useAuth();
  const { session } = useSession();
  const { user } = useUser();

  // Wait for successful authentication
  if (!isSignedIn || !session || !user) {
    return <div>Please sign in...</div>;
  }

  // User is authenticated, proceed to wallet initialization
  return <WalletInitialization />;
}
```

**JWT Token Structure**:
```json
{
  "sub": "user_2a1b3c4d",           // Clerk user ID
  "email": "user@blockdrive.co",
  "iss": "https://clerk.blockdrive.co",
  "iat": 1706284800,
  "exp": 1706288400,
  "azp": "https://app.blockdrive.co"
}
```

### Step 2: Retrieve Clerk JWT Token

The JWT token is used to authenticate both Crossmint wallet creation and Supabase edge function calls.

```typescript
/**
 * JWT Token Retrieval
 *
 * This token serves dual purposes:
 * 1. Authenticates user with Crossmint for wallet creation
 * 2. Authorizes Supabase edge function to store wallet data
 */

const initializeWalletFlow = async () => {
  try {
    // Get Clerk session token
    const clerkToken = await getToken();

    if (!clerkToken) {
      throw new Error('Failed to retrieve authentication token');
    }

    // Token contains user ID in the "sub" (subject) claim
    const payload = JSON.parse(atob(clerkToken.split('.')[1]));
    const clerkUserId = payload.sub;

    console.log('[Auth] User authenticated:', clerkUserId);

    // Proceed to Crossmint wallet initialization
    return { clerkToken, clerkUserId };
  } catch (error) {
    console.error('[Auth] Token retrieval failed:', error);
    throw error;
  }
};
```

### Step 3: Wallet Initialization (Crossmint)

Crossmint creates embedded wallets across multiple chains using the Clerk JWT for authentication.

```typescript
/**
 * Crossmint Wallet Initialization
 *
 * Crossmint automatically creates wallets on ALL supported chains
 * from a single authentication event using createOnLogin: true
 */

import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
  useWallet
} from '@crossmint/client-sdk-react-ui';

interface WalletInitializationProps {
  clerkToken: string;
  userEmail: string;
}

function WalletInitialization({ clerkToken, userEmail }: WalletInitializationProps) {
  const { wallet } = useWallet();
  const [addresses, setAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!wallet) return;

    const initializeMultichainWallets = async () => {
      try {
        // Primary wallet address (Solana)
        const primaryAddress = wallet.address;

        console.log('[Crossmint] Primary wallet created:', primaryAddress);

        // Fetch addresses for all chains
        // Crossmint creates one wallet per chain from the same key
        const chainAddresses: Record<string, string> = {
          solana: primaryAddress,
        };

        // Switch to each chain to get its address
        const evmChains = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'];

        for (const chain of evmChains) {
          try {
            await wallet.switchChain(chain);
            chainAddresses[chain] = wallet.address;
            console.log(`[Crossmint] ${chain} wallet:`, wallet.address);
          } catch (error) {
            console.warn(`[Crossmint] ${chain} wallet not available:`, error);
          }
        }

        // Switch back to primary chain
        await wallet.switchChain('solana:devnet');

        setAddresses(chainAddresses);

        // Proceed to database sync
        await syncWalletsToDatabase(wallet.id, chainAddresses, clerkToken);

      } catch (error) {
        console.error('[Crossmint] Wallet initialization failed:', error);
        throw error;
      }
    };

    initializeMultichainWallets();
  }, [wallet, clerkToken]);

  return (
    <div>
      <h2>Multichain Wallets Initialized</h2>
      {Object.entries(addresses).map(([chain, address]) => (
        <div key={chain}>
          <strong>{chain}:</strong> {address}
        </div>
      ))}
    </div>
  );
}
```

**Wallet Creation Configuration**:
```typescript
// Automatic wallet creation on login
const walletConfig = {
  createOnLogin: {
    chain: 'solana:devnet',  // Primary chain
    signer: {
      type: 'email',
      email: userEmail,
    },
    alias: `blockdrive_${userEmail.split('@')[0]}`,
  },
};
```

### Step 4: Wallet Sync to Supabase

After wallet creation, addresses are synced to the database via the `sync-crossmint-wallet` edge function.

```typescript
/**
 * Sync Crossmint Wallets to Supabase
 *
 * Stores multichain wallet addresses in the crossmint_wallets table
 * with proper user association and metadata
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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

export async function syncWalletsToDatabase(
  walletId: string,
  addresses: Record<string, string>,
  token: string
): Promise<void> {
  try {
    // Extract user ID from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const clerkUserId = payload.sub;

    // Call Supabase edge function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sync-crossmint-wallet`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId,
          walletId,
          addresses: {
            solana: addresses.solana,
            ethereum: addresses.ethereum,
            base: addresses.base,
            polygon: addresses.polygon,
            arbitrum: addresses.arbitrum,
            optimism: addresses.optimism,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Wallet sync failed: ${error.message}`);
    }

    const result = await response.json();
    console.log('[Sync] Wallets synced successfully:', result);

    return result;
  } catch (error) {
    console.error('[Sync] Database sync failed:', error);
    throw error;
  }
}
```

## Database Schema

### Primary Table: `crossmint_wallets`

This table stores multichain wallet addresses for each user with comprehensive metadata.

```sql
-- ============================================================================
-- CROSSMINT WALLETS TABLE
-- ============================================================================
-- Stores multichain embedded wallet addresses for BlockDrive users
-- Supports Solana, Ethereum, Base, Polygon, Arbitrum, Optimism, and more
-- ============================================================================

CREATE TABLE crossmint_wallets (
  -- Primary identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,

  -- Crossmint wallet identifiers
  crossmint_wallet_id TEXT UNIQUE NOT NULL,
  wallet_alias TEXT,

  -- Multichain addresses (Solana)
  solana_address TEXT,
  solana_devnet_address TEXT,

  -- Multichain addresses (EVM)
  ethereum_address TEXT,
  base_address TEXT,
  polygon_address TEXT,
  arbitrum_address TEXT,
  optimism_address TEXT,
  avalanche_address TEXT,
  bnb_address TEXT,

  -- Future expansion columns
  additional_addresses JSONB DEFAULT '{}',

  -- Wallet metadata
  wallet_type TEXT DEFAULT 'crossmint_embedded'
    CHECK (wallet_type IN ('crossmint_embedded', 'crossmint_smart_contract')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  sync_status TEXT DEFAULT 'synced'
    CHECK (sync_status IN ('pending', 'synced', 'failed')),

  -- Constraints
  CONSTRAINT unique_user_crossmint UNIQUE (user_id, clerk_user_id),
  CONSTRAINT at_least_one_address CHECK (
    solana_address IS NOT NULL
    OR ethereum_address IS NOT NULL
    OR base_address IS NOT NULL
  )
);

-- ============================================================================
-- INDEXES FOR FAST LOOKUPS
-- ============================================================================

-- User lookup indexes
CREATE INDEX idx_crossmint_wallets_clerk_user
  ON crossmint_wallets(clerk_user_id);

CREATE INDEX idx_crossmint_wallets_user_id
  ON crossmint_wallets(user_id);

-- Chain-specific address indexes
CREATE INDEX idx_crossmint_wallets_solana
  ON crossmint_wallets(solana_address)
  WHERE solana_address IS NOT NULL;

CREATE INDEX idx_crossmint_wallets_ethereum
  ON crossmint_wallets(ethereum_address)
  WHERE ethereum_address IS NOT NULL;

CREATE INDEX idx_crossmint_wallets_base
  ON crossmint_wallets(base_address)
  WHERE base_address IS NOT NULL;

CREATE INDEX idx_crossmint_wallets_polygon
  ON crossmint_wallets(polygon_address)
  WHERE polygon_address IS NOT NULL;

-- Wallet ID index for Crossmint API lookups
CREATE INDEX idx_crossmint_wallets_id
  ON crossmint_wallets(crossmint_wallet_id);

-- Active wallets index for queries
CREATE INDEX idx_crossmint_wallets_active
  ON crossmint_wallets(is_active)
  WHERE is_active = TRUE;

-- Timestamp index for sync monitoring
CREATE INDEX idx_crossmint_wallets_last_synced
  ON crossmint_wallets(last_synced_at DESC);

-- ============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crossmint_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crossmint_wallets_updated_at
  BEFORE UPDATE ON crossmint_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_crossmint_wallets_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE crossmint_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallets
CREATE POLICY "Users can view own wallets"
  ON crossmint_wallets
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can insert their own wallets
CREATE POLICY "Users can insert own wallets"
  ON crossmint_wallets
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can update their own wallets
CREATE POLICY "Users can update own wallets"
  ON crossmint_wallets
  FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Users cannot delete wallets (admin only)
-- Deletion is handled via CASCADE from profiles table

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access"
  ON crossmint_wallets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Updated `profiles` Table

Add Crossmint wallet reference to the existing profiles table.

```sql
-- ============================================================================
-- PROFILES TABLE UPDATES
-- ============================================================================
-- Add Crossmint wallet reference and provider preference
-- ============================================================================

-- Add new columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS crossmint_wallet_id UUID
    REFERENCES crossmint_wallets(id) ON DELETE SET NULL,

  ADD COLUMN IF NOT EXISTS preferred_wallet_provider TEXT
    DEFAULT 'alchemy'
    CHECK (preferred_wallet_provider IN ('alchemy', 'crossmint', 'external'));

-- Index for provider filtering
CREATE INDEX idx_profiles_wallet_provider
  ON profiles(preferred_wallet_provider);

-- Index for Crossmint wallet FK
CREATE INDEX idx_profiles_crossmint_wallet
  ON profiles(crossmint_wallet_id)
  WHERE crossmint_wallet_id IS NOT NULL;

-- ============================================================================
-- MIGRATION: Set preferred provider for existing users
-- ============================================================================

-- Users with Alchemy wallets keep Alchemy
UPDATE profiles
SET preferred_wallet_provider = 'alchemy'
WHERE solana_wallet_address IS NOT NULL
  AND preferred_wallet_provider IS NULL;

-- New users will default to Crossmint (via application logic)
```

## Supabase Edge Function

The `sync-crossmint-wallet` edge function handles secure wallet data persistence with validation and error handling.

**File**: `supabase/functions/sync-crossmint-wallet/index.ts`

```typescript
/**
 * Sync Crossmint Wallet Edge Function
 *
 * Securely stores multichain Crossmint wallet addresses in Supabase
 * with user association, validation, and error handling.
 *
 * @endpoint POST /functions/v1/sync-crossmint-wallet
 * @auth Clerk JWT token (Bearer token)
 * @body { clerkUserId, walletId, addresses }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for client requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Request body interface
interface SyncWalletRequest {
  clerkUserId: string;
  walletId: string;
  addresses: {
    solana?: string;
    solana_devnet?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
    arbitrum?: string;
    optimism?: string;
    avalanche?: string;
    bnb?: string;
  };
  walletType?: 'crossmint_embedded' | 'crossmint_smart_contract';
  walletAlias?: string;
}

// Response interface
interface SyncWalletResponse {
  success: boolean;
  message: string;
  walletId?: string;
  addressesStored?: number;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate Solana address format (Base58)
 */
function isValidSolanaAddress(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validate EVM address format (0x + 40 hex chars)
 */
function isValidEVMAddress(address: string): boolean {
  const evmRegex = /^0x[a-fA-F0-9]{40}$/;
  return evmRegex.test(address);
}

/**
 * Validate all provided addresses
 */
function validateAddresses(addresses: SyncWalletRequest['addresses']): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate Solana addresses
  if (addresses.solana && !isValidSolanaAddress(addresses.solana)) {
    errors.push('Invalid Solana mainnet address format');
  }
  if (addresses.solana_devnet && !isValidSolanaAddress(addresses.solana_devnet)) {
    errors.push('Invalid Solana devnet address format');
  }

  // Validate EVM addresses
  const evmChains = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bnb'];
  for (const chain of evmChains) {
    const address = addresses[chain as keyof typeof addresses];
    if (address && !isValidEVMAddress(address)) {
      errors.push(`Invalid ${chain} address format`);
    }
  }

  // At least one address must be provided
  const hasAnyAddress = Object.values(addresses).some(addr => !!addr);
  if (!hasAnyAddress) {
    errors.push('At least one blockchain address is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========================================================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ========================================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Decode JWT to extract user ID
    let tokenUserId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      tokenUserId = payload.sub;
    } catch (error) {
      throw new Error('Invalid JWT token format');
    }

    // ========================================================================
    // 2. PARSE AND VALIDATE REQUEST BODY
    // ========================================================================

    const requestBody: SyncWalletRequest = await req.json();
    const { clerkUserId, walletId, addresses, walletType, walletAlias } = requestBody;

    // Verify user ID matches token
    if (tokenUserId !== clerkUserId) {
      throw new Error('User ID mismatch: token does not match request');
    }

    // Validate required fields
    if (!walletId) {
      throw new Error('Missing required field: walletId');
    }

    // Validate addresses
    const validation = validateAddresses(addresses);
    if (!validation.valid) {
      throw new Error(`Address validation failed: ${validation.errors.join(', ')}`);
    }

    // ========================================================================
    // 3. INITIALIZE SUPABASE CLIENT
    // ========================================================================

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================================================
    // 4. GET OR CREATE USER PROFILE
    // ========================================================================

    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          preferred_wallet_provider: 'crossmint',
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create user profile: ${createError.message}`);
      }

      profile = newProfile;
    } else if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('User profile not found and could not be created');
    }

    // ========================================================================
    // 5. UPSERT CROSSMINT WALLET DATA
    // ========================================================================

    const now = new Date().toISOString();
    const addressesStored = Object.values(addresses).filter(Boolean).length;

    const { data: walletData, error: walletError } = await supabase
      .from('crossmint_wallets')
      .upsert(
        {
          user_id: profile.id,
          clerk_user_id: clerkUserId,
          crossmint_wallet_id: walletId,
          wallet_alias: walletAlias || `blockdrive_${clerkUserId.slice(0, 8)}`,

          // Solana addresses
          solana_address: addresses.solana || null,
          solana_devnet_address: addresses.solana_devnet || null,

          // EVM addresses
          ethereum_address: addresses.ethereum || null,
          base_address: addresses.base || null,
          polygon_address: addresses.polygon || null,
          arbitrum_address: addresses.arbitrum || null,
          optimism_address: addresses.optimism || null,
          avalanche_address: addresses.avalanche || null,
          bnb_address: addresses.bnb || null,

          // Metadata
          wallet_type: walletType || 'crossmint_embedded',
          updated_at: now,
          last_synced_at: now,
          is_active: true,
          sync_status: 'synced',
        },
        {
          onConflict: 'clerk_user_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (walletError) {
      console.error('[sync-crossmint-wallet] Upsert error:', walletError);
      throw new Error(`Failed to sync wallet: ${walletError.message}`);
    }

    // ========================================================================
    // 6. UPDATE USER PROFILE WITH CROSSMINT PREFERENCE
    // ========================================================================

    await supabase
      .from('profiles')
      .update({
        preferred_wallet_provider: 'crossmint',
        crossmint_wallet_id: walletData.id,
      })
      .eq('id', profile.id);

    // ========================================================================
    // 7. RETURN SUCCESS RESPONSE
    // ========================================================================

    const response: SyncWalletResponse = {
      success: true,
      message: 'Wallet synced successfully',
      walletId: walletId,
      addressesStored,
    };

    console.log('[sync-crossmint-wallet] Success:', {
      clerkUserId,
      walletId,
      addressesStored,
    });

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      status: 200,
    });

  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    console.error('[sync-crossmint-wallet] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('Missing') ||
                       errorMessage.includes('Invalid') ||
                       errorMessage.includes('mismatch')
      ? 400  // Bad Request
      : 500; // Internal Server Error

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: statusCode,
      }
    );
  }
});
```

## Complete Provider Implementation

Integrate Clerk, Crossmint, and Supabase in a single React provider that handles the entire flow.

**File**: `src/providers/CrossmintAuthProvider.tsx`

```typescript
/**
 * Crossmint Authentication Provider
 *
 * Orchestrates the complete flow:
 * 1. Clerk authentication
 * 2. Crossmint wallet creation
 * 3. Supabase database sync
 *
 * Provides wallet state and operations to the application
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { syncWalletsToDatabase } from '@/services/crossmint/walletSync';

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface CrossmintAuthContextValue {
  // Authentication state
  isAuthenticated: boolean;
  isWalletReady: boolean;

  // Wallet identifiers
  walletId: string | null;
  primaryAddress: string | null;

  // Multichain addresses
  addresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
    arbitrum?: string;
    optimism?: string;
  };

  // Operations
  refreshWallets: () => Promise<void>;
  getAddressForChain: (chain: string) => string | undefined;

  // Loading states
  isInitializing: boolean;
  isSyncing: boolean;

  // Error state
  error: Error | null;
}

const CrossmintAuthContext = createContext<CrossmintAuthContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function CrossmintAuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { wallet } = useWallet();

  // State management
  const [walletId, setWalletId] = useState<string | null>(null);
  const [primaryAddress, setPrimaryAddress] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize Crossmint wallets and sync to database
   */
  const initializeWallets = useCallback(async () => {
    if (!isSignedIn || !user || !wallet || isWalletReady) {
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      console.log('[CrossmintAuth] Initializing wallets for user:', user.id);

      // Step 1: Get primary wallet address
      const primaryAddr = wallet.address;
      setWalletId(wallet.id);
      setPrimaryAddress(primaryAddr);

      console.log('[CrossmintAuth] Primary wallet:', primaryAddr);

      // Step 2: Fetch all chain addresses
      const chainAddresses: Record<string, string> = {
        solana: primaryAddr,  // Primary is Solana
      };

      // Get EVM chain addresses
      const evmChains = ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism'];
      const currentChain = wallet.chain;

      for (const chain of evmChains) {
        try {
          await wallet.switchChain(chain);
          chainAddresses[chain] = wallet.address;
          console.log(`[CrossmintAuth] ${chain} wallet:`, wallet.address);
        } catch (error) {
          console.warn(`[CrossmintAuth] ${chain} not available:`, error);
        }
      }

      // Switch back to original chain
      if (currentChain) {
        await wallet.switchChain(currentChain);
      }

      setAddresses(chainAddresses);

      // Step 3: Sync to Supabase
      setIsSyncing(true);

      const token = await getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }

      await syncWalletsToDatabase(wallet.id, chainAddresses, token);

      console.log('[CrossmintAuth] Wallets synced to database');

      setIsWalletReady(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[CrossmintAuth] Initialization failed:', error);
      setError(error);
    } finally {
      setIsInitializing(false);
      setIsSyncing(false);
    }
  }, [isSignedIn, user, wallet, isWalletReady, getToken]);

  /**
   * Refresh wallet addresses (useful after chain additions)
   */
  const refreshWallets = useCallback(async () => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    setIsSyncing(true);

    try {
      const chainAddresses: Record<string, string> = {};
      const chains = ['solana:devnet', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism'];

      for (const chain of chains) {
        try {
          await wallet.switchChain(chain);
          const cleanChain = chain.replace(':devnet', '');
          chainAddresses[cleanChain] = wallet.address;
        } catch (error) {
          console.warn(`[CrossmintAuth] Chain ${chain} not available:`, error);
        }
      }

      setAddresses(chainAddresses);

      // Re-sync to database
      const token = await getToken();
      if (token) {
        await syncWalletsToDatabase(wallet.id, chainAddresses, token);
      }
    } catch (error) {
      console.error('[CrossmintAuth] Refresh failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [wallet, getToken]);

  /**
   * Get address for a specific chain
   */
  const getAddressForChain = useCallback((chain: string): string | undefined => {
    return addresses[chain];
  }, [addresses]);

  // Initialize wallets when wallet is available
  useEffect(() => {
    initializeWallets();
  }, [initializeWallets]);

  // Context value
  const value: CrossmintAuthContextValue = {
    isAuthenticated: isSignedIn,
    isWalletReady,
    walletId,
    primaryAddress,
    addresses,
    refreshWallets,
    getAddressForChain,
    isInitializing,
    isSyncing,
    error,
  };

  return (
    <CrossmintAuthContext.Provider value={value}>
      {children}
    </CrossmintAuthContext.Provider>
  );
}

// ============================================================================
// HOOK FOR CONSUMING CONTEXT
// ============================================================================

export function useCrossmintAuth(): CrossmintAuthContextValue {
  const context = useContext(CrossmintAuthContext);

  if (context === undefined) {
    throw new Error('useCrossmintAuth must be used within CrossmintAuthProvider');
  }

  return context;
}

export default CrossmintAuthProvider;
```

## Query Patterns

### Query Wallet by User

Retrieve wallet addresses for a specific user:

```typescript
/**
 * Get Crossmint wallet for a user
 */
async function getUserWallet(clerkUserId: string) {
  const { data, error } = await supabase
    .from('crossmint_wallets')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Failed to fetch wallet:', error);
    return null;
  }

  return data;
}

// Usage
const wallet = await getUserWallet('user_2a1b3c4d');
console.log('Solana address:', wallet.solana_address);
console.log('Base address:', wallet.base_address);
```

### Query by Chain Address

Find the user who owns a specific wallet address:

```typescript
/**
 * Get user by Solana address
 */
async function getUserBySolanaAddress(address: string) {
  const { data, error } = await supabase
    .from('crossmint_wallets')
    .select(`
      *,
      profiles:user_id (
        clerk_user_id,
        email,
        created_at
      )
    `)
    .eq('solana_address', address)
    .single();

  if (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }

  return data;
}

// Usage
const user = await getUserBySolanaAddress('6h3...xyz');
console.log('User email:', user.profiles.email);
```

### Query All Active Wallets

Get all active wallets for analytics or administration:

```typescript
/**
 * Get all active Crossmint wallets
 */
async function getAllActiveWallets() {
  const { data, error } = await supabase
    .from('crossmint_wallets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch wallets:', error);
    return [];
  }

  return data;
}

// Usage
const wallets = await getAllActiveWallets();
console.log(`Total active wallets: ${wallets.length}`);
```

### Query Wallets by Chain

Find all wallets with addresses on a specific chain:

```typescript
/**
 * Get all wallets with Base addresses
 */
async function getWalletsWithBaseAddresses() {
  const { data, error } = await supabase
    .from('crossmint_wallets')
    .select('clerk_user_id, base_address')
    .not('base_address', 'is', null)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch Base wallets:', error);
    return [];
  }

  return data;
}

// Usage
const baseWallets = await getWalletsWithBaseAddresses();
console.log(`Users with Base wallets: ${baseWallets.length}`);
```

### Verify Wallet Ownership

Verify that a user owns a specific wallet address:

```typescript
/**
 * Verify wallet ownership
 */
async function verifyWalletOwnership(
  clerkUserId: string,
  address: string,
  chain: 'solana' | 'ethereum' | 'base' | 'polygon'
): Promise<boolean> {
  const columnMap = {
    solana: 'solana_address',
    ethereum: 'ethereum_address',
    base: 'base_address',
    polygon: 'polygon_address',
  };

  const column = columnMap[chain];

  const { data, error } = await supabase
    .from('crossmint_wallets')
    .select(column)
    .eq('clerk_user_id', clerkUserId)
    .eq(column, address)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}

// Usage
const isOwner = await verifyWalletOwnership(
  'user_2a1b3c4d',
  '6h3...xyz',
  'solana'
);

console.log('Owns wallet:', isOwner);
```

## Migration from `profiles` Table

If you're migrating from the single-chain Alchemy pattern where addresses were stored directly in the `profiles` table:

### Migration Script

**File**: `supabase/migrations/20260126_migrate_to_crossmint_wallets.sql`

```sql
-- ============================================================================
-- MIGRATION: Move Alchemy addresses to crossmint_wallets table
-- ============================================================================
-- This migration preserves existing Alchemy wallet data while preparing
-- for Crossmint multichain wallet support
-- ============================================================================

BEGIN;

-- Step 1: Create crossmint_wallets table (if not exists)
-- (Use the CREATE TABLE statement from earlier in this document)

-- Step 2: Migrate existing Alchemy Solana addresses
INSERT INTO crossmint_wallets (
  user_id,
  clerk_user_id,
  crossmint_wallet_id,
  solana_address,
  wallet_type,
  wallet_alias,
  created_at,
  updated_at,
  is_active
)
SELECT
  p.id,
  p.clerk_user_id,
  'migrated_' || p.clerk_user_id,  -- Temporary wallet ID
  p.solana_wallet_address,
  'crossmint_embedded',
  'migrated_from_alchemy',
  p.wallet_created_at,
  NOW(),
  TRUE
FROM profiles p
WHERE p.solana_wallet_address IS NOT NULL
  AND p.wallet_provider = 'alchemy_embedded_mpc'
  AND NOT EXISTS (
    SELECT 1 FROM crossmint_wallets cw
    WHERE cw.clerk_user_id = p.clerk_user_id
  );

-- Step 3: Update profiles with crossmint_wallet_id FK
UPDATE profiles p
SET crossmint_wallet_id = cw.id
FROM crossmint_wallets cw
WHERE p.clerk_user_id = cw.clerk_user_id
  AND p.crossmint_wallet_id IS NULL;

-- Step 4: Add comments for documentation
COMMENT ON TABLE crossmint_wallets IS
  'Stores multichain embedded wallet addresses from Crossmint. Migrated from profiles.solana_wallet_address.';

COMMENT ON COLUMN profiles.solana_wallet_address IS
  'DEPRECATED: Use crossmint_wallets.solana_address instead. Kept for backward compatibility.';

-- Step 5: Create view for backward compatibility
CREATE OR REPLACE VIEW user_wallets AS
SELECT
  p.id AS profile_id,
  p.clerk_user_id,
  p.email,
  p.preferred_wallet_provider,

  -- Alchemy wallet (legacy)
  p.solana_wallet_address AS alchemy_solana_address,

  -- Crossmint wallets (new)
  cw.solana_address AS crossmint_solana_address,
  cw.ethereum_address,
  cw.base_address,
  cw.polygon_address,
  cw.arbitrum_address,
  cw.optimism_address,

  -- Metadata
  cw.wallet_type,
  cw.is_active,
  cw.created_at AS wallet_created_at

FROM profiles p
LEFT JOIN crossmint_wallets cw ON p.crossmint_wallet_id = cw.id;

-- Step 6: Grant permissions
GRANT SELECT ON user_wallets TO authenticated;

COMMIT;
```

### Gradual Migration Strategy

For production environments, migrate users gradually:

```typescript
/**
 * Gradual Migration Service
 *
 * Migrates users from Alchemy to Crossmint in batches
 */

interface MigrationStatus {
  totalUsers: number;
  migratedUsers: number;
  pendingUsers: number;
  failedUsers: number;
}

export class CrossmintMigrationService {
  /**
   * Check migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const { data: total } = await supabase
      .from('profiles')
      .select('count')
      .single();

    const { data: migrated } = await supabase
      .from('crossmint_wallets')
      .select('count')
      .single();

    return {
      totalUsers: total?.count || 0,
      migratedUsers: migrated?.count || 0,
      pendingUsers: (total?.count || 0) - (migrated?.count || 0),
      failedUsers: 0,
    };
  }

  /**
   * Migrate a batch of users
   */
  async migrateBatch(batchSize = 100): Promise<{
    success: number;
    failed: number;
  }> {
    // Get users without Crossmint wallets
    const { data: users } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, email')
      .is('crossmint_wallet_id', null)
      .limit(batchSize);

    if (!users || users.length === 0) {
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        // Trigger Crossmint wallet creation for this user
        await this.createCrossmintWalletForUser(user);
        success++;
      } catch (error) {
        console.error(`Migration failed for user ${user.clerk_user_id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Create Crossmint wallet for a user during migration
   */
  private async createCrossmintWalletForUser(user: any): Promise<void> {
    // Implementation depends on your authentication flow
    // This is typically triggered when the user next signs in
    console.log(`Queued migration for user: ${user.clerk_user_id}`);
  }
}
```

## RLS Policies Deep Dive

### Security Principles

1. **User Isolation**: Users can only access their own wallet data
2. **Service Access**: Edge functions use service role for full access
3. **Read-Heavy**: Optimize for read operations (most common)
4. **Immutable Wallets**: Prevent deletion by regular users

### Testing RLS Policies

```sql
-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user_2a1b3c4d';

-- Should return only this user's wallet
SELECT * FROM crossmint_wallets;

-- Should succeed
INSERT INTO crossmint_wallets (clerk_user_id, crossmint_wallet_id, solana_address)
VALUES ('user_2a1b3c4d', 'test_wallet_id', '6h3abc...xyz');

-- Should fail (different user)
INSERT INTO crossmint_wallets (clerk_user_id, crossmint_wallet_id, solana_address)
VALUES ('user_different', 'test_wallet_id', '7h4def...xyz');

RESET ROLE;
```

### Custom RLS Function

For more complex authorization logic:

```sql
-- Function to check if user can access wallet
CREATE OR REPLACE FUNCTION can_access_wallet(wallet_clerk_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- User can access their own wallet
  IF auth.jwt() ->> 'sub' = wallet_clerk_user_id THEN
    RETURN TRUE;
  END IF;

  -- Admin users can access all wallets
  IF auth.jwt() ->> 'role' = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated policy using the function
CREATE POLICY "Users can access authorized wallets"
  ON crossmint_wallets
  FOR SELECT
  USING (can_access_wallet(clerk_user_id));
```

## Error Handling

### Common Sync Errors

```typescript
/**
 * Comprehensive error handling for wallet sync
 */

export class WalletSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'WalletSyncError';
  }
}

export async function syncWithErrorHandling(
  walletId: string,
  addresses: Record<string, string>,
  token: string
): Promise<void> {
  try {
    await syncWalletsToDatabase(walletId, addresses, token);
  } catch (error) {
    // Network errors - retryable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new WalletSyncError(
        'Network connection failed',
        'NETWORK_ERROR',
        true
      );
    }

    // Authentication errors - not retryable
    if (error instanceof Error && error.message.includes('authorization')) {
      throw new WalletSyncError(
        'Authentication failed. Please sign in again.',
        'AUTH_ERROR',
        false
      );
    }

    // Validation errors - not retryable
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw new WalletSyncError(
        'Invalid wallet address format',
        'VALIDATION_ERROR',
        false
      );
    }

    // Database errors - retryable with backoff
    if (error instanceof Error && error.message.includes('Supabase')) {
      throw new WalletSyncError(
        'Database temporarily unavailable',
        'DATABASE_ERROR',
        true
      );
    }

    // Unknown errors
    throw new WalletSyncError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      true
    );
  }
}
```

### Retry Logic with Exponential Backoff

```typescript
/**
 * Retry wallet sync with exponential backoff
 */
export async function syncWithRetry(
  walletId: string,
  addresses: Record<string, string>,
  token: string,
  maxRetries = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await syncWithErrorHandling(walletId, addresses, token);
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry if error is not retryable
      if (error instanceof WalletSyncError && !error.retryable) {
        throw error;
      }

      // Calculate backoff delay: 1s, 2s, 4s, 8s...
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);

      console.warn(
        `[Sync] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delay}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw new Error(`Wallet sync failed after ${maxRetries} attempts: ${lastError?.message}`);
}
```

## Testing the Integration

### End-to-End Test

```typescript
/**
 * Complete integration test
 */
async function testCrossmintSupabaseIntegration() {
  console.log('=== Starting Integration Test ===\n');

  // Step 1: Check Clerk authentication
  const { isSignedIn, getToken } = useAuth();
  console.log('✓ Clerk authenticated:', isSignedIn);

  if (!isSignedIn) {
    console.error('✗ User not signed in');
    return;
  }

  // Step 2: Get Clerk token
  const token = await getToken();
  console.log('✓ Clerk token retrieved');

  // Step 3: Check Crossmint wallet
  const { wallet } = useWallet();
  if (!wallet) {
    console.error('✗ Crossmint wallet not initialized');
    return;
  }

  console.log('✓ Crossmint wallet initialized');
  console.log('  Wallet ID:', wallet.id);
  console.log('  Primary address:', wallet.address);

  // Step 4: Test wallet sync
  try {
    await syncWalletsToDatabase(
      wallet.id,
      { solana: wallet.address },
      token
    );
    console.log('✓ Wallet synced to Supabase');
  } catch (error) {
    console.error('✗ Wallet sync failed:', error);
    return;
  }

  // Step 5: Verify database storage
  const payload = JSON.parse(atob(token.split('.')[1]));
  const clerkUserId = payload.sub;

  const { data: dbWallet, error } = await supabase
    .from('crossmint_wallets')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    console.error('✗ Database query failed:', error);
    return;
  }

  console.log('✓ Wallet retrieved from database');
  console.log('  DB Wallet ID:', dbWallet.crossmint_wallet_id);
  console.log('  Solana Address:', dbWallet.solana_address);
  console.log('  Base Address:', dbWallet.base_address);

  // Step 6: Verify address match
  if (dbWallet.solana_address === wallet.address) {
    console.log('✓ Addresses match');
  } else {
    console.error('✗ Address mismatch!');
    console.error('  Crossmint:', wallet.address);
    console.error('  Database:', dbWallet.solana_address);
    return;
  }

  console.log('\n=== Integration Test Complete ===');
  console.log('✓ All checks passed');
}
```

### Unit Tests for Edge Function

```typescript
/**
 * Unit tests for sync-crossmint-wallet edge function
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('sync-crossmint-wallet - valid request', async () => {
  const mockRequest = new Request('http://localhost:54321/functions/v1/sync-crossmint-wallet', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer mock_jwt_token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clerkUserId: 'user_test123',
      walletId: 'crossmint_wallet_abc',
      addresses: {
        solana: '6h3abc...xyz',
        base: '0x1234...5678',
      },
    }),
  });

  const response = await handler(mockRequest);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.walletId);
});

Deno.test('sync-crossmint-wallet - missing authorization', async () => {
  const mockRequest = new Request('http://localhost:54321/functions/v1/sync-crossmint-wallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clerkUserId: 'user_test123',
      walletId: 'crossmint_wallet_abc',
      addresses: { solana: '6h3abc...xyz' },
    }),
  });

  const response = await handler(mockRequest);
  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('sync-crossmint-wallet - invalid address format', async () => {
  const mockRequest = new Request('http://localhost:54321/functions/v1/sync-crossmint-wallet', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer mock_jwt_token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clerkUserId: 'user_test123',
      walletId: 'crossmint_wallet_abc',
      addresses: {
        solana: 'invalid_address',  // Should fail validation
      },
    }),
  });

  const response = await handler(mockRequest);
  const data = await response.json();

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  assertExists(data.error);
});
```

## Additional Resources

### Reference Files

- **`plugins/blockdrive-solana/skills/clerk-alchemy-supabase-flow/SKILL.md`** - Original Alchemy pattern
- **`docs/CROSSMINT_INTEGRATION_PLAN.md`** - Technical implementation guide
- **`docs/ARCHITECTURE.md`** - System architecture overview
- **`docs/PRD.md`** - Product requirements document
- **`supabase/migrations/`** - Database schema migrations

### External Documentation

- **Crossmint Docs**: https://docs.crossmint.com
- **Supabase Docs**: https://supabase.com/docs
- **Clerk Docs**: https://clerk.com/docs
- **Row Level Security Guide**: https://supabase.com/docs/guides/auth/row-level-security

### Related Skills

- **`embedded-wallets`** - Crossmint wallet creation and management
- **`nft-collections`** - NFT minting with Crossmint
- **`smart-wallets`** - Programmable wallet configuration

---

**Skill Version**: 1.0.0
**Last Updated**: January 26, 2026
**Maintained By**: BlockDrive Engineering Team
**Related Skills**: `embedded-wallets`, `nft-collections`, `payment-subscriptions`
