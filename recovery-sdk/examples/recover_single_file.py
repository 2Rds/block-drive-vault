#!/usr/bin/env python3
"""
Example: Recover a single BlockDrive-encrypted file.

Prerequisites:
    pip install blockdrive-recovery

You need:
    1. Your wallet signature for the security level used during encryption.
       Sign the appropriate message with your Ed25519 wallet:
         - Level 1: "BlockDrive Security Level One - Standard Protection"
         - Level 2: "BlockDrive Security Level Two - Sensitive Data Protection"
         - Level 3: "BlockDrive Security Level Three - Maximum Security"

    2. The IPFS CID of your encrypted content (from your file records).
    3. The proof CID / key for the ZK proof package (from R2 or IPFS).
"""

from blockdrive import BlockDriveRecovery, BlockDriveWallet, SecurityLevel


def main():
    # --- Step 1: Get your wallet signature ---
    # The message you need to sign depends on the security level.
    level = SecurityLevel.STANDARD
    message = BlockDriveWallet.get_sign_message(level)
    print(f"Sign this message with your wallet:\n  {message}\n")

    # Replace with your actual 64-byte Ed25519 signature
    signature = bytes.fromhex(
        "00" * 64  # placeholder — use your real signature
    )

    # --- Step 2: Initialize recovery ---
    recovery = BlockDriveRecovery(
        signatures={level: signature},
    )

    # --- Step 3: Provide your file's CIDs ---
    content_cid = "bafybeig..."   # IPFS CID of encrypted content
    proof_cid = "proof-abc123"    # R2 key or IPFS CID of ZK proof

    # --- Step 4: Recover ---
    result = recovery.recover_file(
        content_cid=content_cid,
        proof_cid=proof_cid,
        security_level=level,
    )

    if result.success:
        output_path = "recovered_file.bin"
        with open(output_path, "wb") as f:
            f.write(result.data)
        print(f"File recovered: {output_path} ({len(result.data)} bytes)")
        print(f"Commitment verified: {result.verified}")
    else:
        print(f"Recovery failed: {result.error}")


if __name__ == "__main__":
    main()
