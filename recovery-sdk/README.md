# BlockDrive Recovery SDK (Python)

Open-source tool for recovering files encrypted with BlockDrive, without needing the BlockDrive application.

## Overview

BlockDrive uses a "Programmed Incompleteness" architecture where:
1. Files are encrypted with AES-256-GCM using wallet-derived keys
2. The first 16 bytes ("critical bytes") are extracted and stored separately
3. A commitment (SHA-256 hash of critical bytes) is registered on-chain
4. Files cannot be decrypted without reuniting all components

This SDK allows users to recover their files independently using:
- Their wallet (to sign messages and derive keys)
- The encrypted content (from IPFS/Filebase)
- The ZK proof containing critical bytes (from Cloudflare R2)

## Installation

```bash
# Basic installation
pip install blockdrive-recovery

# With Solana on-chain verification support
pip install blockdrive-recovery[solana]

# Full installation (all optional features)
pip install blockdrive-recovery[full]
```

Or install from source:

```bash
git clone https://github.com/blockdrive/recovery-sdk
cd recovery-sdk
pip install -e .

# With Solana support
pip install -e ".[solana]"
```

## Requirements

- Python 3.9+
- A Solana wallet (Phantom, Solflare, etc.) OR private key
- File metadata (content CID, proof CID, security level)

## Quick Start

```python
from blockdrive_recovery import BlockDriveRecovery, SecurityLevel

# Initialize recovery SDK
recovery = BlockDriveRecovery()

# Derive key from wallet signature
# The message to sign depends on security level (see table below)
signature = get_signature_from_wallet()  # Your wallet integration
recovery.derive_key_from_signature(signature, SecurityLevel.STANDARD)

# Recover a file
result = recovery.recover_file(
    content_cid="bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    proof_cid="proof_abc123",
    security_level=SecurityLevel.STANDARD
)

# Check result and save
if result.success:
    with open("recovered_file.pdf", "wb") as f:
        f.write(result.data)
    print(f"Recovered {result.file_size} bytes")
    print(f"Commitment valid: {result.commitment_valid}")
else:
    print(f"Recovery failed: {result.error}")
```

### With On-Chain Verification (Optional)

```python
from blockdrive_recovery import BlockDriveRecovery, SecurityLevel, is_solana_available

recovery = BlockDriveRecovery()
recovery.derive_key_from_signature(signature, SecurityLevel.STANDARD)

# Verify on Solana before decryption
if is_solana_available():
    result = recovery.recover_with_verification(
        content_cid="bafybeig...",
        proof_cid="proof_abc123",
        security_level=SecurityLevel.STANDARD,
        vault_owner="YourWalletPublicKey",
        file_id="file-uuid-here",
        network="devnet"  # or "mainnet"
    )
else:
    # Fall back to offline verification
    result = recovery.recover_file(...)
```

## Security Levels

BlockDrive uses 3 security levels, each requiring a different wallet signature:

| Level | Name | Message to Sign |
|-------|------|-----------------|
| 1 | Standard | "BlockDrive Security Level One - Standard Protection" |
| 2 | Sensitive | "BlockDrive Security Level Two - Sensitive Data Protection" |
| 3 | Maximum | "BlockDrive Security Level Three - Maximum Security" |

## Storage Infrastructure

BlockDrive uses **Filebase** (https://filebase.com) as the primary enterprise-grade IPFS infrastructure provider:

- **Encrypted Content**: Stored on IPFS via Filebase's S3-compatible API
- **Critical Bytes + ZK Proofs**: Stored on Cloudflare R2 (edge storage)
- **Commitments**: Stored on Solana blockchain (verification)

### Filebase Enterprise Features

Filebase provides enterprise-grade IPFS with:
- Automatic pinning and persistence (no content expiration)
- 3x geographic redundancy
- 99.9% SLA uptime
- S3-compatible API
- Dedicated gateways for enterprise users
- No egress fees for IPFS retrieval

### Using Dedicated Filebase Gateway (Enterprise)

```python
from blockdrive_recovery import BlockDriveRecovery, FilebaseClient

# Option 1: Simple dedicated gateway
recovery = BlockDriveRecovery(
    filebase_gateway="https://your-gateway.filebase.io"
)

# Option 2: Full Filebase client with S3 API access
filebase = FilebaseClient(
    dedicated_gateway="https://your-gateway.filebase.io",
    access_key="your-access-key",      # Optional: for S3 API
    secret_key="your-secret-key",      # Optional: for S3 API
    bucket="your-bucket"               # Optional: for S3 API
)
recovery = BlockDriveRecovery(filebase_client=filebase)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Wallet                            │
│  Signs messages to derive AES-256 encryption keys           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Key Derivation (HKDF)                     │
│  signature + salt + info → AES-256-GCM key                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Filebase   │   │ Cloudflare  │   │   Solana    │
│   (IPFS)    │   │  R2 (Proof) │   │ (Commitment)│
│  [Content]  │   │             │   │             │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    File Reconstruction                       │
│  1. Decrypt critical bytes from proof                       │
│  2. Verify commitment (SHA-256)                             │
│  3. Concatenate: critical_bytes + encrypted_content         │
│  4. Decrypt with AES-256-GCM                                │
└─────────────────────────────────────────────────────────────┘
```

## CLI Usage

```bash
# Interactive recovery (prompts for wallet signature)
blockdrive-recover -c bafybeig... -p proof_abc -l 1 -o recovered.pdf

# Using a signature file
blockdrive-recover -c bafybeig... -p proof_abc -l 1 -s signature.bin -o recovered.pdf

# Using hex-encoded signature
blockdrive-recover -c bafybeig... -p proof_abc -l 1 --sig-hex 3a4b5c... -o recovered.pdf

# With on-chain verification (requires solana extras)
blockdrive-recover -c bafybeig... -p proof_abc -l 1 -o recovered.pdf \
  --verify-onchain \
  --vault-owner YourWalletPublicKey \
  --file-id abcd1234567890ef \
  --network devnet

# Full options
blockdrive-recover --help
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-c, --content-cid` | IPFS CID of encrypted content (required) |
| `-p, --proof-cid` | Proof identifier from R2 (required) |
| `-l, --level` | Security level: 1, 2, or 3 (required) |
| `-o, --output` | Output file path (required) |
| `-s, --signature` | Path to signature file |
| `--sig-hex` | Signature as hex string |
| `--sig-base64` | Signature as base64 string |
| `--provider` | Storage provider (filebase, pinata, infura) |
| `--verify-onchain` | Verify commitment on Solana |
| `--vault-owner` | Wallet address (for on-chain verification) |
| `--file-id` | File UUID (for on-chain verification) |
| `--network` | Solana network (mainnet, devnet, localnet) |

## API Reference

See [API.md](./docs/API.md) for detailed documentation.

## License

MIT License - This is open source software. You own your data.
