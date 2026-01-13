---
name: Devnet vs Mainnet Safety
description: This skill should be used when the user asks about "devnet vs mainnet", "network switching", "mainnet deployment", "production safety", "environment configuration", "mainnet warnings", "devnet testing", or when operations involve real funds or production deployment. Provides safety checks and best practices for environment management.
version: 0.1.0
---

# Devnet vs Mainnet Safety

## Overview

Operating on Solana mainnet involves real funds and irreversible transactions. This skill provides safety checks, environment detection patterns, and best practices to prevent costly mistakes when transitioning from development to production.

## When to Use

Activate this skill when:
- Switching between devnet and mainnet
- Deploying programs to production
- Transferring significant value
- Configuring environment settings
- Any operation that could affect real funds

## Environment Detection

### Automatic Network Detection

```typescript
// Detect network from RPC URL
function detectNetwork(rpcUrl: string): 'devnet' | 'mainnet' | 'unknown' {
  if (rpcUrl.includes('devnet')) return 'devnet';
  if (rpcUrl.includes('mainnet')) return 'mainnet';
  if (rpcUrl.includes('api.devnet.solana.com')) return 'devnet';
  if (rpcUrl.includes('api.mainnet-beta.solana.com')) return 'mainnet';
  return 'unknown';
}

// Detect from genesis hash
async function detectNetworkFromGenesis(connection: Connection): Promise<string> {
  const genesisHash = await connection.getGenesisHash();

  const KNOWN_GENESIS = {
    'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG': 'devnet',
    '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d': 'mainnet-beta',
  };

  return KNOWN_GENESIS[genesisHash] || 'unknown';
}
```

### Configuration-Based Detection

```typescript
// Check environment configuration
interface NetworkConfig {
  network: 'devnet' | 'mainnet';
  rpcUrl: string;
  warnOnMainnet: boolean;
  blockMainnetDeploys: boolean;
}

const getNetworkConfig = (): NetworkConfig => {
  const network = process.env.SOLANA_NETWORK || 'devnet';

  return {
    network: network as 'devnet' | 'mainnet',
    rpcUrl: network === 'mainnet'
      ? process.env.MAINNET_RPC_URL
      : process.env.DEVNET_RPC_URL,
    warnOnMainnet: true,
    blockMainnetDeploys: process.env.ALLOW_MAINNET_DEPLOYS !== 'true',
  };
};
```

## Safety Checks

### Pre-Operation Validation

```typescript
interface SafetyCheck {
  operation: string;
  network: string;
  valueAtRisk: number;
  requiresConfirmation: boolean;
  warnings: string[];
}

function performSafetyCheck(
  operation: string,
  network: string,
  solAmount: number = 0
): SafetyCheck {
  const warnings: string[] = [];
  let requiresConfirmation = false;

  // Mainnet always requires extra caution
  if (network === 'mainnet') {
    warnings.push('⚠️ MAINNET OPERATION - Real funds at risk');
    requiresConfirmation = true;
  }

  // High-value operations
  if (solAmount > 1 && network === 'mainnet') {
    warnings.push(`⚠️ High value: ${solAmount} SOL`);
  }

  // Deployment operations
  if (operation.includes('deploy') && network === 'mainnet') {
    warnings.push('⚠️ Program deployment to mainnet is irreversible');
    requiresConfirmation = true;
  }

  // Token creation
  if (operation.includes('create-token') && network === 'mainnet') {
    warnings.push('⚠️ Token creation costs rent (~0.002 SOL)');
  }

  return {
    operation,
    network,
    valueAtRisk: solAmount,
    requiresConfirmation,
    warnings,
  };
}
```

### Dangerous Operations List

Operations requiring confirmation on mainnet:

| Operation | Risk Level | Confirmation Required |
|-----------|------------|----------------------|
| Program deploy | HIGH | Yes + double-check |
| Program upgrade | HIGH | Yes |
| SOL transfer > 1 | MEDIUM | Yes |
| Token creation | LOW | Warning only |
| NFT mint | LOW | Warning only |
| Account close | MEDIUM | Yes |
| Program close | HIGH | Yes + backup |

## Environment Switching

### Safe Environment Switch

```typescript
async function switchEnvironment(
  targetNetwork: 'devnet' | 'mainnet'
): Promise<{ success: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  // Warn when switching to mainnet
  if (targetNetwork === 'mainnet') {
    warnings.push('⚠️ Switching to MAINNET');
    warnings.push('⚠️ All operations will use real SOL');
    warnings.push('⚠️ Transactions are irreversible');
  }

  // Verify configuration
  const config = getNetworkConfig();
  if (targetNetwork === 'mainnet' && !process.env.MAINNET_RPC_URL) {
    return {
      success: false,
      warnings: ['ERROR: MAINNET_RPC_URL not configured'],
    };
  }

  // Update configuration
  process.env.SOLANA_NETWORK = targetNetwork;

  return { success: true, warnings };
}
```

