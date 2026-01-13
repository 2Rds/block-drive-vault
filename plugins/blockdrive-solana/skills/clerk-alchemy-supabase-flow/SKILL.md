---
name: Clerk-Alchemy-Supabase Integration Flow
description: This skill should be used when the user asks about "BlockDrive auth flow", "wallet sync to database", "Clerk Alchemy Supabase integration", "embedded wallet sync", "user profile with wallet", "sync-alchemy-wallet", "wallet database storage", or needs to understand or implement the complete authentication and wallet synchronization flow used in BlockDrive. This is the core integration pattern connecting user identity to blockchain wallets.
version: 0.1.0
---

# Clerk-Alchemy-Supabase Integration Flow

## Overview

BlockDrive uses a three-service integration pattern: Clerk for identity, Alchemy for embedded wallets, and Supabase for data persistence. This creates a seamless experience where users authenticate once and automatically receive a blockchain wallet linked to their account.

## When to Use

Activate this skill when:
- Understanding the complete BlockDrive auth architecture
- Implementing wallet-to-user linking
- Syncing wallet addresses to the database
- Troubleshooting the auth/wallet flow
- Extending the integration pattern

## Complete Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 BLOCKDRIVE AUTH ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │  CLERK   │────▶│ ALCHEMY  │────▶│ SUPABASE │                │
│  │ Identity │     │  Wallet  │     │ Database │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│       │                │                │                       │
│       │                │                │                       │
│  1. User signs in   2. JWT creates   3. Wallet address         │
│     via Clerk          MPC wallet       stored in profiles      │
│                                                                  │
│  ────────────────────────────────────────────────────────────  │
│                                                                  │
│  User Experience: Sign in once → Wallet automatically created  │
│  No seed phrases, no wallet extensions, gas-sponsored txns     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Flow

### Step 1: User Authentication (Clerk)

```typescript
// User signs in via Clerk UI component
// Clerk manages the entire auth flow

import { useAuth, useSession } from '@clerk/clerk-react';

const { isSignedIn, getToken } = useAuth();
const { session } = useSession();

// Wait for successful sign-in
if (isSignedIn && session) {
  // Proceed to wallet initialization
}
```

### Step 2: JWT Token Retrieval

```typescript
// Get the Clerk session token for Alchemy auth
const clerkToken = await getToken();

// This token contains:
// - User ID (sub claim)
// - Session ID
// - Expiration time
// - Clerk issuer URL

// Token is OIDC-compliant for Alchemy validation
```

### Step 3: Wallet Initialization (Alchemy)

```typescript
import { AlchemySignerWebClient, SolanaSigner } from '@account-kit/signer';

// Initialize Alchemy Web Signer with Clerk JWT
const signerClient = new AlchemySignerWebClient({
  connection: { jwt: clerkToken },
  iframeConfig: { iframeContainerId: 'alchemy-signer-iframe-container' },
});

// Authenticate with Alchemy
const authResponse = await signerClient.submitJwt({
  jwt: clerkToken,
  authProvider: 'clerk',
});

// Complete authentication
await signerClient.completeAuthWithBundle({
  bundle: authResponse.bundle,
  orgId: authResponse.orgId,
  connectedEventName: 'connected',
  authenticatingType: 'jwt',
});

// Create Solana signer
const solanaSigner = new SolanaSigner(signerClient);
const walletAddress = solanaSigner.address;
```

### Step 4: Wallet Sync to Supabase

```typescript
// Sync the wallet address to user's profile in Supabase
const syncWalletToDatabase = async (address: string, token: string) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/sync-alchemy-wallet`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        solanaAddress: address,
        walletProvider: 'alchemy_embedded_mpc',
        network: 'devnet', // or 'mainnet'
      }),
    }
  );

  return response.json();
};
```

## Supabase Edge Function

The `sync-alchemy-wallet` edge function handles wallet persistence:

```typescript
// supabase/functions/sync-alchemy-wallet/index.ts

