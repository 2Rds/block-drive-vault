#!/bin/bash
# Safe Anchor program deployment with confirmation
# Usage: ./safe-deploy.sh <program_name> [devnet|mainnet]

PROGRAM_NAME="${1:-}"
NETWORK="${2:-devnet}"

if [ -z "$PROGRAM_NAME" ]; then
    echo "Usage: ./safe-deploy.sh <program_name> [devnet|mainnet]"
    exit 1
fi

echo "=== BlockDrive Safe Deploy ==="
echo ""
echo "Program: $PROGRAM_NAME"
echo "Target Network: $NETWORK"
echo ""

# Check if Anchor.toml exists
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Anchor.toml not found"
    echo "   Make sure you're in the project root directory"
    exit 1
fi

# Check if program exists
if [ ! -d "programs/$PROGRAM_NAME" ]; then
    echo "❌ Error: Program not found at programs/$PROGRAM_NAME"
    exit 1
fi

# Get current network from Solana config
CURRENT_NETWORK=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "Current RPC: $CURRENT_NETWORK"
echo ""

# Check wallet balance
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
echo "Wallet Balance: $BALANCE SOL"
echo ""

# Mainnet safety check
if [ "$NETWORK" = "mainnet" ]; then
    echo "⚠️  =========================================="
    echo "⚠️  MAINNET DEPLOYMENT WARNING"
    echo "⚠️  =========================================="
    echo "⚠️  "
    echo "⚠️  This will deploy to MAINNET using real SOL."
    echo "⚠️  This operation is effectively IRREVERSIBLE."
    echo "⚠️  "
    echo "⚠️  Current Balance: $BALANCE SOL"
    echo "⚠️  Estimated Cost: 0.5-2 SOL"
    echo "⚠️  "
    echo "⚠️  =========================================="
    echo ""
    read -p "Type 'DEPLOY MAINNET' to confirm: " CONFIRM

    if [ "$CONFIRM" != "DEPLOY MAINNET" ]; then
        echo ""
        echo "❌ Deployment cancelled"
        exit 1
    fi

    CLUSTER="mainnet"
else
    echo "ℹ️  Deploying to devnet (safe for testing)"
    CLUSTER="devnet"
fi

echo ""
echo "Building program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

echo "Deploying to $CLUSTER..."
anchor deploy --provider.cluster $CLUSTER

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""

# Get program ID
PROGRAM_ID=$(solana-keygen pubkey target/deploy/${PROGRAM_NAME}-keypair.json 2>/dev/null)
if [ -n "$PROGRAM_ID" ]; then
    echo "Program ID: $PROGRAM_ID"

    if [ "$CLUSTER" = "devnet" ]; then
        echo "Explorer: https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet"
    else
        echo "Explorer: https://explorer.solana.com/address/${PROGRAM_ID}"
    fi
fi

echo ""
echo "=== Deployment Complete ==="