### CLI Environment Switch

```bash
# Switch to devnet (safe)
solana config set --url devnet
echo "✅ Switched to devnet - safe for testing"

# Switch to mainnet (requires confirmation)
echo "⚠️  WARNING: Switching to MAINNET"
echo "⚠️  All operations will use real SOL"
echo "⚠️  Transactions are irreversible"
read -p "Type 'MAINNET' to confirm: " confirm
if [ "$confirm" = "MAINNET" ]; then
  solana config set --url mainnet-beta
  echo "✅ Switched to mainnet"
else
  echo "❌ Cancelled"
fi
```

## BlockDrive Configuration

### Current Configuration Pattern

```typescript
// src/config/alchemy.ts - Current BlockDrive pattern

export const alchemyConfig: AlchemyConfig = {
  apiKey: process.env.ALCHEMY_API_KEY,
  policyId: process.env.ALCHEMY_POLICY_ID,
  solanaRpcUrl: process.env.SOLANA_RPC_URL,
  isProduction: process.env.SOLANA_NETWORK === 'mainnet',
  network: (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet',
};
```

### Recommended Environment Variables

```bash
# .env.development
SOLANA_NETWORK=devnet
ALCHEMY_API_KEY=your_devnet_api_key
ALCHEMY_POLICY_ID=your_devnet_policy_id
SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}

# .env.production
SOLANA_NETWORK=mainnet
ALCHEMY_API_KEY=your_mainnet_api_key
ALCHEMY_POLICY_ID=your_mainnet_policy_id
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
```

## Pre-Deployment Checklist

### Before Mainnet Deployment

```markdown
## Mainnet Deployment Checklist

### Code Review
- [ ] All tests passing on devnet
- [ ] Security audit completed (or self-review documented)
- [ ] No hardcoded devnet addresses
- [ ] No test/debug code remaining

### Configuration
- [ ] Mainnet RPC URL configured
- [ ] Mainnet program ID set in Anchor.toml
- [ ] Gas policy configured for mainnet
- [ ] Environment variables verified

### Testing
- [ ] Deployed and tested on devnet
- [ ] Tested with multiple wallet addresses
- [ ] Edge cases handled
- [ ] Error handling verified

### Backup
- [ ] Program keypair backed up securely
- [ ] Upgrade authority documented
- [ ] Recovery procedure documented

### Financial
- [ ] Deployment wallet has sufficient SOL
- [ ] Cost estimate completed
- [ ] Rent requirements calculated

### Final Verification
- [ ] Double-check network before deploy
- [ ] Verify wallet address
- [ ] Confirm you're ready for irreversible deployment
```

## Error Prevention

### Common Mistakes

**Mistake: Wrong network**
```typescript
// BAD: Hardcoded network
const connection = new Connection('https://api.mainnet-beta.solana.com');

// GOOD: Environment-based
const connection = new Connection(process.env.SOLANA_RPC_URL);
```

**Mistake: Missing confirmation**
```typescript
// BAD: No confirmation for dangerous operation
await program.methods.closeAccount().rpc();

// GOOD: Confirm first
if (network === 'mainnet') {
  const confirmed = await confirmMainnetOperation('close account');
  if (!confirmed) return;
}
await program.methods.closeAccount().rpc();
```

**Mistake: Test addresses in production**
```typescript
// BAD: Hardcoded test address
const recipient = 'DevnetTestAddress...';

// GOOD: Environment-specific
const recipient = process.env.RECIPIENT_ADDRESS;
```

## Quick Safety Reference

### Always Safe (Devnet)
- Airdrop SOL
- Deploy test programs
- Create test tokens
- Test transactions
- Experiment freely

### Requires Caution (Mainnet)
- Any SOL transfer
- Program deployment
- Token creation
- NFT minting
- Account modifications

### Requires Extra Confirmation (Mainnet)
- Transfer > 1 SOL
- Program deployment
- Program upgrade
- Account closure
- Authority transfer

## Additional Resources

### Reference Files

- **`references/security-checklist.md`** - Complete security checklist
- **`references/recovery-procedures.md`** - Disaster recovery guide

### Examples

- **`examples/safe-deploy.sh`** - Safe deployment script with confirmations
- **`examples/environment-check.ts`** - Environment validation utility
