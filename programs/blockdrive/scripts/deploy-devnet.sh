#!/bin/bash
# BlockDrive Solana Program Deployment Script for Devnet
#
# Prerequisites:
#   - Solana CLI installed (solana --version)
#   - Anchor CLI installed (anchor --version)
#   - Funded wallet at ~/.config/solana/id.json
#
# Usage: ./scripts/deploy-devnet.sh

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PROJECT_DIR")")"

echo "================================================"
echo "BlockDrive Solana Program Deployment (Devnet)"
echo "================================================"

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not installed"
    echo "   Install: sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.0/install)\""
    exit 1
fi
echo "✅ Solana CLI: $(solana --version)"

if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI not installed"
    echo "   Install: cargo install --git https://github.com/coral-xyz/anchor avm --locked"
    exit 1
fi
echo "✅ Anchor CLI: $(anchor --version)"

# Configure for Devnet
echo ""
echo "Configuring for Devnet..."
solana config set --url https://api.devnet.solana.com

# Check wallet balance
BALANCE=$(solana balance | awk '{print $1}')
echo "Current wallet balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "⚠️  Low balance. Requesting airdrop..."
    solana airdrop 2
    sleep 5
    BALANCE=$(solana balance | awk '{print $1}')
    echo "New balance: $BALANCE SOL"
fi

# Navigate to project directory
cd "$PROJECT_DIR"

# Generate program keypair if not exists
KEYPAIR_PATH="target/deploy/blockdrive-keypair.json"
if [ ! -f "$KEYPAIR_PATH" ]; then
    echo ""
    echo "Generating new program keypair..."
    mkdir -p target/deploy
    solana-keygen new --outfile "$KEYPAIR_PATH" --no-bip39-passphrase
fi

PROGRAM_ID=$(solana address -k "$KEYPAIR_PATH")
echo "Program ID: $PROGRAM_ID"

# Update Anchor.toml with program ID
echo ""
echo "Updating Anchor.toml..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/blockdrive = \".*\"/blockdrive = \"$PROGRAM_ID\"/" Anchor.toml
else
    # Linux
    sed -i "s/blockdrive = \".*\"/blockdrive = \"$PROGRAM_ID\"/" Anchor.toml
fi

# Build the program
echo ""
echo "Building program..."
anchor build

# Deploy to Devnet
echo ""
echo "Deploying to Devnet..."
anchor deploy --provider.cluster devnet

# Verify deployment
echo ""
echo "Verifying deployment..."
solana program show "$PROGRAM_ID" --url devnet

# Generate NFT collection keypair
NFT_KEYPAIR_PATH="target/deploy/nft-collection-keypair.json"
if [ ! -f "$NFT_KEYPAIR_PATH" ]; then
    echo ""
    echo "Generating NFT collection keypair..."
    solana-keygen new --outfile "$NFT_KEYPAIR_PATH" --no-bip39-passphrase
fi

NFT_COLLECTION_ADDRESS=$(solana address -k "$NFT_KEYPAIR_PATH")
echo "NFT Collection Address: $NFT_COLLECTION_ADDRESS"

# Create/update .env file
ENV_FILE="$ROOT_DIR/.env"
echo ""
echo "Updating environment variables..."

# Function to update or add env var
update_env() {
    local key=$1
    local value=$2
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        fi
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

update_env "VITE_BLOCKDRIVE_PROGRAM_ID" "$PROGRAM_ID"
update_env "VITE_NFT_COLLECTION_ADDRESS" "$NFT_COLLECTION_ADDRESS"
update_env "VITE_SOLANA_NETWORK" "devnet"

echo ""
echo "================================================"
echo "✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Program ID:             $PROGRAM_ID"
echo "NFT Collection Address: $NFT_COLLECTION_ADDRESS"
echo "Network:                Devnet"
echo ""
echo "Environment variables updated in: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Restart your development server"
echo "  2. Test NFT minting functionality"
echo "  3. Test SNS subdomain integration"
echo "  4. Run end-to-end onboarding flow"
echo ""
