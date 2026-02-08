---
name: setup
description: Interactive setup wizard for Crossmint integration with smart defaults. Detects existing Clerk/Supabase config, validates API keys, creates .env entries, generates config files, and offers database migration.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Crossmint Setup Wizard

Interactive setup wizard that configures Crossmint integration for BlockDrive with smart defaults and automatic detection of existing configurations.

## Instructions

When this command is invoked, execute the following workflow:

### 1. Welcome & Prerequisites Check

Display a welcome message and verify prerequisites:

```
╔══════════════════════════════════════════════════════════════╗
║         Crossmint Integration Setup Wizard                   ║
║                                                              ║
║  This wizard will configure Crossmint embedded wallets,      ║
║  NFT collections, and multichain support for BlockDrive.     ║
╚══════════════════════════════════════════════════════════════╝

Checking prerequisites...
```

Check for:
- ✓ Clerk configuration (`.env` for `VITE_CLERK_PUBLISHABLE_KEY`)
- ✓ Supabase configuration (`.env` for `VITE_SUPABASE_URL`)
- ✓ Node.js packages installed (`package.json` exists)
- ✓ Git repository initialized

If any prerequisite is missing, explain what's needed and offer to help set it up.

### 2. Detect Existing Configuration

Scan for existing configurations:

1. **Check for existing Crossmint config**:
   - Look for `VITE_CROSSMINT_CLIENT_API_KEY` in `.env`
   - Check for `src/config/crossmint.ts`
   - Look for `@crossmint/*` packages in `package.json`

2. **Check for Alchemy integration**:
   - Search for `AlchemyProvider` in `src/components/`
   - Look for `@account-kit/*` or `@alchemy/*` packages
   - Check for Alchemy env variables

3. **Check database schema**:
   - Look for `supabase/migrations/` directory
   - Check for existing wallet-related tables

Display findings:
```
Configuration Status:
├─ Clerk:        ✓ Configured
├─ Supabase:     ✓ Configured
├─ Crossmint:    ✗ Not configured
├─ Alchemy:      ✓ Found (can migrate later)
└─ Database:     ⚠ No wallet tables found
```

### 3. Interactive Configuration Prompts

Ask the user for configuration details with smart defaults:

#### A. API Keys (Required)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 API Key Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Get your API keys from: https://www.crossmint.com/console

1. Crossmint Client API Key (starts with "sk_staging_" or "sk_production_"):
```

Prompt for:
- `VITE_CROSSMINT_CLIENT_API_KEY` (required)
- `CROSSMINT_SERVER_API_KEY` (required)

**Validation**: Check that keys start with correct prefix and contain valid format.

#### B. Environment Selection

```
2. Environment (staging recommended for development):

   [1] Staging (default) - For development and testing
   [2] Production         - For live users (requires production keys)

   Select [1-2]:
```

Default: `staging`

#### C. Blockchain Networks

```
3. Blockchain Networks (multichain from Day 1):

   Primary Chain:
   [1] Solana Devnet (recommended for development)
   [2] Ethereum Sepolia
   [3] Base Sepolia

   Select primary [1-3]: 1

   Additional Chains (will auto-create wallets on all selected):
   [ ] Ethereum Mainnet
   [ ] Base (Layer 2)
   [x] Polygon
   [ ] Arbitrum
   [ ] Optimism

   Add additional chains? [y/N]:
```

**Smart Defaults**:
- Primary: Solana Devnet
- Additional: None initially (can add later)
- Explain: "Crossmint creates wallets on ALL chains automatically with single auth"

#### D. Wallet Creation Mode

```
4. Wallet Creation Mode:

   [1] Automatic (createOnLogin: true) - Recommended
       Creates wallet immediately when user signs in via Clerk

   [2] Manual (createOnLogin: false)
       Requires explicit user action to create wallet

   Select [1-2]:
```

Default: `Automatic (1)` - matches Alchemy behavior

#### E. Gas Sponsorship (Optional)

```
5. Enable Gas Sponsorship (pay transaction fees for users)?

   [y/N]:

   Note: Requires Crossmint gas policy setup in console.
   You can configure this later.
```

Default: `No` (can configure later)

### 4. Generate Configuration Files

After collecting inputs, generate the following files:

#### A. Update `.env` file

Add or update these environment variables:

```env
# Crossmint Configuration
VITE_CROSSMINT_CLIENT_API_KEY=<user_provided>
CROSSMINT_SERVER_API_KEY=<user_provided>
VITE_CROSSMINT_ENVIRONMENT=<staging|production>

