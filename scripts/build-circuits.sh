#!/bin/bash
# BlockDrive ZK Circuit Build Script
# 
# This script compiles the circom circuits and performs the trusted setup ceremony.
# Run this script from the project root directory.
#
# Prerequisites:
# - Node.js 18+
# - Rust (for circom compiler)
# - circom: npm install -g circom
# - snarkjs: npm install -g snarkjs

set -e

echo "=========================================="
echo "BlockDrive ZK Circuit Build Script"
echo "=========================================="

# Configuration
CIRCUIT_NAME="criticalBytesCommitment"
CIRCUIT_DIR="src/circuits"
OUTPUT_DIR="public/circuits"
PTAU_SIZE=14  # 2^14 constraints max
PTAU_FILE="pot${PTAU_SIZE}_final.ptau"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v circom &> /dev/null; then
    echo -e "${RED}Error: circom is not installed${NC}"
    echo "Install with: cargo install circom"
    exit 1
fi

if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}Error: snarkjs is not installed${NC}"
    echo "Install with: npm install -g snarkjs"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"

# Create output directory
mkdir -p "$OUTPUT_DIR"
mkdir -p "build/circuits"

# Step 1: Install circomlib (if not present)
echo ""
echo "Step 1: Installing circomlib..."
if [ ! -d "node_modules/circomlib" ]; then
    npm install circomlib
fi
echo -e "${GREEN}circomlib installed${NC}"

# Step 2: Compile the circuit
echo ""
echo "Step 2: Compiling circuit: ${CIRCUIT_NAME}..."
circom "$CIRCUIT_DIR/${CIRCUIT_NAME}.circom" \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o "build/circuits" \
    -l node_modules

echo -e "${GREEN}Circuit compiled successfully${NC}"
echo "  R1CS: build/circuits/${CIRCUIT_NAME}.r1cs"
echo "  WASM: build/circuits/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
echo "  Symbols: build/circuits/${CIRCUIT_NAME}.sym"

# Step 3: Powers of Tau ceremony
echo ""
echo "Step 3: Powers of Tau ceremony..."

PTAU_DIR="build/ptau"
mkdir -p "$PTAU_DIR"

if [ ! -f "$PTAU_DIR/${PTAU_FILE}" ]; then
    echo "Downloading powers of tau file from Hermez..."
    # Use pre-generated ptau from Hermez ceremony for security
    curl -L -o "$PTAU_DIR/${PTAU_FILE}" \
        "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${PTAU_SIZE}.ptau"
    echo -e "${GREEN}Powers of Tau downloaded${NC}"
else
    echo "Using existing powers of tau file"
fi

# Step 4: Generate proving key (zkey)
echo ""
echo "Step 4: Generating proving key (Phase 2 setup)..."

# Initial zkey
snarkjs groth16 setup \
    "build/circuits/${CIRCUIT_NAME}.r1cs" \
    "$PTAU_DIR/${PTAU_FILE}" \
    "build/circuits/${CIRCUIT_NAME}_0000.zkey"

echo "Adding contribution to zkey..."
# Add our contribution (in production, multiple parties should contribute)
echo "blockdrive-contribution-$(date +%s)" | snarkjs zkey contribute \
    "build/circuits/${CIRCUIT_NAME}_0000.zkey" \
    "build/circuits/${CIRCUIT_NAME}_0001.zkey" \
    --name="BlockDrive Contribution" \
    -v

# Add beacon for additional randomness
echo "Adding random beacon..."
snarkjs zkey beacon \
    "build/circuits/${CIRCUIT_NAME}_0001.zkey" \
    "build/circuits/${CIRCUIT_NAME}_final.zkey" \
    "$(head -c 32 /dev/urandom | xxd -p)" \
    10

echo -e "${GREEN}Proving key generated${NC}"

# Step 5: Export verification key
echo ""
echo "Step 5: Exporting verification key..."
snarkjs zkey export verificationkey \
    "build/circuits/${CIRCUIT_NAME}_final.zkey" \
    "build/circuits/verification_key.json"

echo -e "${GREEN}Verification key exported${NC}"

# Step 6: Verify the zkey
echo ""
echo "Step 6: Verifying zkey..."
snarkjs zkey verify \
    "build/circuits/${CIRCUIT_NAME}.r1cs" \
    "$PTAU_DIR/${PTAU_FILE}" \
    "build/circuits/${CIRCUIT_NAME}_final.zkey"

echo -e "${GREEN}Zkey verified successfully${NC}"

# Step 7: Copy artifacts to public directory
echo ""
echo "Step 7: Copying artifacts to public directory..."
cp "build/circuits/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "$OUTPUT_DIR/"
cp "build/circuits/${CIRCUIT_NAME}_final.zkey" "$OUTPUT_DIR/"
cp "build/circuits/verification_key.json" "$OUTPUT_DIR/"

echo -e "${GREEN}Artifacts copied to ${OUTPUT_DIR}${NC}"

# Step 8: Generate Solidity verifier (optional, for on-chain verification)
echo ""
echo "Step 8: Generating Solidity verifier..."
snarkjs zkey export solidityverifier \
    "build/circuits/${CIRCUIT_NAME}_final.zkey" \
    "build/circuits/Verifier.sol"

echo -e "${GREEN}Solidity verifier generated${NC}"

# Print summary
echo ""
echo "=========================================="
echo -e "${GREEN}Build Complete!${NC}"
echo "=========================================="
echo ""
echo "Production artifacts:"
echo "  - ${OUTPUT_DIR}/${CIRCUIT_NAME}.wasm"
echo "  - ${OUTPUT_DIR}/${CIRCUIT_NAME}_final.zkey"
echo "  - ${OUTPUT_DIR}/verification_key.json"
echo ""
echo "Solidity verifier (for on-chain verification):"
echo "  - build/circuits/Verifier.sol"
echo ""
echo "Circuit info:"
snarkjs r1cs info "build/circuits/${CIRCUIT_NAME}.r1cs"
echo ""
echo -e "${YELLOW}IMPORTANT: For production, run the multi-party ceremony!${NC}"
echo "See: scripts/trusted-setup-ceremony.md"
