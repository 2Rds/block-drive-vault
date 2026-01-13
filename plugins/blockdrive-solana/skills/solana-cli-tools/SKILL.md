---
name: Solana CLI Tools
description: This skill should be used when the user asks about "Solana CLI", "spl-token", "solana-keygen", "anchor build", "anchor deploy", "Metaplex CLI", "sugar", "token minting", "program deployment", "keypair generation", "airdrop SOL", or needs to execute Solana command-line operations for development, testing, or deployment.
version: 0.1.0
---

# Solana CLI Tools

## Overview

The Solana ecosystem provides powerful CLI tools for blockchain development. This skill covers the essential tools: Solana CLI, SPL Token CLI, Anchor framework, and Metaplex tools.

## When to Use

Activate this skill when:
- Generating keypairs or managing wallets
- Deploying Solana programs
- Creating or managing SPL tokens
- Building and testing Anchor programs
- Minting NFTs with Metaplex
- Interacting with devnet/mainnet

## Solana CLI

### Installation

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installation
solana --version
```

### Configuration

```bash
# Set network to devnet
solana config set --url devnet

# Set network to mainnet
solana config set --url mainnet-beta

# Use custom RPC (Alchemy)
solana config set --url https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY

# View current config
solana config get
```

### Keypair Management

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json

# Generate with specific derivation path
solana-keygen new --derivation-path m/44'/501'/0'/0'

# Get public key from keypair
solana-keygen pubkey ~/.config/solana/devnet-wallet.json

# Verify keypair
solana-keygen verify <PUBKEY> ~/.config/solana/devnet-wallet.json

# Set default keypair
solana config set --keypair ~/.config/solana/devnet-wallet.json
```

### Account Operations

```bash
# Check balance
solana balance

# Check specific address balance
solana balance <ADDRESS>

# Airdrop SOL (devnet only)
solana airdrop 2

# Airdrop to specific address
solana airdrop 2 <ADDRESS>

# Transfer SOL
solana transfer <RECIPIENT> 1 --allow-unfunded-recipient

# Get account info
solana account <ADDRESS>
```

### Program Operations

```bash
# Deploy program
solana program deploy target/deploy/my_program.so

# Show program info
solana program show <PROGRAM_ID>

# Close program (recover rent)
solana program close <PROGRAM_ID>

# Upgrade program
solana program deploy target/deploy/my_program.so --program-id <PROGRAM_ID>
```

## SPL Token CLI

### Installation

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Verify
spl-token --version
```

### Token Operations

```bash
# Create new token mint
spl-token create-token

# Create token with specific decimals
spl-token create-token --decimals 6

# Create token account for wallet
spl-token create-account <TOKEN_MINT>

# Mint tokens
spl-token mint <TOKEN_MINT> 1000

# Transfer tokens
spl-token transfer <TOKEN_MINT> 100 <RECIPIENT>

# Check token balance
spl-token balance <TOKEN_MINT>

# List all token accounts
spl-token accounts

# Burn tokens
spl-token burn <TOKEN_ACCOUNT> 50

# Close empty token account
spl-token close <TOKEN_ACCOUNT>
```

### Token-2022 (Token Extensions)

```bash
# Create token with extensions
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-metadata

# Create token with transfer fees
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --transfer-fee 100 10000

# Create non-transferable token (soulbound)
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-non-transferable
```

## Anchor Framework

### Installation

```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Verify
anchor --version
```

### Project Setup

```bash
# Create new Anchor project
anchor init my_project
cd my_project

# Project structure
# my_project/
# ├── Anchor.toml       # Configuration
# ├── programs/         # Solana programs
# │   └── my_project/
# │       └── src/
# │           └── lib.rs
# ├── tests/            # TypeScript tests
# └── migrations/       # Deployment scripts
```

### Development Workflow

```bash
# Build program
anchor build

# Run tests
anchor test

# Run tests without rebuilding
anchor test --skip-build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Generate IDL
anchor idl parse -f programs/my_project/src/lib.rs -o target/idl/my_project.json

# Upgrade deployed program
anchor upgrade target/deploy/my_project.so --program-id <PROGRAM_ID>
```

### Anchor.toml Configuration

```toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
my_project = "YourProgramId..."

[programs.mainnet]
my_project = "YourProgramId..."

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/devnet-wallet.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## Metaplex Tools

### Sugar CLI (NFT Deployment)

```bash
# Install Sugar
bash <(curl -sSf https://sugar.metaplex.com/install.sh)

# Verify
sugar --version
```

### NFT Collection Deployment

```bash
# Prepare assets directory
# assets/
# ├── 0.json
# ├── 0.png
# ├── 1.json
# ├── 1.png
# └── collection.json

# Create candy machine config
sugar create-config

# Validate assets
sugar validate

# Upload assets
sugar upload

# Deploy candy machine
sugar deploy

# Verify deployment
sugar verify

# Mint NFT
sugar mint

# Mint multiple
sugar mint --number 5
```

### Sugar Config Example

```json
{
  "tokenStandard": "nft",
  "number": 100,
  "symbol": "BDNFT",
  "sellerFeeBasisPoints": 500,
  "isMutable": true,
  "isSequential": false,
  "creators": [
    {
      "address": "YourWalletAddress...",
      "share": 100
    }
  ],
  "uploadMethod": "bundlr",
  "awsConfig": null,
  "nftStorageAuthToken": null,
  "shdwStorageAccount": null,
  "pinataConfig": null,
  "hiddenSettings": null,
  "guards": {
    "default": {
      "solPayment": {
        "value": 0.1,
        "destination": "YourWalletAddress..."
      }
    }
  }
}
```

## BlockDrive Development Workflow

### Devnet Setup

```bash
# Configure for devnet with Alchemy RPC
solana config set --url https://solana-devnet.g.alchemy.com/v2/$ALCHEMY_API_KEY
solana config set --keypair ~/.config/solana/blockdrive-devnet.json

# Get devnet SOL
solana airdrop 5

# Verify
solana balance
```

### Deploy BlockDrive Program

```bash
cd programs/blockdrive

# Build
anchor build

# Get program keypair address
solana-keygen pubkey target/deploy/blockdrive-keypair.json

# Update Anchor.toml with program ID
# Then deploy
anchor deploy --provider.cluster devnet
```

### Create BlockDrive Token

```bash
# Create membership token (Token-2022 with metadata)
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --enable-metadata \
  --decimals 0

# Initialize metadata
spl-token initialize-metadata <MINT> "BlockDrive Membership" "BDM" "https://blockdrive.io/token-metadata.json"
```

## Common Commands Quick Reference

| Task | Command |
|------|---------|
| Check balance | `solana balance` |
| Airdrop SOL | `solana airdrop 2` |
| Deploy program | `anchor deploy` |
| Build program | `anchor build` |
| Run tests | `anchor test` |
| Create token | `spl-token create-token` |
| Mint tokens | `spl-token mint <MINT> <AMOUNT>` |
| Transfer tokens | `spl-token transfer <MINT> <AMOUNT> <RECIPIENT>` |
| Switch to devnet | `solana config set --url devnet` |
| Switch to mainnet | `solana config set --url mainnet-beta` |

## Additional Resources

### Reference Files

- **`references/anchor-patterns.md`** - Common Anchor patterns
- **`references/token-extensions.md`** - Token-2022 extensions guide
- **`references/metaplex-standards.md`** - NFT standards and metadata

### Examples

- **`examples/deploy-program.sh`** - Program deployment script
- **`examples/create-nft-collection.sh`** - NFT collection setup
