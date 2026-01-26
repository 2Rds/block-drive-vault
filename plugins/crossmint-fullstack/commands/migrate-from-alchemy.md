---
name: migrate-from-alchemy
description: Migrate existing Alchemy Account Kit integration to Crossmint with preservation of user data. Scans codebase, replaces files, updates database, preserves git history with safety features (backup branch, dry-run, diff preview).
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Migrate from Alchemy to Crossmint

Comprehensive migration tool that safely migrates your existing Alchemy Account Kit integration to Crossmint while preserving user data and git history. Includes backup branches, dry-run mode, and diff previews.

## Instructions

When this command is invoked, execute the following workflow:

### 1. Welcome & Migration Overview

```
╔══════════════════════════════════════════════════════════════╗
║         Alchemy → Crossmint Migration Tool                   ║
║                                                              ║
║  Safely migrate your wallet integration while preserving     ║
║  user data and git history.                                  ║
╚══════════════════════════════════════════════════════════════╝

This migration will:
✓ Scan codebase for Alchemy usage
✓ Replace AlchemyProvider → CrossmintProvider
✓ Update database schema
✓ Migrate user wallet data
✓ Preserve git history (incremental commits)
✓ Create backup branch first

Safety Features:
✓ Backup branch created automatically
✓ Dry-run mode (preview changes)
✓ Diff preview before applying
✓ Rollback instructions provided

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Pre-Migration Checks

Run comprehensive checks before starting:

```
Running pre-migration checks...

Git Repository:
✓ Git initialized
✓ Working directory clean
✓ No uncommitted changes

Current Branch: <current_branch>
✓ Safe to create backup branch

Alchemy Integration:
✓ AlchemyProvider found: src/components/auth/AlchemyProvider.tsx
✓ Alchemy hooks found: src/hooks/useAlchemySolanaWallet.tsx
✓ Alchemy packages: @account-kit/core, @account-kit/react
✓ Environment variables: VITE_ALCHEMY_API_KEY

Crossmint Setup:
✓ Crossmint configured
✓ API keys present
✓ Configuration files ready

Database:
✓ Supabase configured
⚠ Existing user wallet data found (will be migrated)
```

If any critical check fails:
```
✗ Error: Working directory has uncommitted changes

Please commit or stash changes before migration:
  git add .
  git commit -m "Prepare for Crossmint migration"

Or stash changes:
  git stash
```

### 3. Migration Mode Selection

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Migration Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] Full Migration (recommended)
    - Replace all Alchemy code with Crossmint
    - Migrate user wallet data
    - Update database schema
    - Remove Alchemy dependencies

[2] Parallel Migration
    - Keep both Alchemy and Crossmint
    - Use feature flags for gradual rollout
    - Allows A/B testing
    - Keep Alchemy as fallback

[3] Dry Run
    - Preview all changes without applying
    - See diffs and migration plan
    - No files modified
    - Safe exploration

Select mode [1-3]:
```

**Recommended**: Mode 3 (Dry Run) first, then Mode 1 (Full Migration)

### 4. Create Backup Branch

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Creating Backup Branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating backup: backup/pre-crossmint-migration-<timestamp>

Would you like to:
[1] Create backup branch (recommended)
[2] Skip backup (not recommended)

Select [1-2]:
```

**Always recommend**: Option 1

If backup is created:
```bash
git checkout -b backup/pre-crossmint-migration-$(date +%Y%m%d-%H%M%S)
git checkout <original_branch>
```

Display:
```
✓ Backup branch created: backup/pre-crossmint-migration-20260126-143022

You can restore from this branch anytime with:
  git checkout backup/pre-crossmint-migration-20260126-143022
