---
name: deploy-program
description: Deploy a Solana/Anchor program with safety checks. Includes network verification, build validation, and mainnet confirmation prompts.
argument-hint: "<program_name> [--network devnet|mainnet]"
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# Deploy Program Command

Deploy a Solana program (typically built with Anchor) with comprehensive safety checks.

## Instructions

When this command is invoked:

### Step 1: Parse Arguments

- Extract program name from arguments
- Determine target network (default to current Solana config)
- If `--network mainnet` specified, enable extra safety checks

### Step 2: Pre-Deployment Checks

Verify before any deployment:

1. **Check Anchor.toml exists** in project root
2. **Verify program exists** in `programs/<program_name>/`
3. **Check current network**:
   ```bash
   solana config get
   ```
4. **Verify wallet balance** sufficient for deployment:
   ```bash
   solana balance
   ```

### Step 3: Build Program

```bash
anchor build
```

Verify build succeeds before proceeding.

### Step 4: Network Safety Check

**If deploying to mainnet:**

Display prominent warning:
```
⚠️  MAINNET DEPLOYMENT WARNING ⚠️
================================

You are about to deploy to MAINNET.
This operation:
- Uses real SOL for deployment costs
- Is effectively irreversible
- Will make the program live for all users

Current wallet: <address>
Wallet balance: X.XX SOL
Estimated cost: ~0.5-2 SOL (depending on program size)

Network: mainnet-beta
Program: <program_name>
```

Use AskUserQuestion to get explicit confirmation:
- "Type DEPLOY to confirm mainnet deployment"
- Require exact match before proceeding

**If deploying to devnet:**
- Show brief confirmation
- Proceed with deployment

### Step 5: Deploy

For devnet:
```bash
anchor deploy --provider.cluster devnet
```

For mainnet:
```bash
anchor deploy --provider.cluster mainnet
```

### Step 6: Post-Deployment

After successful deployment:

1. Display program ID
2. Show explorer link:
   - Devnet: `https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet`
   - Mainnet: `https://explorer.solana.com/address/<PROGRAM_ID>`
3. Remind to update Anchor.toml with program ID if new deployment
4. Suggest verifying the program

## Example Output

```
BlockDrive Program Deployment
=============================

Program: blockdrive
Network: devnet
Wallet: 7xKX...AsU
Balance: 5.234 SOL

Building program...
✅ Build successful

Deploying to devnet...
✅ Deployment successful!

Program ID: BDrv...xyz
Explorer: https://explorer.solana.com/address/BDrv...xyz?cluster=devnet

Next steps:
1. Update programs.devnet in Anchor.toml with program ID
2. Run tests: anchor test --skip-local-validator
```

## Safety Rules

- NEVER deploy to mainnet without explicit user confirmation
- ALWAYS show wallet balance before deployment
- ALWAYS display the target network prominently
- Block deployment if wallet balance appears insufficient
