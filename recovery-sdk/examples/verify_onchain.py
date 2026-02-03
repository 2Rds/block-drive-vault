#!/usr/bin/env python3
"""
BlockDrive Recovery SDK - On-Chain Verification Example

This example demonstrates how to verify a file's commitment on Solana
before recovering it. This provides cryptographic proof that the file
being recovered matches what was originally registered on-chain.

Requirements:
    pip install blockdrive-recovery[solana]

Usage:
    python verify_onchain.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from blockdrive_recovery import BlockDriveRecovery, SecurityLevel, is_solana_available


def get_signature_from_wallet():
    """Get wallet signature (see basic_recovery.py for details)."""
    sig_hex = os.environ.get("BLOCKDRIVE_SIGNATURE_HEX")
    if sig_hex:
        return bytes.fromhex(sig_hex.replace("0x", ""))

    sig_path = os.environ.get("BLOCKDRIVE_SIGNATURE_PATH")
    if sig_path and os.path.exists(sig_path):
        with open(sig_path, "rb") as f:
            return f.read()

    raise ValueError("No signature provided")


def main():
    # Check if Solana is available
    if not is_solana_available():
        print("Error: Solana dependencies not installed")
        print("Install with: pip install blockdrive-recovery[solana]")
        return 1

    # Import Solana-specific modules
    from blockdrive_recovery.solana import SolanaVerifier

    # Configuration
    CONTENT_CID = os.environ.get("CONTENT_CID", "bafybeig...")
    PROOF_CID = os.environ.get("PROOF_CID", "proof_abc123")
    SECURITY_LEVEL = int(os.environ.get("SECURITY_LEVEL", "1"))
    VAULT_OWNER = os.environ.get("VAULT_OWNER", "YourWalletPublicKey")
    FILE_ID = os.environ.get("FILE_ID", "abcd1234567890ef")
    NETWORK = os.environ.get("SOLANA_NETWORK", "devnet")
    OUTPUT_PATH = os.environ.get("OUTPUT_PATH", "recovered_file.bin")

    print("BlockDrive Recovery SDK - On-Chain Verification")
    print("=" * 60)
    print(f"Network: {NETWORK}")
    print(f"Vault Owner: {VAULT_OWNER}")
    print(f"File ID: {FILE_ID}")
    print()

    # Step 1: Initialize Solana verifier
    print("[1/4] Connecting to Solana...")
    try:
        verifier = SolanaVerifier(network=NETWORK)
        print(f"      Connected to {verifier.rpc_url}")
    except Exception as e:
        print(f"      Error: {e}")
        return 1

    # Step 2: Fetch on-chain record
    print("[2/4] Fetching file record from blockchain...")
    record = verifier.fetch_file_record(VAULT_OWNER, FILE_ID)

    if record is None:
        print("      File not found on-chain")
        print("      Proceeding without on-chain verification...")
    else:
        print(f"      Found on-chain record:")
        print(f"        - File ID: {record.file_id}")
        print(f"        - Security Level: {record.security_level}")
        print(f"        - CID: {record.primary_cid[:20]}...")
        print(f"        - Commitment: {record.critical_bytes_commitment[:16]}...")
        print(f"        - Created: {record.created_at}")
        print(f"        - Shared: {record.is_shared}")

    # Step 3: Get signature and initialize recovery
    print("[3/4] Initializing recovery...")
    try:
        signature = get_signature_from_wallet()
    except ValueError as e:
        print(f"      Error: {e}")
        return 1

    recovery = BlockDriveRecovery()
    level = SecurityLevel(SECURITY_LEVEL)

    if not recovery.derive_key_from_signature(signature, level):
        print("      Error: Failed to derive key")
        return 1
    print("      Key derived successfully")

    # Step 4: Recover with verification
    print("[4/4] Recovering file with on-chain verification...")
    result = recovery.recover_with_verification(
        content_cid=CONTENT_CID,
        proof_cid=PROOF_CID,
        security_level=level,
        vault_owner=VAULT_OWNER,
        file_id=FILE_ID,
        network=NETWORK
    )

    if not result.success:
        print(f"\nRecovery failed: {result.error}")
        return 1

    # Save file
    with open(OUTPUT_PATH, "wb") as f:
        f.write(result.data)

    print()
    print("=" * 60)
    print("Recovery with On-Chain Verification - SUCCESS")
    print("=" * 60)
    print(f"  File: {OUTPUT_PATH}")
    print(f"  Size: {result.file_size:,} bytes")
    print(f"  On-chain verified: Yes")
    print(f"  Commitment valid: {result.commitment_valid}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