```

### 5. Scan Codebase for Alchemy Usage

Perform comprehensive scan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Scanning Codebase
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Searching for Alchemy imports and usage...

Found Alchemy usage in:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] Providers:
    ✓ src/components/auth/AlchemyProvider.tsx (47 lines)

[2] Hooks:
    ✓ src/hooks/useAlchemySolanaWallet.tsx (128 lines)
    ✓ src/hooks/useWalletCrypto.tsx (references Alchemy)

[3] Components:
    ✓ src/components/WalletInfo.tsx (uses Alchemy hook)
    ✓ src/components/settings/AdvancedSettings.tsx (wallet config)

[4] Main App:
    ✓ src/main.tsx (imports AlchemyProvider)

[5] Dependencies (package.json):
    ✓ @account-kit/core
    ✓ @account-kit/react
    ✓ @account-kit/signer

[6] Environment Variables (.env):
    ✓ VITE_ALCHEMY_API_KEY
    ✓ VITE_ALCHEMY_GAS_POLICY_ID

[7] Database:
    ⚠ No explicit alchemy_wallets table found
    ✓ Wallet data likely in profiles table

Total files to modify: 6
Total imports to replace: 12
Estimated migration time: 15-20 minutes
```

### 6. Show Migration Plan

Display detailed migration plan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Migration Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: File Replacements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1.1 Create Crossmint Provider
    Action: Create src/providers/CrossmintProvider.tsx
    Source: /crossmint:create-wallet-flow template
    Status: New file

1.2 Create Crossmint Wallet Hook
    Action: Create src/hooks/useCrossmintWallet.tsx
    Source: /crossmint:create-wallet-flow template
    Status: New file

1.3 Update Main App
    Action: Edit src/main.tsx
    Changes:
      - import AlchemyProvider → import CrossmintProvider
      - <AlchemyProvider> → <CrossmintProvider>
    Status: Modification

1.4 Update Components
    Action: Edit src/components/WalletInfo.tsx
    Changes:
      - import useAlchemySolanaWallet → import useCrossmintWallet
      - Adapt to new hook interface
    Status: Modification

1.5 Update Advanced Settings
    Action: Edit src/components/settings/AdvancedSettings.tsx
    Changes:
      - Update wallet configuration UI
      - Replace Alchemy-specific settings
    Status: Modification

Phase 2: Database Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 Create Crossmint Wallets Table
    Action: Create migration file
    File: supabase/migrations/<timestamp>_create_crossmint_wallets.sql
    Status: New file

2.2 Migrate User Wallet Data
    Action: Create data migration script
    File: scripts/migrate-wallet-data.ts
    Changes:
      - Read existing wallet addresses from profiles
      - Create crossmint_wallets records
      - Preserve all user data
    Status: New file

Phase 3: Environment & Dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1 Update Environment Variables
    Action: Update .env
    Changes:
      - Keep: VITE_ALCHEMY_API_KEY (commented, for reference)
      - Add: VITE_CROSSMINT_CLIENT_API_KEY
      - Add: CROSSMINT_SERVER_API_KEY
    Status: Modification

