# BlockDrive Recovery SDK

Open-source Python SDK for recovering files encrypted with BlockDrive — even if BlockDrive ceases to exist.

## How It Works

BlockDrive uses **"Programmed Incompleteness"**: files are encrypted with AES-256-GCM, then the first 16 bytes of ciphertext ("critical bytes") are extracted and stored separately in a ZK proof package. Without those bytes, the encrypted file cannot be decrypted.

This SDK reassembles the pieces:

```
IPFS (encrypted content, minus first 16 bytes)
  +  R2  (ZK proof → encrypted critical bytes + file IV)
  +  Wallet signature (HKDF → AES-256 key)
  =  Original file
```

## Installation

```bash
# Core (IPFS + R2 downloads, AES-256-GCM decryption)
pip install blockdrive-recovery

# With Solana on-chain verification
pip install blockdrive-recovery[solana]

# With Filebase S3 direct access
pip install blockdrive-recovery[filebase]

# Everything
pip install blockdrive-recovery[full]
```

Or install from source:

```bash
git clone https://github.com/blockdrive/recovery-sdk
cd recovery-sdk
pip install -e ".[dev]"
```

## Quick Start

```python
from blockdrive import BlockDriveRecovery, SecurityLevel

# 1. Sign the security message with your Ed25519 wallet
#    Level 1: "BlockDrive Security Level One - Standard Protection"
signature = my_wallet.sign(message.encode())  # 64-byte Ed25519 signature

# 2. Initialize recovery
recovery = BlockDriveRecovery(
    signatures={SecurityLevel.STANDARD: signature},
)

# 3. Recover your file
result = recovery.recover_file(
    content_cid="bafybeig...",     # IPFS CID of encrypted content
    proof_cid="proof-abc123",      # R2 key of ZK proof
    security_level=SecurityLevel.STANDARD,
)

# 4. Save
if result.success:
    with open("recovered.pdf", "wb") as f:
        f.write(result.data)
    print(f"Recovered {len(result.data)} bytes")
else:
    print(f"Recovery failed: {result.error}")
```

## Async Support

```python
import asyncio
from blockdrive import BlockDriveRecovery, SecurityLevel

async def main():
    recovery = BlockDriveRecovery(
        signatures={SecurityLevel.STANDARD: signature},
    )
    result = await recovery.recover_file_async(
        content_cid="bafybeig...",
        proof_cid="proof-abc123",
        security_level=SecurityLevel.STANDARD,
    )
    print(f"Recovered {len(result.data)} bytes")

asyncio.run(main())
```

## What You Need

To recover files, you need:

1. **Your wallet signature** — sign the appropriate security message with your Ed25519 wallet
2. **Content CID** — IPFS CID of the encrypted file (from your file records)
3. **Proof CID** — identifier of the ZK proof package (from R2 or IPFS)
4. **Security level** — which level was used to encrypt (1, 2, or 3)

### Security Level Messages

| Level | Name | Message to Sign |
|-------|------|-----------------|
| 1 | Standard | `"BlockDrive Security Level One - Standard Protection"` |
| 2 | Sensitive | `"BlockDrive Security Level Two - Sensitive Data Protection"` |
| 3 | Maximum | `"BlockDrive Security Level Three - Maximum Security"` |

## Architecture

```
┌─────────────────────────────────────────────┐
│              BlockDriveRecovery              │
│  (orchestration: download → verify → decrypt)│
├───────────┬───────────┬──────────┬──────────┤
│  wallet   │  crypto   │ storage  │  solana  │
│  (HKDF)   │ (AES-GCM) │ (httpx)  │(optional)│
└───────────┴───────────┴──────────┴──────────┘
```

| Module | Purpose |
|--------|---------|
| `wallet.py` | HKDF-SHA256 key derivation from wallet signatures |
| `crypto.py` | AES-256-GCM decryption, ZK proof hash verification |
| `storage.py` | Multi-gateway IPFS + R2 downloads with fallback |
| `solana.py` | On-chain FileRecord PDA verification (optional) |
| `recovery.py` | Main orchestration — ties everything together |

## Cryptographic Compatibility

This SDK exactly replicates the BlockDrive frontend's cryptographic operations:

- **HKDF**: SHA-256, salt = `BlockDrive-HKDF-Salt-v1`, info = `blockdrive-level-{1|2|3}-encryption`
- **AES-GCM**: 256-bit key, 12-byte IV, 128-bit auth tag, no AAD
- **Critical bytes**: First 16 bytes of AES-GCM ciphertext
- **ZK proof payload**: `critical_bytes[16] + file_iv[12]` = 28 bytes
- **Commitment**: `SHA-256(critical_bytes)` as lowercase hex
- **Proof hash (v2)**: `SHA-256(JSON.stringify({commitment, groth16Proof, publicSignals, encryptedCriticalBytes, proofTimestamp}))` — keys in exact order
- **Proof hash (v1)**: `SHA-256(JSON.stringify({commitment, encryptedCriticalBytes, proofTimestamp}))`
- **Base64**: Standard RFC 4648 encoding

## Development

```bash
cd recovery-sdk
pip install -e ".[dev]"
pytest tests/
```

## License

MIT License — This is open-source software. You own your data.
