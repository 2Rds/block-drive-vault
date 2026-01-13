#!/bin/bash
# Check wallet balance and token holdings
# Usage: ./wallet-balance.sh [wallet_address]

WALLET="${1:-}"

echo "=== Solana Wallet Balance ==="
echo ""

# Get network info
RPC_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')
if echo "$RPC_URL" | grep -q "mainnet"; then
    NETWORK="MAINNET"
    echo "⚠️  Network: MAINNET (real funds)"
else
    NETWORK="devnet"
    echo "✅ Network: devnet"
fi
echo ""

# Determine wallet to check
if [ -z "$WALLET" ]; then
    WALLET=$(solana-keygen pubkey 2>/dev/null)
    if [ -z "$WALLET" ]; then
        echo "❌ No wallet specified and no default wallet found"
        exit 1
    fi
    echo "Using default wallet"
fi

echo "Wallet: $WALLET"
echo ""

# Get SOL balance
echo "SOL Balance:"
solana balance "$WALLET"
echo ""

# Get token accounts
echo "Token Holdings:"
spl-token accounts --owner "$WALLET" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "  No token accounts found"
fi

echo ""
echo "==========================="
