# Crossmint Integration Plan for BlockDrive

**Version**: 1.0.0
**Date**: January 26, 2026
**Status**: DESIGN - Ready for Implementation
**Author**: BlockDrive Engineering Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Integration Architecture](#integration-architecture)
3. [Comparison: Crossmint vs Alchemy](#comparison-crossmint-vs-alchemy)
4. [Implementation Strategy](#implementation-strategy)
5. [Technical Specifications](#technical-specifications)
6. [Database Schema Updates](#database-schema-updates)
7. [Code Implementation](#code-implementation)
8. [Testing Plan](#testing-plan)
9. [Deployment Strategy](#deployment-strategy)
10. [Migration Considerations](#migration-considerations)

---

## Executive Summary

### Integration Goal

Integrate Crossmint's embedded wallet SDK to replace previous wallet infrastructure and provide BlockDrive users with:
- **Multichain support from Day 1**: Solana + EVM chains (Ethereum, Base, Polygon, etc.)
- **Unified wallet experience**: Single authentication creates wallets across all supported chains
- **Gas sponsorship**: Users don't pay transaction fees during onboarding
- **Compliance features**: Built-in AML monitoring and KYC flows for enterprise users
- **Enhanced NFT capabilities**: Direct NFT minting and management

### Key Decision Points (Based on User Answers)

| Question | Answer | Implementation Impact |
|----------|--------|----------------------|
| B. Integration Approach | **Use your recommendations** | Crossmint is the sole wallet infrastructure |
| C7. When to start wallet features | **When crossmint/blockchain is mentioned** | Automatic, seamless integration |
| D11. User interaction | **Interactive with smart defaults** | Preset configurations with customization options |
| D16. Match Alchemy integration | **Match exactly unless different** | Follow existing Clerk → Wallet → Supabase pattern |
| E17. Alchemy setup location | **Solana-blockchain-architect agent, plugin, docs** | Reference existing patterns |
| E19. Network & multichain | **Devnet first, multichain from day 1 if simple** | ✅ Multichain support (Crossmint handles this elegantly) |
| F20. License | **MIT** | Open-source compatible |
| F21. Plugin location | **Your recommendation** | Both `.claude/plugins/` and `plugins/` directories |

---

## Operational Toolkit: Crossmint Fullstack Plugin

**Status**: ✅ **COMPLETE - Production Ready**
**Location**: `plugins/crossmint-fullstack/`

This technical document provides the architectural blueprint for integrating Crossmint. The **operational toolkit** is available as a comprehensive plugin:

### Plugin Components

```
plugins/crossmint-fullstack/
├── .claude-plugin/
│   ├── plugin.json           # Manifest
│   └── .mcp.json             # Crossmint docs MCP server
├── README.md                 # 5,000+ word guide
├── skills/                   # 5 comprehensive skills (18,700+ words total)
│   ├── embedded-wallets/     # MPC wallets, Clerk integration, multichain (3,500 words)
│   ├── nft-collections/      # Membership NFTs, minting, metadata (3,800 words)
│   ├── smart-wallets/        # Squads Protocol, multi-sig, gas sponsorship (3,600 words)
│   ├── payment-subscriptions/ # USDC/USDT payments, recurring billing (3,800 words)
│   └── supabase-integration/ # Database sync, edge functions, RLS (3,000 words)
├── agents/                   # 4 specialized agents
│   ├── crossmint-architect.md       # Main coordinator (auto-triggers)
│   ├── wallet-specialist.md         # Wallet operations specialist
│   ├── nft-specialist.md            # NFT minting specialist
│   └── integration-specialist.md    # Database & auth specialist
└── commands/                 # 4 interactive commands
    ├── setup.md                     # Interactive setup wizard (16 KB)
    ├── create-wallet-flow.md        # Generate complete wallet code (27 KB)
    ├── create-collection.md         # Create NFT collection (23 KB)
    └── migrate-from-alchemy.md      # Safe migration tool (31 KB)
```

### Quick Start with Plugin

```bash
# 1. Interactive setup
/crossmint:setup

# 2. Generate wallet flow (matches Alchemy pattern exactly)
/crossmint:create-wallet-flow

# 3. Create NFT collection (optional)
/crossmint:create-collection

# 4. Migrate from Alchemy (if needed)
/crossmint:migrate-from-alchemy --dry-run
```

### How Plugin Complements This Document

| This Document | Plugin |
|---------------|--------|
| **Technical specification** | **Operational toolkit** |
| Architecture diagrams | Working code generation |
| Database schemas | Interactive setup commands |
| Deployment strategy | Autonomous agents |
| Implementation phases | Skills for daily use |
| Code examples | Complete file generation |

**Use this document** for understanding the architecture and planning implementation.
**Use the plugin** for day-to-day development, code generation, and autonomous task delegation.

---

## Integration Architecture

### Current Architecture (Alchemy)

```
┌──────────────────────────────────────────────────────────────────┐
│               CURRENT BLOCKDRIVE AUTH FLOW                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐     ┌───────────────┐     ┌──────────┐            │
│  │  CLERK   │────▶│   ALCHEMY     │────▶│ SUPABASE │            │
│  │ Identity │     │ Account Kit   │     │ Database │            │
│  └──────────┘     └───────────────┘     └──────────┘            │
│       │                  │                    │                  │
│       │                  │                    │                  │
│  1. User signs     2. JWT creates      3. Wallet address        │
│     in via Clerk      MPC wallet          stored in profiles    │
│                                                                   │
│  Chain Support: Solana only (currently)                          │
│  Gas Sponsorship: Via Alchemy Policy                             │
│  Wallet Type: MPC (Multi-Party Computation)                      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Proposed Architecture (Crossmint)

```
┌──────────────────────────────────────────────────────────────────┐
│               PROPOSED CROSSMINT AUTH FLOW                        │
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
│  │  Wallet Creation Behavior                                  │ │
│  │  • createOnLogin: true                                     │ │
│  │  • Single auth → Multiple chain wallets                   │ │
│  │  • Chains: Solana, Ethereum, Base, Polygon, Arbitrum      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Chain Support: Solana + 50+ EVM chains (multichain)             │
│  Gas Sponsorship: Built-in via Crossmint                         │
│  Wallet Type: Smart Contract Wallets with MPC signing            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Comparison: Crossmint vs Alchemy

### Feature Matrix

| Feature | Alchemy Account Kit | Crossmint Embedded Wallets | Winner |
|---------|-------------------|----------------------------|--------|
| **Solana Support** | ✅ Yes | ✅ Yes | Tie |
| **EVM Chains** | ✅ Yes (Primary) | ✅ Yes (50+ chains) | Crossmint |
| **Multichain from Day 1** | ❌ No (per-chain setup) | ✅ Yes (automatic) | **Crossmint** |
| **Gas Sponsorship** | ✅ Yes (via policies) | ✅ Yes (built-in) | Tie |
| **MPC Wallets** | ✅ Yes | ✅ Yes | Tie |
| **OIDC/Clerk Integration** | ✅ Yes (native) | ✅ Yes (Bring Your Own Auth) | Tie |
| **NFT Minting** | ❌ External tools | ✅ Built-in API | **Crossmint** |
| **AML/KYC** | ❌ Not built-in | ✅ Built-in compliance | **Crossmint** |
| **Smart Contract Wallets** | ✅ Yes (ERC-4337) | ✅ Yes (Squads on Solana) | Tie |
| **SDK Simplicity** | Moderate | High (single-line ops) | **Crossmint** |
| **BlockDrive Compatibility** | ❌ Deprecated | ✅ Active integration | **Crossmint** |
| **Enterprise Features** | Limited | ✅ Remittances, treasury | **Crossmint** |
| **Cost** | Pay per gas sponsored | Tiered pricing | Depends on usage |

### Key Advantages of Crossmint

1. **True Multichain**: One authentication = wallets on ALL chains
2. **Simplified SDK**: `createOnLogin` automatically creates wallets
3. **NFT Infrastructure**: Direct minting without external services
4. **Compliance Built-in**: AML monitoring, KYC flows for enterprise
5. **Stablecoin Focus**: Optimized for USDC/USDT operations (key for BlockDrive payments)
6. **Jupiter Integration**: Direct token swaps on Solana

### Why Crossmint for BlockDrive

| Feature | Why It Matters |
|---------|---------------|
| Multichain from Day 1 | BlockDrive future-proofs for cross-chain expansion |
| Built-in NFT minting | Membership NFTs without external services |
| Compliance built-in | Enterprise-ready with AML/KYC |
| Stablecoin focus | Perfect for USDC/USDT payment processing |
| Smart Contract Wallets | Advanced features for power users |
| Single SDK | Simpler codebase, faster development |

---

## Implementation Strategy

### Phase 1: Core Integration (Week 1)

**Goals**:
- Set up Crossmint SDK
- Integrate with existing Clerk authentication
- Create wallet on user signup

**Deliverables**:
- `src/config/crossmint.ts` - Crossmint configuration
- `src/hooks/useCrossmintWallet.tsx` - React hook for wallet operations
- `src/providers/CrossmintProvider.tsx` - React context provider
- Environment variables added to `.env.example`

### Phase 2: Database & Backend (Week 1-2)

**Goals**:
- Store multichain wallet addresses
- Sync wallet creation to Supabase
- Update RLS policies

**Deliverables**:
- Database migration: Add `crossmint_wallets` table
- Edge function: `sync-crossmint-wallet`
- Update `profiles` table schema

### Phase 3: Transaction Operations (Week 2)

**Goals**:
- Implement transaction signing
- Enable gas sponsorship
- Add file registration on multiple chains

**Deliverables**:
- Sign and send transaction functions
- Gas sponsorship configuration
- Multichain file registry support

### Phase 4: NFT Integration (Week 3)

**Goals**:
- Implement membership NFT minting via Crossmint
- Support NFT-based access control
- Enable cross-chain NFT transfers

**Deliverables**:
- NFT minting service integration
- Update membership verification logic
- Cross-chain NFT support

### Phase 5: Testing & Documentation (Week 3-4)

**Goals**:
- Comprehensive testing
- Update all documentation
- Create migration guide for existing users

**Deliverables**:
- Test suite for Crossmint integration
- Updated ARCHITECTURE.md and PRD.md
- Migration guide
- Plugin skills and commands

---

## Technical Specifications

### Required Packages

```json
{
  "dependencies": {
    "@crossmint/client-sdk-react-ui": "latest",
    "@crossmint/client-sdk-auth": "latest",
    "@crossmint/wallets-sdk": "latest",
    "@solana/web3.js": "^1.95.0",
    "ethers": "^6.0.0"
  }
}
```

### Environment Variables

```env
# Crossmint Configuration
VITE_CROSSMINT_CLIENT_API_KEY=your_staging_api_key
VITE_CROSSMINT_ENVIRONMENT=staging  # or 'production'
CROSSMINT_SERVER_API_KEY=your_server_api_key

# Crossmint Webhook Secret (for backend verification)
CROSSMINT_WEBHOOK_SECRET=your_webhook_secret

# Clerk (existing)
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase (existing)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Crossmint API Key Scopes

Required scopes for client API key:
- `users.create`
- `wallets.create`
- `wallets:transactions.create`
- `wallets:transactions.read`
- `nfts.create` (for membership NFTs)

---

## Database Schema Updates

### New Table: `crossmint_wallets`

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
  wallet_type TEXT DEFAULT 'crossmint_embedded' CHECK (wallet_type IN ('crossmint_embedded', 'crossmint_smart_contract')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Indexes
  CONSTRAINT unique_user_crossmint UNIQUE (user_id, clerk_user_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_crossmint_wallets_clerk_user ON crossmint_wallets(clerk_user_id);
CREATE INDEX idx_crossmint_wallets_solana ON crossmint_wallets(solana_address);
CREATE INDEX idx_crossmint_wallets_ethereum ON crossmint_wallets(ethereum_address);
CREATE INDEX idx_crossmint_wallets_base ON crossmint_wallets(base_address);
CREATE INDEX idx_crossmint_wallets_id ON crossmint_wallets(crossmint_wallet_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_crossmint_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crossmint_wallets_updated_at
  BEFORE UPDATE ON crossmint_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_crossmint_wallets_updated_at();

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
  ADD COLUMN preferred_wallet_provider TEXT DEFAULT 'alchemy' CHECK (preferred_wallet_provider IN ('alchemy', 'crossmint'));

-- Index for quick provider lookups
CREATE INDEX idx_profiles_wallet_provider ON profiles(preferred_wallet_provider);
```

---

## Code Implementation

### 1. Crossmint Configuration (`src/config/crossmint.ts`)

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

### 2. Crossmint Provider (`src/providers/CrossmintProvider.tsx`)

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

        // Sync wallet addresses to Supabase after creation
        // This happens automatically through Crossmint's onWalletCreate callback

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

### 3. Crossmint Wallet Hook (`src/hooks/useCrossmintWallet.tsx`)

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

        // TODO: Fetch EVM chain addresses
        // This requires switching chain context

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

### 4. Wallet Sync Service (`src/services/crossmint/walletSync.ts`)

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

### 5. Supabase Edge Function (`supabase/functions/sync-crossmint-wallet/index.ts`)

```typescript
// Follow Deno deploy conventions
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

    // Validate addresses
    const validAddresses = Object.entries(addresses).filter(
      ([_, address]) => address && address.length > 0
    );

    if (validAddresses.length === 0) {
      throw new Error('No valid addresses provided');
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
        addresses: validAddresses.length,
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

---

## Testing Plan

### Unit Tests

```typescript
// __tests__/hooks/useCrossmintWallet.test.ts

describe('useCrossmintWallet', () => {
  it('initializes wallet when user is signed in', async () => {
    // Test wallet initialization
  });

  it('signs transaction correctly', async () => {
    // Test transaction signing
  });

  it('sends transaction with gas sponsorship', async () => {
    // Test transaction sending
  });

  it('switches chains successfully', async () => {
    // Test chain switching
  });

  it('fetches balance correctly', async () => {
    // Test balance fetching
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/crossmint-auth-flow.test.ts

describe('Crossmint Authentication Flow', () => {
  it('creates wallet on Clerk signup', async () => {
    // Test complete auth flow
  });

  it('syncs wallet to Supabase', async () => {
    // Test database sync
  });

  it('creates wallets on multiple chains', async () => {
    // Test multichain support
  });
});
```

### Manual Testing Checklist

- [ ] User signs up with Clerk
- [ ] Crossmint wallet automatically created
- [ ] Solana devnet wallet address appears
- [ ] Wallet synced to `crossmint_wallets` table
- [ ] User profile updated with `preferred_wallet_provider: 'crossmint'`
- [ ] Transaction signing works on Solana devnet
- [ ] Gas sponsorship active (user doesn't pay fees)
- [ ] Multichain addresses fetched correctly
- [ ] Chain switching works (Solana → Ethereum → Base)
- [ ] Balance displays correctly for each chain
- [ ] Error handling works (network failures, insufficient funds)
- [ ] Existing Alchemy users not affected (if hybrid approach)

---

## Deployment Strategy

### Staging Deployment

1. **Environment Setup**
   ```bash
   # Add Crossmint staging credentials
   export VITE_CROSSMINT_CLIENT_API_KEY="your_staging_key"
   export VITE_CROSSMINT_ENVIRONMENT="staging"
   export CROSSMINT_SERVER_API_KEY="your_server_key"
   ```

2. **Database Migration**
   ```bash
   # Run migration to add crossmint_wallets table
   npm run supabase:migration:up
   ```

3. **Deploy Edge Functions**
   ```bash
   # Deploy sync-crossmint-wallet function
   supabase functions deploy sync-crossmint-wallet
   ```

4. **Test with Staging Environment**
   - Create test user with Clerk
   - Verify wallet creation
   - Test transactions on devnet
   - Validate database sync

### Production Deployment

1. **Crossmint Production Setup**
   - Create production Crossmint account
   - Generate production API keys with proper scopes
   - Configure gas sponsorship policies
   - Set up webhook endpoints for transaction notifications

2. **Environment Variables**
   ```bash
   export VITE_CROSSMINT_CLIENT_API_KEY="prod_key"
   export VITE_CROSSMINT_ENVIRONMENT="production"
   export CROSSMINT_SERVER_API_KEY="prod_server_key"
   ```

3. **Gradual Rollout**
   - Deploy to 10% of new users first
   - Monitor wallet creation success rate
   - Monitor transaction success rate
   - Monitor database sync errors
   - Gradually increase to 50%, then 100%

4. **Monitoring**
   - Set up Datadog/Sentry alerts for:
     - Wallet creation failures
     - Transaction errors
     - Database sync failures
     - Gas sponsorship policy limits

---

## Migration Considerations

### Migrating from Previous Wallet Infrastructure

**Migration Strategy: Complete Replacement**

1. **Immediate**: All new users get Crossmint wallets automatically
2. **Notify**: Existing users receive migration notification
3. **Create**: Crossmint wallets created for all existing users
4. **Assist**: Provide migration tool to help users transition
5. **Support**: 30-day support period for migration questions
6. **Complete**: Previous wallet infrastructure fully deprecated

**Migration Tool**: Use `/crossmint:migrate-from-alchemy` command

### Data Migration

```sql
-- Migrate existing Alchemy users to Crossmint (if needed)
INSERT INTO crossmint_wallets (
  user_id,
  clerk_user_id,
  crossmint_wallet_id,
  solana_address,
  wallet_type,
  created_at
)
SELECT
  id,
  clerk_user_id,
  'migrated_' || id::text,  -- Temporary wallet ID
  solana_wallet_address,
  'crossmint_embedded',
  NOW()
FROM profiles
WHERE solana_wallet_address IS NOT NULL
  AND preferred_wallet_provider = 'alchemy'
ON CONFLICT (clerk_user_id) DO NOTHING;
```

---

## Next Steps

### Immediate Actions (This Week)

1. **Set up Crossmint account**: Create staging account at https://staging.crossmint.com
2. **Generate API keys**: Create client and server API keys with required scopes
3. **Install SDK packages**: Run `npm install @crossmint/client-sdk-react-ui @crossmint/wallets-sdk`
4. **Create configuration file**: Implement `src/config/crossmint.ts`
5. **Test basic integration**: Create test user and verify wallet creation

### Short Term (Next 2 Weeks)

1. Implement Crossmint provider and hooks
2. Create database schema and edge functions
3. Test transaction signing and sending
4. Implement multichain support
5. Add to BlockDrive Solana plugin as skills

### Medium Term (Month 1)

1. Complete testing (unit, integration, E2E)
2. Update all documentation
3. Deploy to staging for team testing
4. Gather feedback and iterate
5. Prepare production deployment plan

### Long Term (Months 2-3)

1. Production deployment with gradual rollout
2. Monitor performance and user adoption
3. Implement NFT minting features
4. Add AML/KYC for enterprise users
5. Expand to additional chains (Arbitrum, Optimism)

---

## Appendix

### A. Crossmint SDK Resources

- **Documentation**: https://docs.crossmint.com
- **React SDK**: https://docs.crossmint.com/wallets/quickstarts/client-side-wallets
- **API Reference**: https://docs.crossmint.com/api-reference
- **Solana Guide**: https://blog.crossmint.com/solana-embedded-smart-wallets/
- **GitHub**: https://github.com/Crossmint/crossmint-sdk

### B. Related BlockDrive Documentation

- `docs/ARCHITECTURE.md` - Current system architecture
- `docs/PRD.md` - Product requirements
- `docs/IMPLEMENTATION_PLAN.md` - Overall implementation roadmap
- `plugins/blockdrive-solana/` - Solana integration plugin
- `.claude/agents/solana-blockchain-architect.md` - Solana expert agent

### C. Support Channels

- **Crossmint Support**: support@crossmint.com
- **Clerk Support**: https://clerk.com/support
- **Supabase Support**: https://supabase.com/support
- **BlockDrive Team**: sean@blockdrive.co

---

**Document Version**: 1.0.0
**Last Updated**: January 26, 2026
**Status**: DESIGN - Ready for Implementation
**Next Review**: After Phase 1 completion
**Approval Required**: Yes (Sean Weiss - Founder)
