---
name: Crossmint Embedded Wallets
description: This skill should be used when the user asks about "Crossmint embedded wallets", "MPC wallets", "multichain wallets", "wallet creation", "Clerk integration with Crossmint", "smart contract wallets", "gas sponsorship", "NFT minting", or needs to implement non-custodial multichain embedded wallets with Crossmint's infrastructure. Covers the complete Crossmint SDK integration pattern used in BlockDrive with support for Solana, Ethereum, Base, and other EVM chains from Day 1.
version: 1.0.0
---

# Crossmint Embedded Wallets

## Overview

Crossmint provides multichain embedded wallets that enable users to interact with blockchain applications without managing private keys directly. The wallets are created and controlled through multi-party computation (MPC), with users authenticating via OIDC providers like Clerk. Unlike single-chain solutions, Crossmint creates wallets across ALL supported chains (Solana, Ethereum, Base, Polygon, etc.) from a single authentication event.

**Key Advantages for BlockDrive**:
- **True Multichain Support**: One authentication → wallets on Solana + 50+ EVM chains
- **Simplified SDK**: `createOnLogin` automatically provisions wallets
- **Built-in Gas Sponsorship**: Users don't pay transaction fees during onboarding
- **NFT Infrastructure**: Direct minting without external services
- **Compliance Features**: Built-in AML monitoring and KYC flows for enterprise
- **Smart Contract Wallets**: ERC-4337 account abstraction on EVM chains

## When to Use

Activate this skill when:
- Setting up multichain embedded wallet infrastructure
- Implementing wallet creation with Clerk JWT authentication
- Configuring gas sponsorship across multiple chains
- Signing or sending transactions on Solana or EVM chains
- Minting NFTs programmatically (membership NFTs, collectibles)
- Migrating from Alchemy Account Kit to Crossmint
- Troubleshooting wallet initialization or transaction issues
- Implementing cross-chain file storage or asset management

## Core Architecture

### Authentication & Wallet Creation Flow

```
┌──────────────────────────────────────────────────────────────────┐
│               CROSSMINT MULTICHAIN AUTH FLOW                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐     ┌───────────────┐     ┌──────────┐            │
│  │  CLERK   │────▶│  CROSSMINT    │────▶│ SUPABASE │            │
│  │ Identity │     │ Embedded SDK  │     │ Database │            │
│  └──────────┘     └───────────────┘     └──────────┘            │
│       │                  │                    │                  │
│       │                  │                    │                  │
│  1. User signs     2. Creates wallets   3. Multi-chain          │
│     in via Clerk      on ALL chains        addresses stored     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Automatic Wallet Creation                                 │ │
│  │  • createOnLogin: true                                     │ │
│  │  • Single auth → Multiple chain wallets                   │ │
│  │  • Chains: Solana (devnet/mainnet)                        │ │
│  │          Ethereum, Base, Polygon, Arbitrum, Optimism      │ │
│  │  • MPC signing for all transactions                       │ │
│  │  • Gas sponsored by default                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Migration from Alchemy Account Kit

```
┌─────────────────────────────────────────────────────────────────┐
│            ALCHEMY → CROSSMINT MIGRATION PATH                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ALCHEMY ACCOUNT KIT (Current)                                  │
│  ├─ Solana only (single chain)                                  │
│  ├─ Manual policy configuration for gas                         │
│  ├─ External NFT minting services                               │
│  └─ Web Signer + iframe stamper                                 │
│                                                                  │
│                         ↓ MIGRATION ↓                            │
│                                                                  │
│  CROSSMINT SDK (New)                                             │
│  ├─ Solana + EVM chains (multichain)                            │
│  ├─ Built-in gas sponsorship                                    │
│  ├─ Integrated NFT minting API                                  │
│  ├─ Smart contract wallets (ERC-4337)                           │
│  └─ Simplified authentication flow                              │
│                                                                  │
│  COMPATIBILITY NOTES:                                            │
│  • Same Clerk → Wallet → Supabase pattern                       │
│  • Similar transaction signing API                              │
│  • Existing users can maintain Alchemy wallets                  │
│  • New users automatically get Crossmint wallets                │
│  • Migration tool available for asset transfers                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Required Packages

```bash
npm install @crossmint/client-sdk-react-ui @crossmint/client-sdk-auth @crossmint/wallets-sdk
```

