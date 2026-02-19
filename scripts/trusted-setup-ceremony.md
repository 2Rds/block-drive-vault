# BlockDrive Trusted Setup Ceremony Guide

## Overview

This document describes how to perform a secure trusted setup ceremony for BlockDrive's ZK circuits. The ceremony generates proving keys that allow users to create zero-knowledge proofs without revealing their private data.

## Why a Trusted Setup?

Groth16 proofs require a one-time trusted setup ceremony. During this ceremony, a "toxic waste" secret is generated. If anyone learns this secret, they could create fake proofs. To ensure security:

1. Multiple independent parties contribute randomness
2. Each party destroys their contribution after adding it
3. As long as **one** participant is honest, the system is secure

## Quick Start (Development)

For development and testing, use the single-party build script:

```bash
chmod +x scripts/build-circuits.sh
./scripts/build-circuits.sh
```

This creates working circuits but should NOT be used in production.

## Production Ceremony Steps

### Prerequisites

All participants need:
- Node.js 18+
- snarkjs: `npm install -g snarkjs`
- Secure, air-gapped machine (recommended)

### Phase 1: Powers of Tau (Universal)

BlockDrive uses the Hermez Phase 1 ceremony, which has thousands of contributors. Download the appropriate ptau file:

```bash
# For circuits up to 2^14 constraints
curl -L -o pot14_final.ptau \
  https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
```

Verify the ptau file:
```bash
snarkjs powersoftau verify pot14_final.ptau
```

### Phase 2: Circuit-Specific Ceremony

#### Coordinator Setup

1. **Initialize the ceremony**:
```bash
# Compile circuit
circom src/circuits/criticalBytesCommitment.circom \
  --r1cs --wasm --sym -o build/circuits -l node_modules

# Create initial zkey
snarkjs groth16 setup \
  build/circuits/criticalBytesCommitment.r1cs \
  pot14_final.ptau \
  ceremony/contribution_0000.zkey
```

2. **Distribute `contribution_0000.zkey` to first participant**

#### Participant Contribution

Each participant (in sequence):

1. **Receive the zkey** from coordinator or previous participant

2. **Verify previous contributions**:
```bash
snarkjs zkey verify \
  build/circuits/criticalBytesCommitment.r1cs \
  pot14_final.ptau \
  contribution_XXXX.zkey
```

3. **Add your contribution**:
```bash
snarkjs zkey contribute \
  contribution_XXXX.zkey \
  contribution_YYYY.zkey \
  --name="Your Name/Organization" \
  -v
```

When prompted, type random text (keyboard mashing, random words, etc.)

4. **Destroy your entropy source**:
   - Clear terminal history
   - Securely delete any temporary files
   - If on air-gapped machine, wipe the device

5. **Send `contribution_YYYY.zkey` to next participant or coordinator**

#### Finalization (Coordinator)

After all contributions:

1. **Apply random beacon**:
```bash
# Use a future block hash or other public randomness
snarkjs zkey beacon \
  contribution_final_before_beacon.zkey \
  contribution_final.zkey \
  <random_beacon_hash> \
  10
```

2. **Export verification key**:
```bash
snarkjs zkey export verificationkey \
  contribution_final.zkey \
  verification_key.json
```

3. **Verify final zkey**:
```bash
snarkjs zkey verify \
  build/circuits/criticalBytesCommitment.r1cs \
  pot14_final.ptau \
  contribution_final.zkey
```

4. **Publish ceremony transcript** with all contribution hashes

## Verification

Anyone can verify the ceremony was performed correctly:

```bash
# Verify the final zkey
snarkjs zkey verify \
  build/circuits/criticalBytesCommitment.r1cs \
  pot14_final.ptau \
  public/circuits/criticalBytesCommitment_final.zkey

# Check contribution hashes match published transcript
snarkjs zkey export contributionhashes \
  public/circuits/criticalBytesCommitment_final.zkey
```

## Minimum Recommended Participants

For production BlockDrive deployment:

| Role | Count | Notes |
|------|-------|-------|
| BlockDrive Team | 2 | Core team members |
| Independent Auditors | 2 | Security researchers |
| Community Members | 3+ | Open participation |
| Random Beacon | 1 | Public randomness source |

**Total: 8+ contributors minimum**

## Security Considerations

### DO:
- ✅ Use a fresh, air-gapped machine
- ✅ Generate entropy from hardware RNG if available
- ✅ Type random keystrokes when prompted (don't just press enter)
- ✅ Securely wipe all data after contribution
- ✅ Verify previous contributions before adding yours
- ✅ Publish your contribution hash publicly

### DON'T:
- ❌ Use a VM or cloud machine
- ❌ Keep copies of intermediate zkeys
- ❌ Share your entropy source
- ❌ Skip verification steps
- ❌ Reuse machines for multiple contributions

## Ceremony Artifacts

After a successful ceremony, the following files should be in `public/circuits/`:

| File | Size (approx) | Description |
|------|---------------|-------------|
| `criticalBytesCommitment.wasm` | ~2 MB | Circuit WebAssembly |
| `criticalBytesCommitment_final.zkey` | ~20 MB | Proving key |
| `verification_key.json` | ~3 KB | Verification key |

## Emergency: Compromised Ceremony

If there's evidence the ceremony was compromised:

1. **Stop using affected proofs immediately**
2. **Announce the compromise** on all channels
3. **Conduct a new ceremony** with different participants
4. **Rotate all verification keys** in deployed contracts/applications

## Contact

For ceremony coordination:
- GitHub Issues: [repository issues]
- Discord: [BlockDrive Discord]
- Email: security@blockdrive.co

## References

- [snarkjs README](https://github.com/iden3/snarkjs)
- [Hermez Trusted Setup](https://blog.hermez.io/hermez-cryptographic-setup/)
- [Zcash Ceremony Specification](https://zfnd.org/ceremony/)
- [circom Documentation](https://docs.circom.io/)
