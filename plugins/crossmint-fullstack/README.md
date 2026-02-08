# Crossmint Fullstack Plugin

**Version**: 1.0.0
**Author**: Sean Weiss/BlockDrive <sean@blockdrive.co>
**License**: MIT

Complete Crossmint integration for BlockDrive with embedded wallets, NFT collections, smart wallets, payment subscriptions, and Supabase integration. **Multichain support from Day 1** (Solana + EVM chains).

---

## Overview

This plugin provides everything needed to integrate Crossmint into BlockDrive:

- ✅ **5 Comprehensive Skills** - Embedded wallets, NFT collections, smart wallets, payments, Supabase sync
- ✅ **4 Specialized Agents** - Main architect + 3 specialists for autonomous task handling
- ✅ **4 Interactive Commands** - Setup, wallet flow generation, collection creation, Alchemy migration
- ✅ **Live Documentation** - MCP server integration for Crossmint docs
- ✅ **Multichain Ready** - Solana devnet + Base, Ethereum, Polygon from Day 1

---

## Features

### 🔐 Embedded Wallets
Non-custodial MPC wallets without seed phrases. Integrates with your existing **Clerk authentication** to automatically create multichain wallets on user signup.

### 🎨 NFT Collections
Built-in NFT minting for BlockDrive membership tokens. Create collections, mint NFTs, and manage metadata—all through Crossmint's infrastructure.

### 🧠 Smart Contract Wallets
Programmable Solana Smart Wallets with multi-sig support, gas sponsorship, and flexible permission systems via Squads Protocol.

### 💳 Payment & Subscriptions
Stablecoin payment orchestration for BlockDrive tiers. Handle USDC/USDT payments, recurring subscriptions, and automated billing.

### 🗄️ Supabase Integration
Complete database sync patterns matching your existing Alchemy setup. Stores multichain wallet addresses with RLS policies.

---

## Quick Start

### 1. Run Setup Command

```bash
/crossmint:setup
```

Interactive wizard will:
- Guide you through API key configuration
- Create environment variables
- Detect existing Clerk/Supabase setup
- Generate initial configuration files

### 2. Create Wallet Flow

```bash
/crossmint:create-wallet-flow
```

Generates complete wallet creation code:
- React provider component
- Clerk integration
- Supabase edge function
- Database migration

### 3. Use Skills & Agents

The plugin automatically activates when you mention "Crossmint", "blockchain architecture", or start implementing wallet/NFT features.

---

## Plugin Structure

```
crossmint-fullstack/
├── .claude-plugin/
│   ├── plugin.json           # Plugin manifest
│   └── .mcp.json             # Crossmint docs MCP server
├── skills/                    # 5 comprehensive skills
│   ├── embedded-wallets/
│   ├── nft-collections/
│   ├── smart-wallets/
│   ├── payment-subscriptions/
│   └── supabase-integration/
├── agents/                    # 4 specialized agents
│   ├── crossmint-architect.md
│   ├── wallet-specialist.md
│   ├── nft-specialist.md
│   └── integration-specialist.md
└── commands/                  # 4 interactive commands
    ├── setup.md
    ├── create-wallet-flow.md
    ├── create-collection.md
    └── migrate-from-alchemy.md
```

---

## Skills

### 1. **Embedded Wallets** (`skills/embedded-wallets`)
Learn how to create and manage embedded wallets with Crossmint's MPC infrastructure.

**When to use**: Setting up wallet creation, configuring Clerk integration, multichain address management

**Key topics**:
- Clerk JWT authentication flow
- Automatic wallet creation on signup
- Multichain address retrieval (Solana + EVM)
- Wallet lifecycle management

### 2. **NFT Collections** (`skills/nft-collections`)
Mint and manage NFT collections for BlockDrive membership tokens.

**When to use**: Creating membership NFTs, minting collections, managing metadata

**Key topics**:
- Collection creation and configuration
- Minting individual NFTs
- Bulk minting for multiple users
- Metadata management (IPFS/Arweave)
- Membership tier NFTs

### 3. **Smart Wallets** (`skills/smart-wallets`)
Implement Solana Smart Wallets with programmable security.

**When to use**: Multi-signature requirements, programmatic asset protection, automated operations

**Key topics**:
- Smart wallet creation on Solana
- Multi-key custody setups
- Gas sponsorship policies
- Automated transaction approval
- Squads Protocol integration

### 4. **Payment & Subscriptions** (`skills/payment-subscriptions`)
Handle stablecoin payments and recurring subscriptions.

**When to use**: Implementing paid membership tiers, processing payments, managing subscriptions

**Key topics**:
- USDC/USDT payment processing
- Subscription creation and management
- Payment webhooks
- Automated billing cycles
- Cross-chain payment orchestration

### 5. **Supabase Integration** (`skills/supabase-integration`)
Sync Crossmint wallets to Supabase database.

**When to use**: Database schema design, edge function creation, wallet sync implementation

**Key topics**:
- Database schema (crossmint_wallets table)
- Edge function patterns
- RLS policies for security
- Matching existing Alchemy patterns
- Multichain address storage

---

## Agents

### Main Agent: **Crossmint Architect**
Coordinates all Crossmint integration work. Automatically delegates to specialist agents when appropriate.

**Auto-triggers when you**:
- Mention "Crossmint" anywhere
- Ask about blockchain architecture
- Start implementing wallet/NFT features

**Provides**:
- Step-by-step implementation plans
- Code scaffolding
- Architecture diagrams
- Delegates to specialists

### Specialist Agents

#### **Wallet Specialist**
Handles embedded wallet creation, management, and multichain operations.

**Delegated for**: Wallet creation flows, Clerk integration, multichain address management

#### **NFT Specialist**
Manages NFT minting, collections, and membership token operations.

