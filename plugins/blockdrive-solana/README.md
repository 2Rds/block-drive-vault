# BlockDrive Solana Plugin

A Claude Code plugin for Solana blockchain development with BlockDrive's embedded wallet architecture.

## Features

- **Alchemy Integration**: Solana RPC APIs, embedded MPC wallets, gas sponsorship
- **Clerk Authentication**: JWT flows, OAuth setup, OIDC integration with Alchemy
- **Supabase Sync**: Wallet address storage and user profile management
- **Solana Tools**: CLI utilities for SPL tokens, Metaplex NFTs, Anchor programs
- **Safety Guards**: Devnet/mainnet environment detection and warnings

## Components

### Skills (Auto-Activating Knowledge)
- `alchemy-solana-api` - Alchemy RPC and Enhanced APIs for Solana
- `alchemy-embedded-wallets` - Account Kit, Web Signer, gas sponsorship
- `clerk-authentication` - JWT flows, OAuth, Organizations
- `clerk-alchemy-supabase-flow` - BlockDrive's specific integration pattern
- `solana-cli-tools` - spl-token, Metaplex, Anchor framework
- `devnet-mainnet-safety` - Environment detection and safety checks

### Commands
- `/check-wallet` - Check wallet balance and status
- `/verify-stack` - Verify Clerk → Alchemy → Supabase integration
- `/deploy-program` - Deploy Anchor programs with safety checks
- `/switch-environment` - Toggle between devnet and mainnet

### Hooks
- **PreToolUse**: Warns before mainnet operations or dangerous commands

### MCP Servers
- **Clerk MCP**: SDK snippets and implementation patterns

## Installation

Load the plugin when starting Claude Code:

```bash
claude --plugin-dir ./plugins/blockdrive-solana
```

Or add to your Claude Code settings for automatic loading.

## Environment Variables

The plugin uses environment variables for sensitive configuration:

```bash
# Alchemy
ALCHEMY_API_KEY=your_api_key
ALCHEMY_POLICY_ID=your_gas_policy_id

# Clerk
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Solana
SOLANA_NETWORK=devnet  # or mainnet
SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your_key
```

## Configuration

Create `.claude/blockdrive-solana.local.md` for project-specific settings:

```yaml
---
environment: devnet
alchemy_rpc: ${ALCHEMY_API_KEY}
gas_policy: ${ALCHEMY_POLICY_ID}
warn_on_mainnet: true
block_mainnet_deploys: true
---
```

## Usage Examples

### Check wallet status
```
/check-wallet
```

### Verify your integration stack is working
```
/verify-stack
```

### Deploy a program to devnet
```
/deploy-program my-program --network devnet
```

### Switch to mainnet (with safety confirmation)
```
/switch-environment mainnet
```

## Architecture Reference

This plugin is designed for BlockDrive's specific architecture:

```
User → Clerk Auth → JWT Token → Alchemy Web Signer → MPC Wallet
                                        ↓
                              Supabase (wallet sync)
                                        ↓
                              Gas-Sponsored Transactions
```

## License

MIT