Deno.serve(async (req) => {
  // 1. Validate Authorization header (Clerk JWT)
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  // 2. Extract Clerk user ID from JWT
  const payload = JSON.parse(atob(token.split('.')[1]));
  const clerkUserId = payload.sub;

  // 3. Parse request body
  const { solanaAddress, walletProvider } = await req.json();

  // 4. Validate Solana address format
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!base58Regex.test(solanaAddress)) {
    return new Response(JSON.stringify({ error: 'Invalid address' }), {
      status: 400
    });
  }

  // 5. Upsert to profiles table
  const { error } = await supabase
    .from('profiles')
    .upsert({
      clerk_user_id: clerkUserId,
      solana_wallet_address: solanaAddress,
      wallet_provider: walletProvider,
      wallet_created_at: new Date().toISOString(),
    }, {
      onConflict: 'clerk_user_id'
    });

  return new Response(JSON.stringify({ success: true }));
});
```

## Database Schema

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  solana_wallet_address TEXT,
  wallet_provider TEXT DEFAULT 'alchemy_embedded_mpc',
  wallet_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_wallet ON profiles(solana_wallet_address);
```

## Complete Provider Implementation

```tsx
// Combining all three services in one provider

export function BlockDriveAuthProvider({ children }) {
  const { isSignedIn, getToken } = useAuth();
  const { session } = useSession();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletReady, setIsWalletReady] = useState(false);

  const signerRef = useRef<SolanaSigner | null>(null);

  useEffect(() => {
    if (!isSignedIn || !session || isWalletReady) return;

    const initializeWallet = async () => {
      try {
        // Step 1: Get Clerk token
        const token = await getToken();
        if (!token) throw new Error('No token');

        // Step 2: Initialize Alchemy
        const signerClient = new AlchemySignerWebClient({
          connection: { jwt: token },
          iframeConfig: { iframeContainerId: 'alchemy-signer-iframe' },
        });

        // Step 3: Authenticate
        const authResponse = await signerClient.submitJwt({
          jwt: token,
          authProvider: 'clerk',
        });

        await signerClient.completeAuthWithBundle({
          bundle: authResponse.bundle,
          orgId: authResponse.orgId,
          connectedEventName: 'connected',
          authenticatingType: 'jwt',
        });

        // Step 4: Get wallet
        const signer = new SolanaSigner(signerClient);
        signerRef.current = signer;
        setWalletAddress(signer.address);

        // Step 5: Sync to Supabase
        await syncWalletToDatabase(signer.address, token);

        setIsWalletReady(true);
      } catch (error) {
        console.error('Wallet init failed:', error);
      }
    };

    initializeWallet();
  }, [isSignedIn, session, isWalletReady, getToken]);

  return (
    <AuthContext.Provider value={{ walletAddress, isWalletReady, signer: signerRef.current }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Query Wallet from Database

Retrieve wallet for any user operation:

```typescript
// Get wallet address from Supabase for a user
const getUserWallet = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('solana_wallet_address')
    .eq('clerk_user_id', clerkUserId)
    .single();

  return data?.solana_wallet_address;
};

// Verify wallet ownership
const verifyWalletOwnership = async (clerkUserId: string, walletAddress: string) => {
  const storedWallet = await getUserWallet(clerkUserId);
  return storedWallet === walletAddress;
};
```

## Error Handling

### Common Integration Errors

```typescript
const handleIntegrationError = (error: Error, step: string) => {
  switch (step) {
    case 'clerk':
      // User not signed in or session expired
      // Redirect to sign-in
      break;

    case 'alchemy':
      // JWT invalid or Alchemy service issue
      // Retry with fresh token
      break;

    case 'supabase':
      // Database sync failed
      // Retry or queue for later
      break;
  }
};
```

## Testing the Flow

### Verify Complete Integration

```typescript
async function testIntegration() {
  // 1. Check Clerk auth
  const { isSignedIn, getToken } = useAuth();
  console.log('Clerk signed in:', isSignedIn);

  // 2. Check wallet initialized
  const { walletAddress } = useAlchemyWallet();
  console.log('Wallet address:', walletAddress);

  // 3. Check database sync
  const token = await getToken();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=solana_wallet_address`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await response.json();
  console.log('Database wallet:', data[0]?.solana_wallet_address);

  // 4. Verify match
  console.log('Wallets match:', walletAddress === data[0]?.solana_wallet_address);
}
```

## Additional Resources

### Reference Files

- **`references/database-schema.md`** - Complete Supabase schema
- **`references/edge-functions.md`** - Edge function patterns

### Examples

- **`examples/complete-provider.tsx`** - Full implementation
- **`examples/sync-function.ts`** - Edge function code