**Delegated for**: NFT collection creation, minting operations, metadata management

#### **Integration Specialist**
Handles Clerk, Supabase, and database integration patterns.

**Delegated for**: Database schema, edge functions, authentication flows

---

## Commands

### `/crossmint:setup`
Interactive setup wizard with smart defaults.

**What it does**:
- Detects existing Clerk/Supabase configuration
- Prompts for Crossmint API keys
- Creates `.env` entries
- Generates configuration files
- Offers to run initial migration

**Interactive prompts** (based on your answer D11: "Interactive with smart defaults"):
- API key input (with validation)
- Environment selection (staging/production)
- Chain selection (Solana devnet recommended)
- Database migration confirmation

### `/crossmint:create-wallet-flow`
Generates complete wallet creation flow matching Alchemy pattern.

**What it creates** (based on your answer D16: "Match Alchemy exactly"):
- `src/config/crossmint.ts` - Configuration
- `src/providers/CrossmintProvider.tsx` - React provider
- `src/hooks/useCrossmintWallet.tsx` - Wallet hook
- `supabase/functions/sync-crossmint-wallet/` - Edge function
- Database migration for `crossmint_wallets` table

**Follows**: Clerk → Crossmint → Supabase pattern (same as Alchemy)

### `/crossmint:create-collection`
Creates NFT collection for membership tokens.

**Interactive prompts**:
- Collection name and symbol
- Membership tier (Free, Pro, Enterprise)
- Supply limit (optional)
- Royalty settings
- Metadata URI template

**Generates**:
- Collection creation script
- Minting functions
- Metadata templates

### `/crossmint:migrate-from-alchemy`
Migrates existing Alchemy integration to Crossmint.

**Migration scope** (based on your answer D13: "All of the above"):
- Scans codebase for Alchemy imports/usage
- Replaces specific files (AlchemyProvider → CrossmintProvider)
- Updates database references
- Preserves git history (incremental commits)
- Creates backup branch first
- Shows diff before applying

**Safety** (based on your answer D14: "Use your recommendation"):
- ✅ Creates backup branch first
- ✅ Shows diff before applying changes
- ✅ Dry-run mode available

---

## Architecture

### Current Alchemy Flow
```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  CLERK   │────▶│   ALCHEMY    │────▶│ SUPABASE │
│ Identity │     │ Account Kit  │     │ Database │
└──────────┘     └──────────────┘     └──────────┘
     │                  │                    │
1. User signs     2. JWT creates      3. Wallet address
   in via Clerk      MPC wallet          stored
```

### New Crossmint Flow (Matches Alchemy Exactly)
```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  CLERK   │────▶│  CROSSMINT   │────▶│ SUPABASE │
│ Identity │     │ Embedded SDK │     │ Database │
└──────────┘     └──────────────┘     └──────────┘
     │                  │                    │
1. User signs     2. Creates wallets  3. Multi-chain
   in via Clerk      on ALL chains       addresses stored

Chains: Solana devnet + Base, Ethereum, Polygon (Day 1)
```

**Key Difference**: Crossmint creates wallets on **ALL chains automatically** from single auth.

---

## Integration with BlockDrive

### References Your Existing Setup

The plugin automatically references (based on your answer E17):
- ✅ `docs/PRD.md` - Product requirements
- ✅ `docs/ARCHITECTURE.md` - System architecture
- ✅ `docs/CROSSMINT_INTEGRATION_PLAN.md` - Technical implementation guide
- ✅ `.claude/agents/solana-blockchain-architect.md` - Solana expert
- ✅ `plugins/blockdrive-solana/` - Existing Solana integration
- ✅ Current Alchemy config files

### Multichain Strategy

**Answer E19**: "Start with Devnet. Multichain from day 1 if its simple."

✅ **Implementation**:
- Primary: **Solana devnet** (development)
- Secondary: **Base** (low-cost EVM layer 2)
- Optional: Ethereum, Polygon, Arbitrum
- Production: Solana mainnet

Crossmint makes multichain simple - **single auth = all chain wallets**.

---

## Environment Configuration

### Required Environment Variables

```env
# Crossmint
VITE_CROSSMINT_CLIENT_API_KEY=your_staging_key
CROSSMINT_SERVER_API_KEY=your_server_key
VITE_CROSSMINT_ENVIRONMENT=staging

# Clerk (existing)
VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase (existing)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Optional

```env
CROSSMINT_WEBHOOK_SECRET=your_webhook_secret
CROSSMINT_COLLECTION_ID=your_collection_id
VITE_CROSSMINT_POLICY_ID=gas_sponsorship_policy_id
```

---

## Dependencies

```json
{
  "@crossmint/client-sdk-react-ui": "latest",
  "@crossmint/client-sdk-auth": "latest",
  "@crossmint/wallets-sdk": "latest",
  "@clerk/clerk-react": "^5.x",
  "@supabase/supabase-js": "^2.x",
  "@solana/web3.js": "^1.95.0",
  "ethers": "^6.0.0"
}
```

---

## Resources

### Documentation
- **Technical Plan**: `docs/CROSSMINT_INTEGRATION_PLAN.md` (comprehensive implementation guide)
- **Crossmint Docs**: https://docs.crossmint.com (via MCP server)
- **Architecture**: `docs/ARCHITECTURE.md`
- **PRD**: `docs/PRD.md`

### Related Plugins
- `blockdrive-solana` - Existing Solana integration
- `cloudflare-toolkit` - Infrastructure automation

### Support
- **BlockDrive**: sean@blockdrive.co
- **Crossmint**: support@crossmint.com
- **GitHub**: https://github.com/2rds/block-drive-vault/issues

---

## License

MIT License - See LICENSE file

**Built with ❤️ by BlockDrive Team**
