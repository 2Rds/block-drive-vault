#!/bin/bash
# Check if wrangler CLI is installed and provide setup guidance

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "⚠️  Wrangler CLI not found"
    echo ""
    echo "Wrangler is the Cloudflare Workers CLI tool."
    echo "Install it with: npm install -g wrangler"
    echo ""
    echo "After installation, login with: wrangler login"
    exit 0
fi

# Check wrangler version
WRANGLER_VERSION=$(wrangler --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "✅ Wrangler v$WRANGLER_VERSION installed"

# Check if logged in (wrangler whoami doesn't fail if not logged in, it just shows no account)
if wrangler whoami &> /dev/null; then
    ACCOUNT=$(wrangler whoami 2>&1 | grep "Account Name" | cut -d: -f2 | xargs)
    if [ -n "$ACCOUNT" ]; then
        echo "✅ Logged in as: $ACCOUNT"
    else
        echo "⚠️  Not logged in to Cloudflare"
        echo "Login with: wrangler login"
    fi
else
    echo "⚠️  Not logged in to Cloudflare"
    echo "Login with: wrangler login"
fi

echo ""
echo "Cloudflare Toolkit ready! Use /cloudflare:help for available commands."
