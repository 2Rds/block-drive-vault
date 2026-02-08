#!/bin/bash
# Check current Solana network configuration
# Usage: ./check-network.sh

echo "=== Solana Network Configuration ==="
echo ""

# Get current config
CONFIG=$(solana config get 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "ERROR: Solana CLI not installed or not in PATH"
    exit 1
fi

# Extract RPC URL
RPC_URL=$(echo "$CONFIG" | grep "RPC URL" | awk '{print $3}')

# Determine network
if echo "$RPC_URL" | grep -q "mainnet"; then
    NETWORK="MAINNET"
    echo "⚠️  WARNING: You are on MAINNET"
    echo "⚠️  All operations will use real SOL"
elif echo "$RPC_URL" | grep -q "devnet"; then
    NETWORK="devnet"
    echo "✅ You are on devnet (safe for testing)"
else
    NETWORK="unknown"
    echo "⚠️  Unknown network configuration"
fi

echo ""
echo "Network: $NETWORK"
echo "RPC URL: $RPC_URL"
echo ""

# Get wallet info
WALLET=$(echo "$CONFIG" | grep "Keypair Path" | awk '{print $3}')
echo "Wallet: $WALLET"

# Get balance
BALANCE=$(solana balance 2>/dev/null)
echo "Balance: $BALANCE"

echo ""
echo "==================================="