3.2 Update Package Dependencies
    Action: Edit package.json
    Changes:
      - Remove: @account-kit/* packages (after verification)
      - Add: @crossmint/* packages
    Status: Modification

Phase 4: Cleanup (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 Archive Alchemy Files
    Action: Move old files to archive/
    Files:
      - src/components/auth/AlchemyProvider.tsx
      - src/hooks/useAlchemySolanaWallet.tsx
    Status: Archive (not delete)

Phase 5: Git Commits
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each phase will be committed separately:
  1. "feat: Add Crossmint provider and wallet hook"
  2. "feat: Create crossmint_wallets database schema"
  3. "feat: Migrate wallet data to Crossmint"
  4. "refactor: Update components to use Crossmint"
  5. "chore: Update dependencies and environment config"
  6. "chore: Archive Alchemy integration files"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Proceed with migration? [y/N]:
```

### 7. Dry Run Mode (If Selected)

If user selected dry run, show diffs without applying:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DRY RUN: Preview Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preview: src/main.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- import { AlchemyProvider } from '@/components/auth/AlchemyProvider';
+ import { CrossmintProvider } from '@/providers/CrossmintProvider';

  function App() {
    return (
      <ClerkProvider publishableKey={...}>
-       <AlchemyProvider>
+       <CrossmintProvider>
          <RouterProvider router={router} />
-       </AlchemyProvider>
+       </CrossmintProvider>
      </ClerkProvider>
    );
  }

Preview: src/components/WalletInfo.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- import { useAlchemySolanaWallet } from '@/hooks/useAlchemySolanaWallet';
+ import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';

  function WalletInfo() {
-   const { address, isConnected } = useAlchemySolanaWallet();
+   const { primaryAddress, isConnected, addresses } = useCrossmintWallet();

    return (
      <div>
-       <p>Wallet: {address}</p>
+       <p>Primary: {primaryAddress}</p>
+       <p>Solana: {addresses.solana}</p>
+       <p>Ethereum: {addresses.ethereum}</p>
      </div>
    );
  }

... (showing 3 of 6 files)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a DRY RUN. No files were modified.

To apply these changes, run:
  /crossmint:migrate-from-alchemy

And select: [1] Full Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 8. Execute Migration (Full Mode)

If user proceeds with full migration, execute phase by phase:

#### Phase 1: Create Crossmint Files

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase 1: Creating Crossmint Files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/2] Creating CrossmintProvider...
✓ Created: src/providers/CrossmintProvider.tsx

[2/2] Creating useCrossmintWallet hook...
✓ Created: src/hooks/useCrossmintWallet.tsx

Committing changes...
✓ Commit: "feat: Add Crossmint provider and wallet hook"
```

#### Phase 2: Database Migration

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase 2: Database Migration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/2] Creating crossmint_wallets table...
✓ Created: supabase/migrations/20260126143022_create_crossmint_wallets.sql

[2/2] Creating data migration script...
✓ Created: scripts/migrate-wallet-data.ts

Committing changes...
✓ Commit: "feat: Create crossmint_wallets database schema"

Run database migration now? [Y/n]:
```

If yes:
```bash
supabase db push
```

Output:
```
Applying migration...
✓ Migration applied successfully

Table created: crossmint_wallets
Indexes created: 3
RLS policies created: 3
```

#### Phase 3: Migrate User Data

Create and run data migration script:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase 3: Migrating User Wallet Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 247 users with wallet data in profiles table.

Migrate user data now? [Y/n]:
```

Generate `scripts/migrate-wallet-data.ts`:

```typescript
/**
 * Wallet Data Migration Script
 *
 * Migrates existing wallet addresses from profiles table
 * to new crossmint_wallets table.
 *
 * SAFETY: Preserves all existing data, no deletions.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for migration
);

async function migrateWalletData() {
  console.log('Starting wallet data migration...\n');

  try {
    // 1. Fetch all users with wallet addresses
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, wallet_address, solana_address')
      .not('wallet_address', 'is', null);

    if (fetchError) throw fetchError;

    console.log(`Found ${profiles.length} users with wallet data\n`);

    // 2. Migrate each user's wallet data
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const profile of profiles) {
      try {
        // Check if already migrated
        const { data: existing } = await supabase
          .from('crossmint_wallets')
          .select('id')
          .eq('user_id', profile.id)
          .single();

        if (existing) {
          console.log(`⊘ Skipping ${profile.id} (already migrated)`);
          skipped++;
          continue;
        }

        // Create crossmint_wallets record
        const { error: insertError } = await supabase
          .from('crossmint_wallets')
          .insert({
            user_id: profile.id,
            solana_address: profile.solana_address || profile.wallet_address,
            primary_chain: 'solana',
            wallet_type: 'evm-smart-wallet',
          });

        if (insertError) throw insertError;

        console.log(`✓ Migrated ${profile.id}`);
        migrated++;
      } catch (err) {
        console.error(`✗ Error migrating ${profile.id}:`, err);
        errors++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ Migrated: ${migrated}`);
    console.log(`⊘ Skipped:  ${skipped}`);
    console.log(`✗ Errors:   ${errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errors > 0) {
      console.log('⚠ Some records failed to migrate. Check logs above.');
      process.exit(1);
    }

    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateWalletData();
```

Run migration:
```bash
npx tsx scripts/migrate-wallet-data.ts
```

Output:
```
Starting wallet data migration...

Found 247 users with wallet data

✓ Migrated user-id-1
✓ Migrated user-id-2
✓ Migrated user-id-3
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Migrated: 247
⊘ Skipped:  0
✗ Errors:   0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Migration completed successfully!
```

Commit:
```bash
git add scripts/migrate-wallet-data.ts
git commit -m "feat: Migrate wallet data to Crossmint"
```

#### Phase 4: Update Components

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase 4: Updating Components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Updating src/main.tsx...
✓ Updated imports and provider

[2/4] Updating src/components/WalletInfo.tsx...
✓ Replaced hook usage

[3/4] Updating src/components/settings/AdvancedSettings.tsx...
✓ Updated wallet settings

[4/4] Updating src/hooks/useWalletCrypto.tsx...
✓ Fixed wallet references

Committing changes...
✓ Commit: "refactor: Update components to use Crossmint"
```

#### Phase 5: Update Dependencies

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase 5: Updating Dependencies
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Installing Crossmint packages...
npm install @crossmint/client-sdk-react-ui @crossmint/client-sdk-auth @crossmint/wallets-sdk

Removing Alchemy packages...
npm uninstall @account-kit/core @account-kit/react @account-kit/signer

Updating .env...
✓ Commented out VITE_ALCHEMY_API_KEY
✓ Added VITE_CROSSMINT_CLIENT_API_KEY
✓ Added CROSSMINT_SERVER_API_KEY

Committing changes...
✓ Commit: "chore: Update dependencies and environment config"
```

#### Phase 6: Archive Alchemy Files

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Phase 6: Archiving Old Files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating archive directory...
✓ Created: archive/alchemy-integration/

Moving old files...
✓ Moved: src/components/auth/AlchemyProvider.tsx
✓ Moved: src/hooks/useAlchemySolanaWallet.tsx

Committing changes...
✓ Commit: "chore: Archive Alchemy integration files"
```

### 9. Post-Migration Verification

Run automated verification tests:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Post-Migration Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running verification checks...

TypeScript Compilation:
✓ No type errors

Import References:
✓ No Alchemy imports remaining
✓ All Crossmint imports resolved

Database Schema:
✓ crossmint_wallets table exists
✓ RLS policies active
✓ Indexes created

User Data:
✓ All 247 users migrated
✓ No data loss detected
✓ Primary keys intact

Build Check:
✓ npm run build successful

Git History:
✓ 6 incremental commits created
✓ Backup branch preserved
✓ Clean working directory

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All verification checks passed! ✓
```

### 10. Migration Complete Summary

```
╔══════════════════════════════════════════════════════════════╗
║       Migration Completed Successfully! ✓                    ║
╚══════════════════════════════════════════════════════════════╝

Migration Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files Replaced:        6
Files Created:         5
Database Tables:       1
Users Migrated:        247
Git Commits:           6
Time Elapsed:          18 minutes

What Changed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ AlchemyProvider → CrossmintProvider
✓ useAlchemySolanaWallet → useCrossmintWallet
✓ Single-chain (Solana) → Multi-chain (Solana + Base + Ethereum + Polygon)
✓ Manual wallet sync → Automatic sync
✓ Alchemy Account Kit packages → Crossmint SDK packages

Git Commits Created:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. feat: Add Crossmint provider and wallet hook
2. feat: Create crossmint_wallets database schema
3. feat: Migrate wallet data to Crossmint
4. refactor: Update components to use Crossmint
5. chore: Update dependencies and environment config
6. chore: Archive Alchemy integration files

Backup Branch:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created: backup/pre-crossmint-migration-20260126-143022

To restore from backup:
  git checkout backup/pre-crossmint-migration-20260126-143022

To delete backup (after testing):
  git branch -D backup/pre-crossmint-migration-20260126-143022

Rollback Instructions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you need to rollback this migration:

1. Restore from backup branch:
   git checkout backup/pre-crossmint-migration-20260126-143022

2. Create new branch from backup:
   git checkout -b feature/rollback-crossmint

3. Or revert commits one by one:
   git revert HEAD~6..HEAD

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Test wallet creation flow:
   - Sign in with Clerk
   - Verify wallet auto-creation
   - Check multichain addresses

2. Test existing users:
   - Verify migrated wallet data
   - Check Supabase crossmint_wallets table
   - Ensure no data loss

3. Run application:
   npm run dev

4. Deploy to staging:
   git push origin <current_branch>

5. Monitor for issues:
   - Check error logs
   - Watch for wallet creation failures
   - Verify Crossmint API usage

6. Clean up (optional):
   - Remove Alchemy environment variables
   - Delete backup branch (after verification)
   - Remove archived files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your migration is complete! Test thoroughly before deploying.
```

### 11. Generate Migration Report

Create `docs/CROSSMINT_MIGRATION_REPORT.md`:

```markdown
# Crossmint Migration Report

**Date**: <timestamp>
**Duration**: 18 minutes
**Status**: ✓ Completed Successfully

## Overview

Successfully migrated BlockDrive from Alchemy Account Kit to Crossmint Embedded Wallets.

## Statistics

- **Files Modified**: 6
- **Files Created**: 5
- **Users Migrated**: 247
- **Data Loss**: 0 records
- **Git Commits**: 6 (incremental)
- **Backup Branch**: backup/pre-crossmint-migration-20260126-143022

## Changes

### Code Changes

| File | Action | Changes |
|------|--------|---------|
| src/providers/CrossmintProvider.tsx | Created | New provider component |
| src/hooks/useCrossmintWallet.tsx | Created | New wallet hook |
| src/main.tsx | Modified | Updated provider import |
| src/components/WalletInfo.tsx | Modified | Updated hook usage |
| package.json | Modified | Updated dependencies |

### Database Changes

| Table | Action | Description |
|-------|--------|-------------|
| crossmint_wallets | Created | Multichain wallet storage |
| profiles | Preserved | Existing data intact |

### Data Migration

- **Total Users**: 247
- **Migrated Successfully**: 247
- **Failed**: 0
- **Skipped**: 0

## Testing Checklist

- [ ] Wallet creation for new users
- [ ] Wallet access for existing users
- [ ] Multichain address retrieval
- [ ] Transaction signing
- [ ] Supabase sync
- [ ] UI wallet display
- [ ] Error handling

## Rollback Plan

If issues are encountered:

1. Checkout backup branch:
   ```bash
   git checkout backup/pre-crossmint-migration-20260126-143022
   ```

2. Or revert commits:
   ```bash
   git revert HEAD~6..HEAD
   ```

## Known Issues

None detected during migration.

## Next Steps

1. Deploy to staging environment
2. Run smoke tests
3. Monitor error logs
4. Gradually roll out to production
5. Clean up backup branch after verification

## Support

- Crossmint Docs: https://docs.crossmint.com
- Migration Tool: `/crossmint:migrate-from-alchemy`
- Contact: sean@blockdrive.co
```

## Error Handling

### Uncommitted Changes

```
✗ Error: Uncommitted changes detected

You have uncommitted changes in your working directory.
Please commit or stash them before migration.

Modified files:
  M src/components/WalletInfo.tsx
  M package.json

Commit changes:
  git add .
  git commit -m "Save work before migration"

Or stash changes:
  git stash
```

### Migration Conflicts

```
⚠ Warning: Conflicting files detected

The following files exist and will be overwritten:
- src/providers/CrossmintProvider.tsx
- src/hooks/useCrossmintWallet.tsx

Options:
[1] Backup existing files and continue
[2] Cancel migration

Select [1-2]:
```

### Database Migration Failure

```
✗ Error: Database migration failed

Failed to create crossmint_wallets table.

Error: relation "crossmint_wallets" already exists

This might mean:
- Migration was partially run before
- Manual table creation occurred

Options:
[1] Drop table and retry (⚠ dangerous)
[2] Skip database migration
[3] Cancel

Select [1-3]:
```

### Data Migration Errors

```
⚠ Warning: Some users failed to migrate

Migration Summary:
✓ Migrated: 240
⊘ Skipped:  3
✗ Errors:   4

Failed users saved to: migration-errors.log

Review errors? [Y/n]:
```

## Example Usage

```bash
# Preview migration (dry run)
/crossmint:migrate-from-alchemy
# Select: [3] Dry Run

# Execute full migration
/crossmint:migrate-from-alchemy
# Select: [1] Full Migration

# Parallel migration (keep both)
/crossmint:migrate-from-alchemy
# Select: [2] Parallel Migration
```

## Notes

- Always creates backup branch before starting
- Incremental git commits preserve history
- Data migration is non-destructive (no deletions)
- Dry run mode available for safe exploration
- Complete rollback instructions provided
- Automated verification after migration
- Detailed migration report generated
- User data preservation guaranteed