# Optional: Gas Sponsorship
# VITE_CROSSMINT_POLICY_ID=<policy_id_if_enabled>

# Optional: NFT Collections
# CROSSMINT_COLLECTION_ID=<collection_id_when_created>

# Optional: Webhooks
# CROSSMINT_WEBHOOK_SECRET=<webhook_secret_if_needed>
```

**Safety**: If `.env` exists, append. If variables already exist, ask before overwriting.

#### B. Create `src/config/crossmint.ts`

```typescript
/**
 * Crossmint Configuration
 *
 * Auto-generated by Crossmint Setup Wizard
 * Generated: <timestamp>
 */

export const crossmintConfig = {
  // API Configuration
  clientApiKey: import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY,
  serverApiKey: import.meta.env.CROSSMINT_SERVER_API_KEY,
  environment: import.meta.env.VITE_CROSSMINT_ENVIRONMENT || 'staging',

  // Blockchain Networks
  chains: {
    primary: '<selected_primary_chain>',
    supported: [
      '<primary_chain>',
      <...additional_chains>
    ],
  },

  // Wallet Settings
  wallet: {
    createOnLogin: <true|false>,
    type: 'evm-smart-wallet', // or 'solana-mpc-wallet'
  },

  // Optional: Gas Sponsorship
  gasSponsorship: {
    enabled: <true|false>,
    policyId: import.meta.env.VITE_CROSSMINT_POLICY_ID,
  },

  // Optional: NFT Collections
  nft: {
    collectionId: import.meta.env.CROSSMINT_COLLECTION_ID,
  },
};

// Validation
if (!crossmintConfig.clientApiKey) {
  throw new Error('VITE_CROSSMINT_CLIENT_API_KEY is required');
}

export default crossmintConfig;
```

#### C. Create `src/types/crossmint.ts`

```typescript
/**
 * Crossmint Type Definitions
 *
 * Auto-generated by Crossmint Setup Wizard
 */

export interface CrossmintWallet {
  address: string;
  chain: string;
  type: 'evm-smart-wallet' | 'solana-mpc-wallet';
  createdAt: string;
}

export interface CrossmintUser {
  wallets: CrossmintWallet[];
  primaryWallet: CrossmintWallet;
}

export interface CrossmintConfig {
  clientApiKey: string;
  serverApiKey: string;
  environment: 'staging' | 'production';
  chains: {
    primary: string;
    supported: string[];
  };
  wallet: {
    createOnLogin: boolean;
    type: string;
  };
  gasSponsorship?: {
    enabled: boolean;
    policyId?: string;
  };
  nft?: {
    collectionId?: string;
  };
}
```

### 5. Install Dependencies

Check and install required npm packages:

```bash
npm install @crossmint/client-sdk-react-ui @crossmint/client-sdk-auth @crossmint/wallets-sdk
```

If packages already exist, show version and ask if upgrade is needed.

**Expected output**:
```
Installing Crossmint packages...

added 3 packages, and audited 847 packages in 12s

✓ @crossmint/client-sdk-react-ui@latest
✓ @crossmint/client-sdk-auth@latest
✓ @crossmint/wallets-sdk@latest
```

### 6. Database Migration Offer

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Database Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Would you like to create the database schema for Crossmint wallets?

This will create:
- crossmint_wallets table (stores multichain addresses)
- RLS policies (row-level security)
- Indexes for performance

Create database migration now? [Y/n]:
```

If user accepts:

1. Create `supabase/migrations/<timestamp>_create_crossmint_wallets.sql`:

