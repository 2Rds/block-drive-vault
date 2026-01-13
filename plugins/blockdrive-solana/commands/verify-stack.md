---
name: verify-stack
description: Verify the BlockDrive integration stack (Clerk → Alchemy → Supabase) is properly configured and connected. Checks environment variables, API connectivity, and database sync.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Verify Stack Command

Verify that the complete BlockDrive authentication and wallet integration stack is properly configured.

## Instructions

When this command is invoked, perform these verification steps:

### Step 1: Check Environment Configuration

Read and verify these configuration files exist and have required values:

1. **Check `.env` or `.env.local`** for:
   - `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

2. **Check `src/config/alchemy.ts`** for:
   - Alchemy API key configuration
   - Gas policy ID
   - RPC URL (devnet or mainnet)

### Step 2: Verify Clerk Configuration

1. Check that ClerkProvider is properly set up in the app
2. Verify Clerk publishable key format (`pk_test_` or `pk_live_`)
3. Look for Clerk issuer URL configuration

### Step 3: Verify Alchemy Configuration

1. Check AlchemyProvider component exists
2. Verify iframe container for MPC signer is configured
3. Check gas sponsorship policy ID is set
4. Verify RPC URL matches expected network

### Step 4: Verify Supabase Integration

1. Check Supabase client configuration
2. Verify `sync-alchemy-wallet` edge function exists
3. Check profiles table schema includes wallet fields

### Step 5: Generate Report

Output a verification report:

```
BlockDrive Stack Verification
=============================

Environment: devnet | mainnet
Timestamp: [current time]

✅ Clerk Configuration
   - Publishable Key: pk_test_... (configured)
   - Issuer URL: https://...clerk.accounts.dev/

✅ Alchemy Configuration
   - API Key: Configured
   - Policy ID: b54fccd1-...
   - RPC URL: https://solana-devnet.g.alchemy.com/v2/...
   - Network: devnet

✅ Supabase Configuration
   - URL: https://....supabase.co
   - Anon Key: Configured
   - Sync Function: Found

⚠️ Warnings:
   - [Any warnings found]

❌ Issues:
   - [Any critical issues]

Recommendations:
   - [Any suggestions for improvement]
```

## Sensitive Data Handling

- Never output full API keys or secrets
- Show only first/last few characters: `pk_test_abc...xyz`
- Flag if any secrets appear to be hardcoded vs environment variables

## Common Issues to Check

1. **Hardcoded API keys** - Should use environment variables
2. **Mismatched networks** - All services should use same network
3. **Missing edge functions** - Check Supabase functions exist
4. **Outdated dependencies** - Check @account-kit/signer version
