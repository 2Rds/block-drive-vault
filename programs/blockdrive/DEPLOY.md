# BlockDrive Solana Program Deployment Guide

## Prerequisites

### 1. Install Solana CLI

```bash
# macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Windows (using WSL recommended)
# Or download from: https://github.com/solana-labs/solana/releases

# Verify installation
solana --version
```

### 2. Install Anchor CLI

```bash
# Install Anchor Version Manager (AVM)
cargo install --git https://github.com/coral-xyz/anchor avm --locked

# Install Anchor 0.30.1 (matches project config)
avm install 0.30.1
avm use 0.30.1

# Verify installation
anchor --version
```

### 3. Configure Solana for Devnet

```bash
# Set cluster to Devnet
solana config set --url https://api.devnet.solana.com

# Generate a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop SOL for deployments
solana airdrop 5

# Verify balance
solana balance
```

## Deployment Steps

### Step 1: Generate Program Keypair

```bash
cd programs/blockdrive

# Generate a new keypair for the program
solana-keygen new --outfile target/deploy/blockdrive-keypair.json

# Get the program ID
solana address -k target/deploy/blockdrive-keypair.json
# Save this address! Example: BLKDrv7xYz123abc...
```

### Step 2: Update Anchor.toml

Replace the placeholder program ID in `Anchor.toml`:

```toml
[programs.devnet]
blockdrive = "YOUR_NEW_PROGRAM_ID_HERE"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"
```

### Step 3: Build the Program

```bash
cd programs/blockdrive
anchor build
```

### Step 4: Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

### Step 5: Verify Deployment

```bash
# Check program exists on-chain
solana program show YOUR_PROGRAM_ID --url devnet
```

## NFT Collection Creation

After deploying the main program, create the NFT collection:

### Step 1: Create Collection Keypair

```bash
solana-keygen new --outfile target/deploy/nft-collection-keypair.json
solana address -k target/deploy/nft-collection-keypair.json
# Save this as NFT_COLLECTION_ADDRESS
```

### Step 2: Update Environment Variables

Add to your `.env` file:

```env
VITE_NFT_COLLECTION_ADDRESS=YOUR_COLLECTION_ADDRESS
VITE_BLOCKDRIVE_PROGRAM_ID=YOUR_PROGRAM_ID
```

### Step 3: Create Collection Transaction

The collection creation is handled by the `nftMembershipService.ts` - it will create the collection on first use with the configured address.

## Configuration Updates Required

After deployment, update these files:

### 1. `src/config/nftCollection.ts`

The `NFT_COLLECTION_ADDRESS` will be read from `VITE_NFT_COLLECTION_ADDRESS` env var.

### 2. `.env`

```env
# Solana Program Configuration (Devnet)
VITE_SOLANA_NETWORK=devnet
VITE_BLOCKDRIVE_PROGRAM_ID=YOUR_DEPLOYED_PROGRAM_ID
VITE_NFT_COLLECTION_ADDRESS=YOUR_NFT_COLLECTION_ADDRESS
```

### 3. `programs/blockdrive/Anchor.toml`

```toml
[programs.devnet]
blockdrive = "YOUR_DEPLOYED_PROGRAM_ID"
```

## Testing the Deployment

### 1. Run Program Tests

```bash
cd programs/blockdrive
anchor test
```

### 2. Test NFT Minting

Use the test script or frontend to mint a test NFT and verify:
- NFT appears in wallet
- Metadata is correct
- Transfer Hook prevents transfers

### 3. Test SNS Subdomain

Verify SNS integration by:
- Checking subdomain availability
- Minting a test subdomain
- Verifying NFT-gating works

## Mainnet Deployment (Future)

When ready for mainnet:

1. Generate new keypairs for mainnet
2. Update `Anchor.toml` with mainnet program IDs
3. Fund deployment wallet with real SOL
4. Deploy with `--provider.cluster mainnet`
5. Update all environment variables for mainnet

## Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 5  # Request more devnet SOL
```

### "Program deployment failed"
```bash
# Check program size
anchor build
ls -la target/deploy/blockdrive.so

# If too large, optimize or split
```

### "Account not found"
Ensure you're on the correct cluster:
```bash
solana config get
```

## Useful Commands

```bash
# Check deployment status
solana program show PROGRAM_ID --url devnet

# View program logs
solana logs PROGRAM_ID --url devnet

# Close/recover rent from old programs
solana program close PROGRAM_ID --url devnet

# Check wallet balance
solana balance --url devnet
```
