#!/bin/bash
# Airdrop SOL on devnet (safety check prevents mainnet)
# Usage: ./airdrop-devnet.sh [amount] [wallet_address]

AMOUNT="${1:-2}"
WALLET="${2:-}"

echo "=== Devnet SOL Airdrop ==="
echo ""

# Safety check: Verify we're on devnet
RPC_URL=$(solana config get | grep "RPC URL" | awk '{print $3}')

if echo "$RPC_URL" | grep -q "mainnet"; then
    echo "❌ ERROR: You are on MAINNET"
    echo "   Airdrop is only available on devnet"
    echo ""
    echo "   To switch to devnet, run:"
    echo "   solana config set --url devnet"
    exit 1
fi

if ! echo "$RPC_URL" | grep -q "devnet"; then
    echo "⚠️  Warning: Unknown network"
    echo "   RPC URL: $RPC_URL"
    echo ""
    read -p "Continue anyway? (y/N): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        exit 1
    fi
fi

echo "✅ Network: devnet"
echo "Amount: $AMOUNT SOL"
echo ""

# Execute airdrop
if [ -z "$WALLET" ]; then
    echo "Airdropping to default wallet..."
    solana airdrop "$AMOUNT"
else
    echo "Airdropping to: $WALLET"
    solana airdrop "$AMOUNT" "$WALLET"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Airdrop successful!"
    echo ""
    echo "New balance:"
    if [ -z "$WALLET" ]; then
        solana balance
    else
        solana balance "$WALLET"
    fi
else
    echo ""
    echo "❌ Airdrop failed"
    echo ""
    echo "Common issues:"
    echo "- Rate limited (wait a few seconds and try again)"
    echo "- Network congestion"
    echo "- Invalid wallet address"
fi
