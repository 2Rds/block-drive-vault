---
name: Alchemy Solana API
description: This skill should be used when the user asks about "Alchemy Solana API", "Solana RPC endpoints", "NFT API queries", "getAssetsByOwner", "transaction history", "Alchemy Enhanced APIs", "blockchain data fetching", "NFT metadata from Alchemy", or needs to query Solana blockchain data through Alchemy's infrastructure. Provides patterns for efficient API usage with proper error handling and caching.
version: 0.1.0
---

# Alchemy Solana API

## Overview

Alchemy provides enhanced Solana APIs that offer significant advantages over standard RPC endpoints: better reliability, higher rate limits, enhanced data formats, and specialized endpoints for NFTs and tokens.

## When to Use

Activate this skill when:
- Querying NFT ownership, metadata, or collection data
- Fetching transaction history for wallets
- Getting token balances and account information
- Optimizing blockchain data retrieval performance
- Implementing caching strategies for RPC calls

## Core API Categories

### Standard Solana RPC

Alchemy supports all standard Solana JSON-RPC methods at enhanced reliability:

```typescript
const connection = new Connection(
  'https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY',
  { commitment: 'confirmed' }
);

// Standard methods work as expected
const balance = await connection.getBalance(publicKey);
const accountInfo = await connection.getAccountInfo(publicKey);
const recentBlockhash = await connection.getLatestBlockhash();
```

### Enhanced NFT APIs

Alchemy's NFT APIs provide structured data without parsing raw account data:

**Get NFTs by Owner:**
```typescript
const response = await fetch(
  `https://solana-devnet.g.alchemy.com/v2/${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: walletAddress,
        page: 1,
        limit: 100
      }
    })
  }
);
```

**Get NFT Metadata:**
```typescript
const response = await fetch(
  `https://solana-devnet.g.alchemy.com/v2/${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAsset',
      params: { id: mintAddress }
    })
  }
);
```

### Token APIs

Query SPL token holdings efficiently:

```typescript
// Get all token accounts for a wallet
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
  publicKey,
  { programId: TOKEN_PROGRAM_ID }
);

// Enhanced: Get token balances with metadata
const response = await fetch(
  `https://solana-devnet.g.alchemy.com/v2/${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        walletAddress,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' }
      ]
    })
  }
);
```

## Best Practices

### Rate Limiting

Alchemy provides generous rate limits but implement backoff:

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }
  throw new Error('Max retries exceeded');
}
```

### Caching Strategy

Cache frequently accessed data to reduce API calls:

```typescript
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

async function getCachedBalance(address: string): Promise<number> {
  const cached = cache.get(`balance:${address}`);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const balance = await connection.getBalance(new PublicKey(address));
  cache.set(`balance:${address}`, { data: balance, timestamp: Date.now() });

  return balance;
}
```

### Error Handling

Handle common Alchemy/Solana errors gracefully:

```typescript
try {
  const result = await connection.getAccountInfo(publicKey);
  if (!result) {
    // Account doesn't exist yet
    return null;
  }
  return result;
} catch (error) {
  if (error.message.includes('429')) {
    // Rate limited - implement backoff
  } else if (error.message.includes('503')) {
    // Service unavailable - retry with different endpoint
  } else if (error.message.includes('Invalid param')) {
    // Bad request - check parameters
  }
  throw error;
}
```

### Connection Configuration

Optimal connection setup for BlockDrive:

```typescript
import { Connection, Commitment } from '@solana/web3.js';

const createConnection = (network: 'devnet' | 'mainnet') => {
  const rpcUrl = network === 'devnet'
    ? `https://solana-devnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

  return new Connection(rpcUrl, {
    commitment: 'confirmed' as Commitment,
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
  });
};
```

## BlockDrive-Specific Patterns

### Fetching User's NFT Collection

```typescript
async function getUserNFTs(walletAddress: string) {
  const response = await fetch(ALCHEMY_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: walletAddress,
        page: 1,
        limit: 100,
        displayOptions: {
          showFungible: false,
          showNativeBalance: false
        }
      }
    })
  });

  const data = await response.json();
  return data.result?.items || [];
}
```

### Transaction History for Audit

```typescript
async function getWalletHistory(walletAddress: string, limit = 50) {
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(walletAddress),
    { limit }
  );

  const transactions = await Promise.all(
    signatures.map(sig =>
      connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0
      })
    )
  );

  return transactions.filter(Boolean);
}
```

## Network Endpoints

| Network | RPC URL |
|---------|---------|
| Devnet | `https://solana-devnet.g.alchemy.com/v2/{API_KEY}` |
| Mainnet | `https://solana-mainnet.g.alchemy.com/v2/{API_KEY}` |

## Additional Resources

### Reference Files

For detailed API documentation and advanced patterns:
- **`references/enhanced-apis.md`** - Complete Enhanced API reference
- **`references/websocket-subscriptions.md`** - Real-time event monitoring

### Examples

Working code examples in `examples/`:
- **`fetch-nfts.ts`** - Fetch NFTs for a wallet
- **`transaction-history.ts`** - Get transaction history

## Common Issues

**Issue: Empty NFT response**
- Verify wallet has NFTs on the correct network (devnet vs mainnet)
- Check the wallet address format is valid base58

**Issue: Rate limiting**
- Implement exponential backoff
- Cache frequently accessed data
- Consider batch requests where possible

**Issue: Stale data**
- Use 'confirmed' commitment for balance checks
- Implement cache invalidation on user actions
- Subscribe to account changes for real-time updates
