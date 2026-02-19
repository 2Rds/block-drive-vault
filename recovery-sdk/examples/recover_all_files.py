#!/usr/bin/env python3
"""
Example: Recover all BlockDrive files using on-chain records.

Prerequisites:
    pip install blockdrive-recovery[solana]

This example reads all FileRecords from Solana for a given wallet,
then downloads and decrypts each file.
"""

from pathlib import Path

from blockdrive import BlockDriveRecovery, BlockDriveWallet, SecurityLevel


def main():
    # --- Step 1: Get your wallet signatures for all levels ---
    # You may only need the levels you actually used.
    # Sign each message with your Ed25519 wallet.
    print("Messages to sign:")
    for level in SecurityLevel:
        msg = BlockDriveWallet.get_sign_message(level)
        print(f"  Level {level}: {msg}")
    print()

    # Replace with your actual signatures
    signatures = {
        SecurityLevel.STANDARD: bytes.fromhex("00" * 64),
        SecurityLevel.SENSITIVE: bytes.fromhex("00" * 64),
        SecurityLevel.MAXIMUM: bytes.fromhex("00" * 64),
    }

    # --- Step 2: Initialize recovery with your wallet address ---
    owner_pubkey = "YourSolanaWalletAddressHere"

    recovery = BlockDriveRecovery(
        signatures=signatures,
        owner_pubkey=owner_pubkey,
    )

    # --- Step 3: Recover all files ---
    output_dir = Path("./recovered_files")
    results = recovery.recover_all_files(output_dir)

    # --- Step 4: Summary ---
    succeeded = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)

    print(f"\nRecovery complete: {succeeded} succeeded, {failed} failed")
    if failed:
        for r in results:
            if not r.success:
                print(f"  Failed: {r.error}")


if __name__ == "__main__":
    main()