```sql
-- Create crossmint_wallets table
-- Generated by Crossmint Setup Wizard

CREATE TABLE IF NOT EXISTS crossmint_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Multichain Addresses
  solana_address TEXT,
  ethereum_address TEXT,
  base_address TEXT,
  polygon_address TEXT,
  arbitrum_address TEXT,
  optimism_address TEXT,

  -- Metadata
  primary_chain TEXT NOT NULL DEFAULT 'solana',
  wallet_type TEXT NOT NULL DEFAULT 'evm-smart-wallet',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_primary_chain CHECK (primary_chain IN ('solana', 'ethereum', 'base', 'polygon', 'arbitrum', 'optimism')),
  CONSTRAINT at_least_one_address CHECK (
    solana_address IS NOT NULL OR
    ethereum_address IS NOT NULL OR
    base_address IS NOT NULL OR
    polygon_address IS NOT NULL OR
    arbitrum_address IS NOT NULL OR
    optimism_address IS NOT NULL
  )
);

-- Create indexes
CREATE INDEX idx_crossmint_wallets_user_id ON crossmint_wallets(user_id);
CREATE INDEX idx_crossmint_wallets_solana ON crossmint_wallets(solana_address) WHERE solana_address IS NOT NULL;
CREATE INDEX idx_crossmint_wallets_ethereum ON crossmint_wallets(ethereum_address) WHERE ethereum_address IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE crossmint_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own wallets"
  ON crossmint_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON crossmint_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON crossmint_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
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
COMMENT ON TABLE crossmint_wallets IS 'Stores Crossmint embedded wallet addresses for all supported blockchain networks';
```

2. Offer to run migration:

```bash
supabase db push
```

### 7. Setup Summary

Display a comprehensive summary:

```
╔══════════════════════════════════════════════════════════════╗
║              Setup Complete! ✓                               ║
╚══════════════════════════════════════════════════════════════╝

Configuration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment:        staging
Primary Chain:      Solana Devnet
Wallet Creation:    Automatic (on login)
Gas Sponsorship:    Disabled (can enable later)

Files Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ .env                          (Updated with API keys)
✓ src/config/crossmint.ts       (Configuration file)
✓ src/types/crossmint.ts        (TypeScript types)
✓ supabase/migrations/...sql    (Database schema)

Packages Installed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ @crossmint/client-sdk-react-ui
✓ @crossmint/client-sdk-auth
✓ @crossmint/wallets-sdk

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Generate wallet creation flow:
   /crossmint:create-wallet-flow

2. Create NFT collection (optional):
   /crossmint:create-collection

3. Migrate from Alchemy (if applicable):
   /crossmint:migrate-from-alchemy

4. Read documentation:
   docs/CROSSMINT_INTEGRATION_PLAN.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Need help? Check the Crossmint plugin README or ask for assistance.
```

## Error Handling

### Invalid API Keys

If API key validation fails:
```
✗ Error: Invalid API key format

Crossmint API keys should start with:
- Client keys: "sk_staging_" or "sk_production_"
- Server keys: "sk_server_"

Please check your keys at: https://www.crossmint.com/console
```

### Missing Prerequisites

If Clerk or Supabase are not configured:
```
⚠ Warning: Clerk configuration not found

Crossmint requires Clerk for authentication. Please set up Clerk first:

1. Install Clerk: npm install @clerk/clerk-react
2. Add Clerk keys to .env:
   VITE_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...

Would you like help setting up Clerk? [y/N]:
```

### Conflicting Configuration

If Crossmint is already configured:
```
⚠ Existing Crossmint configuration detected

Found:
- VITE_CROSSMINT_CLIENT_API_KEY in .env
- src/config/crossmint.ts

Options:
[1] Update existing configuration
[2] Cancel setup
[3] Create backup and reconfigure

Select [1-3]:
```

### Network/API Issues

If unable to validate keys with Crossmint API:
```
⚠ Unable to validate API keys (network error)

Continue with setup anyway? [y/N]:

Note: You can verify keys later at https://www.crossmint.com/console
```

## Example Usage

```bash
# Run the setup wizard
/crossmint:setup

# Re-run setup to update configuration
/crossmint:setup
```

## Smart Defaults Summary

| Setting | Default Value | Rationale |
|---------|---------------|-----------|
| Environment | `staging` | Safe for development |
| Primary Chain | `Solana Devnet` | Matches current BlockDrive focus |
| Wallet Creation | `Automatic` | Best UX, matches Alchemy |
| Additional Chains | `None` | Can add later easily |
| Gas Sponsorship | `Disabled` | Requires policy setup |
| Database Migration | `Prompt user` | Safe, reversible |

## Notes

- All configuration is stored in version control except `.env` (gitignored)
- Setup is idempotent - can be run multiple times safely
- Smart detection prevents duplicate configuration
- Always creates backups before overwriting existing files
- Validates API keys format before saving
- Provides clear next steps and documentation links
