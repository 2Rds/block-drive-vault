---
name: switch-environment
description: Switch between Solana devnet and mainnet environments. Updates CLI config and verifies environment variables are set correctly for the target network.
argument-hint: "<devnet|mainnet>"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Switch Environment Command

Safely switch between Solana devnet and mainnet environments.

## Instructions

When this command is invoked:

### Step 1: Parse Target Environment

- Accept `devnet` or `mainnet` as argument
- If no argument, show current environment and ask which to switch to

### Step 2: Display Current Configuration

Show the current state:
```bash
solana config get
```

Display:
```
Current Environment
==================
Network: devnet
RPC URL: https://solana-devnet.g.alchemy.com/v2/...
Wallet: ~/.config/solana/id.json
```

### Step 3: Safety Checks for Mainnet

**If switching TO mainnet:**

Display warning:
```
⚠️  SWITCHING TO MAINNET ⚠️
===========================

You are switching to the Solana mainnet.

After this switch:
- All CLI commands will operate on mainnet
- Transactions will use real SOL
- Operations are irreversible
- No airdrop available (only real SOL)

Please verify:
- You have mainnet SOL in your wallet
- You intend to work with real funds
- Environment variables are set for mainnet
```

Use AskUserQuestion to confirm:
- Require explicit confirmation before proceeding

**If switching TO devnet:**
- Show brief confirmation that this is safe
- Proceed without extra warnings

### Step 4: Execute Switch

```bash
# For devnet
solana config set --url devnet

# For mainnet
solana config set --url mainnet-beta
```

If using Alchemy RPC:
```bash
# Devnet with Alchemy
solana config set --url https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}

# Mainnet with Alchemy
solana config set --url https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
```

### Step 5: Verify Switch

After switching, verify:

```bash
solana config get
solana balance
```

Display confirmation:
```
Environment Switch Complete
===========================
Network: mainnet | devnet
RPC URL: <new URL>
Wallet Balance: X.XX SOL

⚠️ Remember: You are now on [MAINNET/devnet]
```

### Step 6: Environment Variable Reminder

Remind user to check application environment variables:

```
Application Environment Variables
=================================

Ensure these match your target network:

For devnet:
  SOLANA_NETWORK=devnet
  SOLANA_RPC_URL=https://solana-devnet.g.alchemy.com/v2/...

For mainnet:
  SOLANA_NETWORK=mainnet
  SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/...

Check your .env file and restart your development server
if you're also switching the application environment.
```

## Example Usage

```
/switch-environment devnet
/switch-environment mainnet
```

## Safety Rules

- Always require confirmation for mainnet switch
- Display clear indicators of current network after switch
- Remind about application environment variables
- Show wallet balance to confirm connectivity