### Environment Variables

```env
# Crossmint Configuration
VITE_CROSSMINT_CLIENT_API_KEY=your_staging_api_key
VITE_CROSSMINT_ENVIRONMENT=staging  # or 'production'
CROSSMINT_SERVER_API_KEY=your_server_api_key
CROSSMINT_WEBHOOK_SECRET=your_webhook_secret

# Clerk (existing)
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase (existing)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Configuration Setup

**File**: `src/config/crossmint.ts`

```typescript
/**
 * Crossmint Configuration for BlockDrive
 *
 * Configures multichain embedded wallets with Clerk authentication
 * and automatic wallet creation on signup.
 */

import { CrossmintWallet, SolanaChain, EVMChain } from '@crossmint/wallets-sdk';

// Environment
const CROSSMINT_CLIENT_API_KEY = import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY || '';
const CROSSMINT_ENVIRONMENT = import.meta.env.VITE_CROSSMINT_ENVIRONMENT || 'staging';

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
}

export const crossmintConfig: CrossmintConfig = {
  apiKey: CROSSMINT_CLIENT_API_KEY,
  environment: CROSSMINT_ENVIRONMENT as 'staging' | 'production',
  chains: DEFAULT_CHAIN_CONFIG,
};

/**
 * Get the appropriate chain identifier based on environment
 */
