# BlockDrive ZK Circuits

This directory contains the Circom circuit definitions for BlockDrive's Zero-Knowledge proof system.

## Circuit: CriticalBytesCommitment

Proves knowledge of 16 critical bytes that hash to a public commitment without revealing the bytes.

### Public Inputs
- `commitment[256]` - SHA-256 hash of critical bytes (256 bits)

### Private Inputs  
- `criticalBytes[128]` - The 16 critical bytes (128 bits)

### Circuit Logic
1. Computes SHA-256 of the private critical bytes
2. Constrains the result to equal the public commitment
3. Generates a Groth16 proof that can be verified by anyone

## Compilation (Development)

```bash
# Install circom
npm install -g circom snarkjs

# Compile circuit
circom criticalBytesCommitment.circom --r1cs --wasm --sym

# Powers of Tau ceremony (use existing ptau for production)
snarkjs powersoftau new bn128 14 pot14_0000.ptau
snarkjs powersoftau contribute pot14_0000.ptau pot14_final.ptau

# Generate zkey
snarkjs groth16 setup criticalBytesCommitment.r1cs pot14_final.ptau criticalBytesCommitment_0000.zkey
snarkjs zkey contribute criticalBytesCommitment_0000.zkey criticalBytesCommitment_final.zkey

# Export verification key
snarkjs zkey export verificationkey criticalBytesCommitment_final.zkey verification_key.json
```

## Production Artifacts

Pre-compiled artifacts are hosted at:
- `public/circuits/criticalBytesCommitment.wasm`
- `public/circuits/criticalBytesCommitment_final.zkey`
- `public/circuits/verification_key.json`

These are loaded dynamically by the snarkjsService.
