# BlockDrive ZK Circuit Artifacts

This directory contains the compiled circuit artifacts for ZK proof generation.

## Required Files (Production)

1. `criticalBytesCommitment.wasm` - Compiled circuit WebAssembly
2. `criticalBytesCommitment_final.zkey` - Proving key from trusted setup
3. `verification_key.json` - Verification key for proof verification

## Current Status

**Development Mode**: Only `verification_key.json` placeholder is included.

The system will automatically fall back to simulated proofs when WASM/zkey files are not available.

## Generating Production Artifacts

Follow the instructions in `src/circuits/README.md` to:

1. Compile the circom circuit
2. Perform the trusted setup ceremony
3. Generate the final zkey
4. Export the verification key

## Security Note

The trusted setup ceremony must be performed securely with multiple contributors to ensure the "toxic waste" is properly destroyed. Consider using:

- Hermez Phase 2 ceremony tools
- snarkjs multi-party ceremony
- Community-verified ptau files

For production deployments, the ceremony should include contributions from multiple independent parties.