export function getCurrentChain(): string {
  return crossmintConfig.environment === 'production'
    ? SUPPORTED_CHAINS.solana.mainnet
    : SUPPORTED_CHAINS.solana.devnet;
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
 * Create wallet configuration for automatic creation on login
 */
export function getWalletCreationConfig(userEmail: string) {
  return {
    createOnLogin: {
      chain: getCurrentChain(),
      signer: {
        type: 'email',
        email: userEmail,
      },
      alias: `blockdrive_${userEmail.split('@')[0]}`,
    },
  };
}

export default crossmintConfig;
```

### React Provider Setup

**File**: `src/providers/CrossmintProvider.tsx`

```typescript
/**
 * Crossmint Provider for BlockDrive
 *
 * Wraps the application with Crossmint authentication and wallet management.
 * Integrates with Clerk for user identity.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  CrossmintProvider as CrossmintSDKProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from '@crossmint/client-sdk-react-ui';
import { crossmintConfig, getWalletCreationConfig } from '@/config/crossmint';
import { syncCrossmintWallet } from '@/services/crossmint/walletSync';

interface CrossmintProviderProps {
  children: React.ReactNode;
}

export function CrossmintProvider({ children }: CrossmintProviderProps) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Crossmint when user signs in
  useEffect(() => {
    if (!isSignedIn || !user || isInitialized) return;

    const initializeCrossmint = async () => {
      try {
        // Crossmint will automatically create wallet on login
        // due to createOnLogin configuration
        console.log('[Crossmint] Initializing for user:', user.id);

        setIsInitialized(true);
      } catch (error) {
        console.error('[Crossmint] Initialization error:', error);
      }
    };

    initializeCrossmint();
  }, [isSignedIn, user, isInitialized]);

  // Handle wallet creation callback
  const handleWalletCreate = useCallback(async (wallet: any) => {
    console.log('[Crossmint] Wallet created:', wallet);

    try {
      const token = await getToken();
      if (!token || !user) return;

      // Sync wallet to Supabase
      await syncCrossmintWallet({
        clerkUserId: user.id,
        walletId: wallet.id,
        addresses: {
          solana: wallet.address, // Primary address
          // Additional chain addresses will be fetched separately
        },
        token,
      });

      console.log('[Crossmint] Wallet synced to database');
    } catch (error) {
      console.error('[Crossmint] Wallet sync error:', error);
    }
  }, [getToken, user]);

  if (!isSignedIn) {
    // User not signed in, don't initialize Crossmint
    return <>{children}</>;
  }

  const walletConfig = user?.primaryEmailAddress?.emailAddress
    ? getWalletCreationConfig(user.primaryEmailAddress.emailAddress)
    : undefined;

  return (
    <CrossmintSDKProvider apiKey={crossmintConfig.apiKey}>
      <CrossmintAuthProvider>
        <CrossmintWalletProvider
          {...walletConfig}
          onWalletCreate={handleWalletCreate}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintSDKProvider>
  );
}

export default CrossmintProvider;
```

### React Hook for Wallet Operations

**File**: `src/hooks/useCrossmintWallet.tsx`

```typescript
/**
 * Crossmint Wallet Hook for BlockDrive
 *
 * Provides wallet operations: send, sign, balance checks
 * Follows same pattern as useAlchemyWallet for consistency
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useWallet } from '@crossmint/client-sdk-react-ui';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { createAlchemySolanaConnection } from '@/config/alchemy';

interface CrossmintWalletState {
  // Wallet info
  walletAddress: string | null;
  chainAddresses: {
    solana?: string;
    ethereum?: string;
    base?: string;
    polygon?: string;
  };

  // Connection
  connection: Connection | null;
  isInitialized: boolean;

  // Operations
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (tx: Transaction | VersionedTransaction) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  getBalance: () => Promise<number>;

  // Multichain operations
  switchChain: (chain: string) => Promise<void>;
  getCurrentChain: () => string;
}

export function useCrossmintWallet(): CrossmintWalletState {
  const { isSignedIn } = useAuth();
  const { wallet } = useWallet(); // Crossmint wallet hook

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainAddresses, setChainAddresses] = useState<{
    solana?: string;
    ethereum?: string;
    base?: string;
  }>({});
  const [connection] = useState<Connection>(() => createAlchemySolanaConnection());
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentChain, setCurrentChain] = useState<string>('solana:devnet');

  // Initialize wallet
  useEffect(() => {
    if (!isSignedIn || !wallet || isInitialized) return;

    const initWallet = async () => {
      try {
        // Get primary wallet address
        const address = wallet.address;
        setWalletAddress(address);

        // Fetch addresses for all chains
        // Crossmint creates one wallet per chain from same key
        const addresses: typeof chainAddresses = {
          solana: address, // Primary is Solana
        };

        setChainAddresses(addresses);
        setIsInitialized(true);

        console.log('[useCrossmintWallet] Initialized:', address);
      } catch (error) {
        console.error('[useCrossmintWallet] Init error:', error);
      }
    };

    initWallet();
  }, [isSignedIn, wallet, isInitialized]);

  // Sign transaction (without sending)
  const signTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Crossmint signing method
      const signed = await wallet.sign(transaction);
      return signed as Transaction | VersionedTransaction;
    } catch (error) {
      console.error('[useCrossmintWallet] Sign error:', error);
      throw error;
    }
  }, [wallet]);

  // Sign and send transaction (with gas sponsorship)
  const signAndSendTransaction = useCallback(async (
    transaction: Transaction | VersionedTransaction
  ): Promise<string> => {
    if (!wallet || !connection) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Crossmint automatically handles gas sponsorship
      const signature = await wallet.sendTransaction(transaction);

      console.log('[useCrossmintWallet] Transaction sent:', signature);
      return signature;
    } catch (error) {
      console.error('[useCrossmintWallet] Send error:', error);
      throw error;
    }
  }, [wallet, connection]);

  // Sign arbitrary message
  const signMessage = useCallback(async (
    message: Uint8Array
  ): Promise<Uint8Array> => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      const signature = await wallet.signMessage(message);
      return signature as Uint8Array;
    } catch (error) {
      console.error('[useCrossmintWallet] Sign message error:', error);
      throw error;
    }
  }, [wallet]);

  // Get SOL balance
  const getBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress || !connection) {
      return 0;
    }

    try {
      const balance = await connection.getBalance(new PublicKey(walletAddress));
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('[useCrossmintWallet] Get balance error:', error);
      return 0;
    }
  }, [walletAddress, connection]);

  // Switch active chain
  const switchChain = useCallback(async (chain: string) => {
    if (!wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Crossmint handles chain switching
      await wallet.switchChain(chain);
      setCurrentChain(chain);

      console.log('[useCrossmintWallet] Switched to chain:', chain);
    } catch (error) {
      console.error('[useCrossmintWallet] Switch chain error:', error);
      throw error;
    }
  }, [wallet]);

  // Get current active chain
  const getCurrentChain = useCallback(() => {
    return currentChain;
  }, [currentChain]);

  return {
    walletAddress,
    chainAddresses,
    connection,
    isInitialized,
    signTransaction,
    signAndSendTransaction,
    signMessage,
    getBalance,
    switchChain,
    getCurrentChain,
  };
}

export default useCrossmintWallet;
```

## Transaction Operations

### Sign Transaction

Sign without sending (for inspection or multi-sig):

```typescript
const signTransaction = async (
  transaction: Transaction | VersionedTransaction
): Promise<Transaction | VersionedTransaction> => {
  if (!wallet) {
    throw new Error('Wallet not initialized');
  }

  const signedTx = await wallet.sign(transaction);
  return signedTx;
};
```

### Sign and Send with Gas Sponsorship

Send transaction with Crossmint paying gas fees:

```typescript
const signAndSendTransaction = async (
  transaction: Transaction | VersionedTransaction
): Promise<string> => {
  if (!wallet || !connection) {
    throw new Error('Wallet not initialized');
  }

  // Crossmint automatically handles gas sponsorship
  const signature = await wallet.sendTransaction(transaction);

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
};
```

### Sign Message

Sign arbitrary messages for verification:

```typescript
const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
  if (!wallet) {
    throw new Error('Wallet not initialized');
  }

  const signature = await wallet.signMessage(message);
  return signature as Uint8Array;
};
```

## Database Integration

### Schema: `crossmint_wallets` Table

```sql
CREATE TABLE crossmint_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,

  -- Wallet identifiers
  crossmint_wallet_id TEXT UNIQUE NOT NULL,
  wallet_alias TEXT,

  -- Multichain addresses
  solana_address TEXT,
  ethereum_address TEXT,
  base_address TEXT,
  polygon_address TEXT,
  arbitrum_address TEXT,
  optimism_address TEXT,

  -- Metadata
  wallet_type TEXT DEFAULT 'crossmint_embedded'
    CHECK (wallet_type IN ('crossmint_embedded', 'crossmint_smart_contract')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Constraints
  CONSTRAINT unique_user_crossmint UNIQUE (user_id, clerk_user_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_crossmint_wallets_clerk_user ON crossmint_wallets(clerk_user_id);
CREATE INDEX idx_crossmint_wallets_solana ON crossmint_wallets(solana_address);
CREATE INDEX idx_crossmint_wallets_ethereum ON crossmint_wallets(ethereum_address);
CREATE INDEX idx_crossmint_wallets_base ON crossmint_wallets(base_address);
CREATE INDEX idx_crossmint_wallets_id ON crossmint_wallets(crossmint_wallet_id);

-- RLS Policies
ALTER TABLE crossmint_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets"
  ON crossmint_wallets
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own wallets"
  ON crossmint_wallets
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own wallets"
  ON crossmint_wallets
  FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');
```

### Update Existing `profiles` Table

```sql
-- Add Crossmint wallet reference
ALTER TABLE profiles
  ADD COLUMN crossmint_wallet_id UUID REFERENCES crossmint_wallets(id),
  ADD COLUMN preferred_wallet_provider TEXT DEFAULT 'alchemy'
    CHECK (preferred_wallet_provider IN ('alchemy', 'crossmint'));

-- Index for quick provider lookups
CREATE INDEX idx_profiles_wallet_provider ON profiles(preferred_wallet_provider);
```

### Wallet Sync Service

**File**: `src/services/crossmint/walletSync.ts`

```typescript
/**
 * Crossmint Wallet Sync Service
 *
 * Syncs Crossmint wallet addresses to Supabase database
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

export async function syncCrossmintWallet(params: SyncWalletParams): Promise<void> {
  const { clerkUserId, walletId, addresses, token } = params;

  try {
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
```

### Supabase Edge Function

**File**: `supabase/functions/sync-crossmint-wallet/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncWalletRequest {
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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { clerkUserId, walletId, addresses }: SyncWalletRequest = await req.json();

    // Validate Clerk user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tokenUserId = payload.sub;

    if (tokenUserId !== clerkUserId) {
      throw new Error('User ID mismatch');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Upsert Crossmint wallet
    const { error: walletError } = await supabase
      .from('crossmint_wallets')
      .upsert(
        {
          user_id: profile.id,
          clerk_user_id: clerkUserId,
          crossmint_wallet_id: walletId,
          solana_address: addresses.solana,
          ethereum_address: addresses.ethereum,
          base_address: addresses.base,
          polygon_address: addresses.polygon,
          arbitrum_address: addresses.arbitrum,
          optimism_address: addresses.optimism,
          wallet_type: 'crossmint_embedded',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'clerk_user_id',
        }
      );

    if (walletError) {
      throw walletError;
    }

    // Update user profile with Crossmint preference
    await supabase
      .from('profiles')
      .update({ preferred_wallet_provider: 'crossmint' })
      .eq('id', profile.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wallet synced successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[sync-crossmint-wallet] Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
```

## NFT Minting Integration

Crossmint provides built-in NFT minting capabilities for membership NFTs and collectibles.

### Mint Membership NFT

```typescript
import { CrossmintNFTClient } from '@crossmint/client-sdk-react-ui';

interface MintMembershipNFTParams {
  walletAddress: string;
  tier: 'trial' | 'pro' | 'power' | 'scale';
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
}

export async function mintMembershipNFT(params: MintMembershipNFTParams): Promise<string> {
  const { walletAddress, tier, metadata } = params;

  try {
    const nftClient = new CrossmintNFTClient({
      apiKey: import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY,
    });

    // Mint NFT on Solana
    const result = await nftClient.mint({
      chain: 'solana:devnet',
      recipient: walletAddress,
      metadata: {
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        attributes: [
          ...metadata.attributes,
          { trait_type: 'Tier', value: tier },
          { trait_type: 'Platform', value: 'BlockDrive' },
          { trait_type: 'Type', value: 'Membership' },
        ],
      },
      // Make it soulbound (non-transferable)
      transferable: false,
    });

    console.log('[mintMembershipNFT] NFT minted:', result.mintId);
    return result.mintId;
  } catch (error) {
    console.error('[mintMembershipNFT] Error:', error);
    throw error;
  }
}
```

### Check NFT Ownership

```typescript
export async function checkMembershipNFT(walletAddress: string): Promise<boolean> {
  const nftClient = new CrossmintNFTClient({
    apiKey: import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY,
  });

  try {
    const nfts = await nftClient.getNFTs({
      chain: 'solana:devnet',
      owner: walletAddress,
    });

    // Check for BlockDrive membership NFT
    const membershipNFT = nfts.find(
      (nft) => nft.metadata?.attributes?.some(
        (attr) => attr.trait_type === 'Platform' && attr.value === 'BlockDrive'
      )
    );

    return !!membershipNFT;
  } catch (error) {
    console.error('[checkMembershipNFT] Error:', error);
    return false;
  }
}
```

## Multichain Operations

### Switch Active Chain

```typescript
const switchToBase = async () => {
  if (!wallet) {
    throw new Error('Wallet not initialized');
  }

  // Switch to Base L2
  await wallet.switchChain('base');

  console.log('Switched to Base network');
};
```

### Get Address for Specific Chain

```typescript
const getChainAddress = async (chain: string): Promise<string> => {
  if (!wallet) {
    throw new Error('Wallet not initialized');
  }

  // Switch to the desired chain
  await wallet.switchChain(chain);

  // Get the address for that chain
  const address = wallet.address;

  return address;
};

// Example usage
const baseAddress = await getChainAddress('base');
const polygonAddress = await getChainAddress('polygon');
```

### Cross-Chain File Registration

```typescript
interface RegisterFileMultichainParams {
  fileCid: string;
  commitment: string;
  chains: Array<'solana' | 'ethereum' | 'base'>;
}

export async function registerFileMultichain(params: RegisterFileMultichainParams) {
  const { fileCid, commitment, chains } = params;
  const results: Record<string, string> = {};

  for (const chain of chains) {
    // Switch to chain
    await wallet.switchChain(chain);

    // Register file on that chain's registry contract
    let txHash: string;

    if (chain === 'solana') {
      // Solana: Call Anchor program
      txHash = await registerFileOnSolana(fileCid, commitment);
    } else {
      // EVM: Call smart contract
      txHash = await registerFileOnEVM(chain, fileCid, commitment);
    }

    results[chain] = txHash;
  }

  return results;
}
```

## Gas Sponsorship

### Configuration

Gas sponsorship is automatically enabled for Crossmint wallets. Configure limits in the Crossmint dashboard:

1. Navigate to Dashboard → Gas Sponsorship
2. Set daily spending limits per chain
3. Configure allowed operations (transfers, contract calls, etc.)
4. Set per-transaction limits
5. Whitelist specific contracts or programs

### Using Sponsorship

```typescript
// Gas is automatically sponsored - no additional code needed
const signature = await wallet.sendTransaction(transaction);

// The user doesn't pay any gas fees
// Crossmint covers the cost based on your sponsorship policy
```

### Monitoring Usage

```typescript
import { CrossmintAnalytics } from '@crossmint/client-sdk-react-ui';

const analytics = new CrossmintAnalytics({
  apiKey: import.meta.env.CROSSMINT_SERVER_API_KEY,
});

// Get gas sponsorship usage
const usage = await analytics.getGasUsage({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  chain: 'solana:devnet',
});

console.log('Gas sponsored:', usage.totalSponsored);
console.log('Transactions:', usage.transactionCount);
```

## Troubleshooting

### Wallet Not Initializing

1. Verify Clerk session is active (`isSignedIn === true`)
2. Check Crossmint API key is valid and not expired
3. Ensure `createOnLogin` configuration is correct
4. Verify user email is available (`user.primaryEmailAddress.emailAddress`)
5. Check console for Crossmint SDK errors

**Solution**:
```typescript
const config = validateCrossmintConfig();
if (!config.valid) {
  console.error('Missing config:', config.missing);
  // Show user-friendly error
}
```

### Transaction Signing Fails

1. Check wallet is initialized (`isInitialized === true`)
2. Verify transaction is properly constructed
3. Ensure correct chain is selected
4. Check network matches (devnet vs mainnet)
5. Verify gas sponsorship limits haven't been exceeded

**Solution**:
```typescript
try {
  const signature = await wallet.sendTransaction(transaction);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    // Gas sponsorship limit reached
    console.error('Gas sponsorship limit exceeded');
  } else if (error.message.includes('invalid transaction')) {
    // Transaction construction error
    console.error('Invalid transaction structure');
  }
}
```

### Multichain Address Not Found

1. Verify wallet has been created for that chain
2. Check chain is supported by Crossmint
3. Ensure wallet has switched to correct chain
4. Wait for wallet creation to complete (async operation)

**Solution**:
```typescript
const initMultichainAddresses = async () => {
  const chains = ['solana:devnet', 'base', 'ethereum'];
  const addresses: Record<string, string> = {};

  for (const chain of chains) {
    try {
      await wallet.switchChain(chain);
      addresses[chain] = wallet.address;
    } catch (error) {
      console.error(`Chain ${chain} not available:`, error);
    }
  }

  return addresses;
};
```

### Database Sync Failures

1. Check Supabase edge function is deployed
2. Verify RLS policies allow wallet insertion
3. Ensure Clerk JWT is valid and not expired
4. Check network connectivity to Supabase

**Solution**:
```typescript
// Add retry logic
async function syncWithRetry(params: SyncWalletParams, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await syncCrossmintWallet(params);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## BlockDrive Implementation

### Complete Integration Example

**File**: `src/App.tsx`

```typescript
import { ClerkProvider } from '@clerk/clerk-react';
import { CrossmintProvider } from '@/providers/CrossmintProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <CrossmintProvider>
        <QueryClientProvider client={queryClient}>
          {/* Your app components */}
        </QueryClientProvider>
      </CrossmintProvider>
    </ClerkProvider>
  );
}

