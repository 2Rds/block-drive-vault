#!/usr/bin/env python3
"""
BlockDrive Recovery SDK - Basic Recovery Example

This example demonstrates how to recover a file encrypted with BlockDrive
using just the content CID and proof CID.

Requirements:
    pip install blockdrive-recovery

Usage:
    python basic_recovery.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for local development
sys.path.insert(0, str(Path(__file__).parent.parent))

from blockdrive_recovery import BlockDriveRecovery, SecurityLevel


def get_signature_from_wallet():
    """
    In a real application, you would get this signature from a wallet.

    For Solana wallets, you would:
    1. Connect to the wallet (Phantom, Solflare, etc.)
    2. Request a signature for the appropriate message
    3. Get the signature bytes

    The message to sign depends on the security level:
    - Level 1: "BlockDrive Security Level One - Standard Protection"
    - Level 2: "BlockDrive Security Level Two - Sensitive Data Protection"
    - Level 3: "BlockDrive Security Level Three - Maximum Security"
    """
    # This is a placeholder - replace with actual wallet signature
    # In production, you would use a library like solana-py or phantom-wallet

    # Example using a pre-saved signature file:
    sig_path = os.environ.get("BLOCKDRIVE_SIGNATURE_PATH")
    if sig_path and os.path.exists(sig_path):
        with open(sig_path, "rb") as f:
            return f.read()

    # Example using hex signature from environment:
    sig_hex = os.environ.get("BLOCKDRIVE_SIGNATURE_HEX")
    if sig_hex:
        return bytes.fromhex(sig_hex.replace("0x", ""))

    raise ValueError(
        "No signature provided. Set BLOCKDRIVE_SIGNATURE_PATH or "
        "BLOCKDRIVE_SIGNATURE_HEX environment variable."
    )


def main():
    # Configuration - replace with your actual values
    CONTENT_CID = os.environ.get("CONTENT_CID", "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi")
    PROOF_CID = os.environ.get("PROOF_CID", "proof_abc123")
    SECURITY_LEVEL = int(os.environ.get("SECURITY_LEVEL", "1"))
    OUTPUT_PATH = os.environ.get("OUTPUT_PATH", "recovered_file.bin")

    print("BlockDrive Recovery SDK - Basic Example")
    print("=" * 50)
    print(f"Content CID: {CONTENT_CID}")
    print(f"Proof CID: {PROOF_CID}")
    print(f"Security Level: {SECURITY_LEVEL}")
    print(f"Output: {OUTPUT_PATH}")
    print()

    # Step 1: Get wallet signature
    print("[1/3] Getting wallet signature...")
    try:
        signature = get_signature_from_wallet()
        print(f"      Signature loaded: {len(signature)} bytes")
    except ValueError as e:
        print(f"      Error: {e}")
        print("\nTo run this example, you need to provide a wallet signature.")
        print("See the get_signature_from_wallet() function for details.")
        return 1

    # Step 2: Initialize recovery SDK
    print("[2/3] Initializing recovery SDK...")
    recovery = BlockDriveRecovery()

    # Derive encryption key from signature
    level = SecurityLevel(SECURITY_LEVEL)
    success = recovery.derive_key_from_signature(signature, level)
    if not success:
        print("      Error: Failed to derive encryption key")
        return 1
    print("      Key derived successfully")

    # Step 3: Recover the file
    print("[3/3] Recovering file...")
    result = recovery.recover_file(
        content_cid=CONTENT_CID,
        proof_cid=PROOF_CID,
        security_level=level,
        storage_provider="filebase",
        verify_commitment=True
    )

    # Check result
    if not result.success:
        print(f"\nRecovery failed: {result.error}")
        return 1

    # Save recovered file
    with open(OUTPUT_PATH, "wb") as f:
        f.write(result.data)

    print()
    print("=" * 50)
    print("Recovery Successful!")
    print("=" * 50)
    print(f"  File saved: {OUTPUT_PATH}")
    print(f"  File size: {result.file_size:,} bytes")
    print(f"  Commitment valid: {'Yes' if result.commitment_valid else 'No'}")
    print(f"  Download time: {result.download_time_ms}ms")
    print(f"  Decryption time: {result.decryption_time_ms}ms")

    return 0


if __name__ == "__main__":
    sys.exit(main())
