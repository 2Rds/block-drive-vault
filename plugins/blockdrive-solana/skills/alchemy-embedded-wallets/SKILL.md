---
name: Alchemy Embedded Wallets
description: This skill should be used when the user asks about "Alchemy Account Kit", "embedded wallets", "MPC wallets", "Web Signer", "gas sponsorship", "iframe stamper", "wallet creation", "signTransaction", "signAndSendTransaction", "Alchemy signer", or needs to implement non-custodial embedded wallets with Alchemy's MPC infrastructure. Covers the complete Account Kit integration pattern used in BlockDrive.
version: 0.1.0
---

# Alchemy Embedded Wallets

## Overview

Alchemy Account Kit provides MPC-based embedded wallets that allow users to have non-custodial Solana wallets without managing private keys. The wallet is created and controlled through multi-party computation (MPC), with the user authenticating via OIDC providers like Clerk.

## When to Use

Activate this skill when:
- Setting up embedded wallet infrastructure
- Implementing wallet creation with Clerk JWT
- Configuring gas sponsorship policies
- Signing or sending transactions
- Troubleshooting wallet initialization issues

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MPC WALLET FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│  1. User authenticates with Clerk → Gets JWT                    │
│  2. JWT submitted to AlchemySignerWebClient                     │
│  3. Alchemy validates JWT with OIDC provider                    │
│  4. MPC wallet created/retrieved for user                       │
│  5. SolanaSigner wraps client for Solana operations            │
│  6. Transactions signed via MPC (user never sees private key)  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Required Packages

```bash
npm install @account-kit/signer @solana/web3.js
```

### Initialize Web Signer Client

```typescript
import { AlchemySignerWebClient, SolanaSigner } from '@account-kit/signer';

// Create the signer client with JWT authentication
const signerClient = new AlchemySignerWebClient({
  connection: {
    jwt: clerkSessionToken,
  },
  iframeConfig: {
    iframeContainerId: 'alchemy-signer-iframe-container',
  },
});
```

### Authenticate with Clerk JWT

```typescript
// Submit JWT for authentication
const authResponse = await signerClient.submitJwt({
  jwt: clerkSessionToken,
  authProvider: 'clerk',
});

// Complete authentication to get user info
const user = await signerClient.completeAuthWithBundle({
  bundle: authResponse.bundle,
  orgId: authResponse.orgId,
  connectedEventName: 'connected',
  authenticatingType: 'jwt',
});
```

### Create Solana Signer

```typescript
// Wrap the authenticated client for Solana operations
const solanaSigner = new SolanaSigner(signerClient);

// Get the wallet address
const walletAddress = solanaSigner.address;
console.log('MPC Wallet:', walletAddress);
```

### Hidden Iframe Container

The MPC stamper requires a hidden iframe for secure key operations:

```tsx
<div
  id="alchemy-signer-iframe-container"
  style={{
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    width: '1px',
    height: '1px',
    opacity: 0,
    pointerEvents: 'none'
  }}
/>
```

## Transaction Operations

### Sign Transaction

Sign without sending (for inspection or multi-sig):

```typescript
const signTransaction = async (
  transaction: Transaction | VersionedTransaction
): Promise<Transaction | VersionedTransaction> => {
  if (!solanaSigner) {
    throw new Error('Wallet not initialized');
  }

  const signedTx = await solanaSigner.addSignature(transaction);
  return signedTx;
};
```

### Sign and Send with Gas Sponsorship

Send transaction with Alchemy paying gas fees:

```typescript
const signAndSendTransaction = async (
  transaction: Transaction | VersionedTransaction
): Promise<string> => {
  if (!solanaSigner || !connection) {
    throw new Error('Wallet not initialized');
  }

  let sponsoredTx: VersionedTransaction;

  if (transaction instanceof Transaction) {
    // Convert legacy to sponsored versioned transaction
    const instructions = transaction.instructions;
    sponsoredTx = await solanaSigner.addSponsorship(
      instructions,
      connection,
      ALCHEMY_POLICY_ID
    );
  } else {
    // Sign versioned transaction directly
    sponsoredTx = await solanaSigner.addSignature(transaction);
  }

  // Send to network
  const signature = await connection.sendRawTransaction(
    sponsoredTx.serialize(),
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    }
  );

  return signature;
};
```

### Sign Message

Sign arbitrary messages for verification:

```typescript
const signMessage = async (message: Uint8Array): Promise<Uint8Array> => {
  if (!solanaSigner) {
    throw new Error('Wallet not initialized');
  }

  const signature = await solanaSigner.signMessage(message);
  return signature as Uint8Array;
};
```

## Gas Sponsorship

### Policy Configuration

Gas sponsorship policies are configured in the Alchemy dashboard:
1. Navigate to Account Kit → Gas Manager
2. Create a new policy for Solana
3. Set spending limits and allowed operations
4. Copy the Policy ID

### Using Sponsorship

```typescript
// Policy ID from Alchemy dashboard
const ALCHEMY_POLICY_ID = 'your-policy-id';

// Add sponsorship to instructions
const sponsoredTx = await solanaSigner.addSponsorship(
  instructions,
  connection,
  ALCHEMY_POLICY_ID
);
```

### Sponsorship Limits

Configure policy limits in Alchemy dashboard:
- Daily spending cap (in SOL)
- Per-transaction limit
- Allowed transaction types
- Whitelisted programs

## BlockDrive Implementation

### Complete Provider Pattern

```typescript
export function AlchemyProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const { isSignedIn, getToken } = useClerkAuth();

  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const signerClientRef = useRef<AlchemySignerWebClient | null>(null);
  const solanaSignerRef = useRef<SolanaSigner | null>(null);

  const initializeWallet = useCallback(async () => {
    if (!isSignedIn || !session) return;

    const token = await getToken();
    if (!token) throw new Error('Failed to get Clerk token');

    // Initialize signer
    const signerClient = new AlchemySignerWebClient({
      connection: { jwt: token },
      iframeConfig: { iframeContainerId: 'alchemy-signer-iframe-container' },
    });

    // Authenticate
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

    // Create Solana signer
    const solanaSigner = new SolanaSigner(signerClient);

    signerClientRef.current = signerClient;
    solanaSignerRef.current = solanaSigner;
    setSolanaAddress(solanaSigner.address);
    setIsInitialized(true);
  }, [isSignedIn, session, getToken]);

  // Auto-initialize on sign in
  useEffect(() => {
    if (isSignedIn && !isInitialized) {
      initializeWallet();
    }
  }, [isSignedIn, isInitialized, initializeWallet]);

  // ... context provider
}
```

## Troubleshooting

### Wallet Not Initializing

1. Verify Clerk session is active (`isSignedIn === true`)
2. Check JWT token is valid and not expired
3. Ensure iframe container exists in DOM before initialization
4. Verify Alchemy API key is correct

### Transaction Signing Fails

1. Check wallet is initialized (`isInitialized === true`)
2. Verify transaction is properly constructed
3. For sponsored transactions, verify policy ID is correct
4. Check network matches (devnet vs mainnet)

### Gas Sponsorship Not Working

1. Verify policy ID matches Alchemy dashboard
2. Check policy hasn't exceeded spending limits
3. Ensure transaction type is allowed by policy
4. Verify policy is active for correct network

## Additional Resources

### Reference Files

For detailed patterns and troubleshooting:
- **`references/account-kit-api.md`** - Complete Account Kit API reference
- **`references/gas-policies.md`** - Gas sponsorship configuration guide

### Examples

Working implementations in `examples/`:
- **`wallet-provider.tsx`** - Complete React provider
- **`sign-transaction.ts`** - Transaction signing patterns