export default App;
```

### Using the Wallet in Components

```typescript
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';

function FileUploadComponent() {
  const {
    walletAddress,
    chainAddresses,
    signAndSendTransaction,
    isInitialized
  } = useCrossmintWallet();

  const handleUpload = async (file: File) => {
    if (!isInitialized) {
      throw new Error('Wallet not ready');
    }

    // 1. Encrypt file client-side
    const encrypted = await encryptFile(file);

    // 2. Upload to IPFS/R2
    const cid = await uploadToStorage(encrypted);

    // 3. Register on Solana
    const tx = await createRegisterFileTransaction({
      fileCid: cid,
      commitment: encrypted.commitment,
      owner: walletAddress!,
    });

    // 4. Sign and send (gas sponsored)
    const signature = await signAndSendTransaction(tx);

    console.log('File registered:', signature);
  };

  return (
    <div>
      <p>Wallet: {walletAddress}</p>
      <p>Solana: {chainAddresses.solana}</p>
      <p>Base: {chainAddresses.base}</p>
      <button onClick={() => handleUpload(selectedFile)}>
        Upload File
      </button>
    </div>
  );
}
```

## Comparison with Alchemy Account Kit

| Feature | Alchemy Account Kit | Crossmint SDK |
|---------|-------------------|---------------|
| **Solana Support** | ✅ Yes | ✅ Yes |
| **EVM Support** | ✅ Yes (primary focus) | ✅ Yes (50+ chains) |
| **Multichain from Day 1** | ❌ Per-chain setup | ✅ Automatic |
| **Gas Sponsorship** | ✅ Via policies | ✅ Built-in |
| **NFT Minting** | ❌ External | ✅ Integrated |
| **Smart Contract Wallets** | ✅ ERC-4337 | ✅ ERC-4337 + Squads |
| **Compliance** | ❌ Not included | ✅ AML/KYC built-in |
| **SDK Complexity** | Moderate | Simple |
| **BlockDrive Integration** | ✅ Currently used | ⚠️ Migration needed |

## Migration Guide

### For Existing BlockDrive Users

If you're migrating from Alchemy Account Kit to Crossmint:

1. **Install Crossmint SDK**: Run `npm install @crossmint/client-sdk-react-ui`
2. **Add Environment Variables**: Configure Crossmint API keys
3. **Update Providers**: Replace `AlchemyProvider` with `CrossmintProvider`
4. **Update Hooks**: Replace `useAlchemySolanaWallet` with `useCrossmintWallet`
5. **Database Migration**: Run migration to add `crossmint_wallets` table
6. **Test Thoroughly**: Verify all transaction operations work
7. **Deploy Gradually**: Roll out to 10% of users first

### Maintaining Both Providers (Hybrid Approach)

```typescript
function WalletProviderSelector({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const preferredProvider = user?.publicMetadata?.walletProvider || 'crossmint';

  if (preferredProvider === 'alchemy') {
    return <AlchemyProvider>{children}</AlchemyProvider>;
  } else {
    return <CrossmintProvider>{children}</CrossmintProvider>;
  }
}
```

## Additional Resources

### Reference Files

For detailed patterns and troubleshooting:
- **`docs/CROSSMINT_INTEGRATION_PLAN.md`** - Complete integration strategy
- **`docs/ARCHITECTURE.md`** - System architecture overview
- **`docs/PRD.md`** - Product requirements document
- **`supabase/migrations/`** - Database schema migrations

### External Documentation

- **Crossmint Docs**: https://docs.crossmint.com
- **React SDK Guide**: https://docs.crossmint.com/wallets/quickstarts/client-side-wallets
- **Solana Integration**: https://blog.crossmint.com/solana-embedded-smart-wallets/
- **NFT Minting API**: https://docs.crossmint.com/nfts/minting
- **API Reference**: https://docs.crossmint.com/api-reference

### Support

- **Crossmint Support**: support@crossmint.com
- **Crossmint Discord**: https://discord.gg/crossmint
- **GitHub Issues**: https://github.com/Crossmint/crossmint-sdk/issues
- **BlockDrive Team**: sean@blockdrive.co

## TypeScript Types

### Wallet Types

```typescript
export interface CrossmintWalletInfo {
  id: string;
  address: string;
  chain: string;
  type: 'embedded' | 'smart_contract';
  createdAt: string;
}

export interface MultiChainAddresses {
  solana?: string;
  ethereum?: string;
  base?: string;
  polygon?: string;
  arbitrum?: string;
  optimism?: string;
}

export interface WalletSyncPayload {
  clerkUserId: string;
  walletId: string;
  addresses: MultiChainAddresses;
}
```

### Transaction Types

```typescript
export interface TransactionOptions {
  skipPreflight?: boolean;
  maxRetries?: number;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface SendTransactionResult {
  signature: string;
  slot?: number;
  confirmationStatus?: string;
}
```

### NFT Types

```typescript
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface MintNFTResult {
  mintId: string;
  mintAddress: string;
  transactionHash: string;
}
```

---

**Skill Version**: 1.0.0
**Last Updated**: January 26, 2026
**Maintained By**: BlockDrive Engineering Team
**Related Skills**: `smart-wallets`, `nft-collections`, `supabase-integration`
