#!/bin/bash
# Verify BlockDrive environment variables are configured
# Usage: ./verify-env.sh [.env file path]

ENV_FILE="${1:-.env}"

echo "=== BlockDrive Environment Verification ==="
echo "Checking: $ENV_FILE"
echo ""

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

# Required variables
REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_PUBLISHABLE_KEY"
    "VITE_CLERK_PUBLISHABLE_KEY"
)

# Optional but recommended
RECOMMENDED_VARS=(
    "ALCHEMY_API_KEY"
    "ALCHEMY_POLICY_ID"
    "SOLANA_NETWORK"
)

MISSING=0
WARNINGS=0

echo "Required Variables:"
for VAR in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${VAR}=" "$ENV_FILE"; then
        VALUE=$(grep "^${VAR}=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
        if [ -n "$VALUE" ] && [ "$VALUE" != "your_key_here" ]; then
            # Mask the value for security
            MASKED="${VALUE:0:10}...${VALUE: -4}"
            echo "  ✅ $VAR: $MASKED"
        else
            echo "  ❌ $VAR: Not set or placeholder"
            MISSING=$((MISSING + 1))
        fi
    else
        echo "  ❌ $VAR: Missing"
        MISSING=$((MISSING + 1))
    fi
done

echo ""
echo "Recommended Variables:"
for VAR in "${RECOMMENDED_VARS[@]}"; do
    if grep -q "^${VAR}=" "$ENV_FILE"; then
        VALUE=$(grep "^${VAR}=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
        if [ -n "$VALUE" ]; then
            MASKED="${VALUE:0:8}..."
            echo "  ✅ $VAR: $MASKED"
        else
            echo "  ⚠️  $VAR: Empty"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "  ⚠️  $VAR: Not configured"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""
echo "=== Summary ==="
if [ $MISSING -eq 0 ]; then
    echo "✅ All required variables configured"
else
    echo "❌ $MISSING required variable(s) missing"
fi

if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  $WARNINGS warning(s)"
fi

echo ""
exit $MISSING
