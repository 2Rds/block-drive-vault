"""
BlockDrive Recovery SDK - Command Line Interface

Usage:
    blockdrive-recover --content-cid <CID> --proof-cid <PROOF> --level <1|2|3> --output <FILE>
"""

import argparse
import sys
import os
from pathlib import Path
from typing import Optional

from .recovery import BlockDriveRecovery
from .types import SecurityLevel, SECURITY_LEVEL_MESSAGES


def print_banner():
    """Print the BlockDrive Recovery banner."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║           BlockDrive Recovery SDK v1.0.0                    ║
║     Open-source file recovery for BlockDrive encryption     ║
╚══════════════════════════════════════════════════════════════╝
    """)


def read_signature_file(path: str) -> bytes:
    """Read a signature from a binary file."""
    with open(path, "rb") as f:
        return f.read()


def prompt_for_signature(level: SecurityLevel) -> bytes:
    """
    Prompt user to sign a message and input the signature.

    In a full implementation, this would integrate with wallet
    libraries like solana-py or phantom-wallet.
    """
    message = SECURITY_LEVEL_MESSAGES[level]

    print(f"\n{'='*60}")
    print(f"SIGNATURE REQUIRED - Security Level {level}")
    print(f"{'='*60}")
    print(f"\nPlease sign the following message with your wallet:\n")
    print(f'  "{message}"')
    print(f"\nOptions:")
    print(f"  1. Use Phantom/Solflare browser extension")
    print(f"  2. Use a CLI wallet tool")
    print(f"  3. Paste the signature as hex or base64")
    print()

    while True:
        sig_input = input("Enter signature (hex or base64), or path to .sig file: ").strip()

        if not sig_input:
            continue

        # Check if it's a file path
        if os.path.exists(sig_input):
            try:
                return read_signature_file(sig_input)
            except Exception as e:
                print(f"Error reading file: {e}")
                continue

        # Try to decode as hex
        try:
            if sig_input.startswith("0x"):
                sig_input = sig_input[2:]
            return bytes.fromhex(sig_input)
        except ValueError:
            pass

        # Try to decode as base64
        try:
            import base64
            return base64.b64decode(sig_input)
        except Exception:
            pass

        print("Invalid signature format. Please try again.")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Recover files encrypted with BlockDrive",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode (prompts for signature)
  blockdrive-recover -c bafybeig... -p proof_abc -l 1 -o recovered.pdf

  # With signature file
  blockdrive-recover -c bafybeig... -p proof_abc -l 1 -s signature.bin -o recovered.pdf

  # With hex signature
  blockdrive-recover -c bafybeig... -p proof_abc -l 1 --sig-hex 3a4b5c... -o recovered.pdf

Security Levels:
  1 = Standard Protection
  2 = Sensitive Data Protection
  3 = Maximum Security
        """
    )

    parser.add_argument(
        "-c", "--content-cid",
        required=True,
        help="IPFS CID of the encrypted content"
    )

    parser.add_argument(
        "-p", "--proof-cid",
        required=True,
        help="Proof CID/identifier from Cloudflare R2"
    )

    parser.add_argument(
        "-l", "--level",
        type=int,
        choices=[1, 2, 3],
        required=True,
        help="Security level (1=Standard, 2=Sensitive, 3=Maximum)"
    )

    parser.add_argument(
        "-o", "--output",
        required=True,
        help="Output file path"
    )

    parser.add_argument(
        "-s", "--signature",
        help="Path to signature file (.bin or .sig)"
    )

    parser.add_argument(
        "--sig-hex",
        help="Signature as hex string"
    )

    parser.add_argument(
        "--sig-base64",
        help="Signature as base64 string"
    )

    parser.add_argument(
        "-m", "--metadata-cid",
        help="Optional: IPFS CID of encrypted metadata"
    )

    parser.add_argument(
        "--provider",
        default="filebase",
        choices=["filebase", "pinata", "infura", "cloudflare"],
        help="Storage provider (default: filebase)"
    )

    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Skip commitment verification (not recommended)"
    )

    parser.add_argument(
        "--verify-onchain",
        action="store_true",
        help="Verify commitment on Solana before decryption"
    )

    parser.add_argument(
        "--vault-owner",
        help="Vault owner wallet address (required for on-chain verification)"
    )

    parser.add_argument(
        "--file-id",
        help="File UUID (required for on-chain verification)"
    )

    parser.add_argument(
        "--network",
        default="devnet",
        choices=["mainnet", "devnet", "localnet"],
        help="Solana network (default: devnet)"
    )

    parser.add_argument(
        "--program-id",
        help="Custom BlockDrive program ID"
    )

    parser.add_argument(
        "-q", "--quiet",
        action="store_true",
        help="Suppress progress output"
    )

    parser.add_argument(
        "-v", "--version",
        action="version",
        version="BlockDrive Recovery SDK v1.0.0"
    )

    args = parser.parse_args()

    if not args.quiet:
        print_banner()

    # Get security level
    level = SecurityLevel(args.level)

    # Get signature
    signature: Optional[bytes] = None

    if args.signature:
        try:
            signature = read_signature_file(args.signature)
            if not args.quiet:
                print(f"Loaded signature from {args.signature}")
        except Exception as e:
            print(f"Error reading signature file: {e}")
            sys.exit(1)

    elif args.sig_hex:
        try:
            hex_str = args.sig_hex
            if hex_str.startswith("0x"):
                hex_str = hex_str[2:]
            signature = bytes.fromhex(hex_str)
        except ValueError as e:
            print(f"Invalid hex signature: {e}")
            sys.exit(1)

    elif args.sig_base64:
        try:
            import base64
            signature = base64.b64decode(args.sig_base64)
        except Exception as e:
            print(f"Invalid base64 signature: {e}")
            sys.exit(1)

    else:
        # Interactive mode
        signature = prompt_for_signature(level)

    if not signature:
        print("No signature provided")
        sys.exit(1)

    if not args.quiet:
        print(f"\nSignature: {len(signature)} bytes")
        print(f"Security Level: {level} ({SECURITY_LEVEL_MESSAGES[level]})")
        print(f"Content CID: {args.content_cid}")
        print(f"Proof CID: {args.proof_cid}")
        print(f"Output: {args.output}")
        print()

    # Initialize recovery
    recovery = BlockDriveRecovery()

    # Derive key
    if not args.quiet:
        print("Deriving encryption key from signature...")

    if not recovery.derive_key_from_signature(signature, level):
        print("Failed to derive encryption key")
        sys.exit(1)

    # Recover file
    if not args.quiet:
        print("\nStarting recovery...\n")

    # Check for on-chain verification requirements
    if args.verify_onchain:
        if not args.vault_owner or not args.file_id:
            print("Error: --verify-onchain requires --vault-owner and --file-id")
            sys.exit(1)

    if args.verify_onchain and args.vault_owner and args.file_id:
        # Use on-chain verification path
        result = recovery.recover_with_verification(
            content_cid=args.content_cid,
            proof_cid=args.proof_cid,
            security_level=level,
            vault_owner=args.vault_owner,
            file_id=args.file_id,
            storage_provider=args.provider,
            network=args.network,
            program_id=args.program_id
        )
    elif args.metadata_cid:
        result = recovery.recover_with_metadata(
            content_cid=args.content_cid,
            proof_cid=args.proof_cid,
            metadata_cid=args.metadata_cid,
            security_level=level,
            storage_provider=args.provider
        )
    else:
        result = recovery.recover_file(
            content_cid=args.content_cid,
            proof_cid=args.proof_cid,
            security_level=level,
            storage_provider=args.provider,
            verify_commitment=not args.no_verify
        )

    if not result.success:
        print(f"\n❌ Recovery failed: {result.error}")
        sys.exit(1)

    # Write output file
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "wb") as f:
        f.write(result.data)

    if not args.quiet:
        print(f"\n{'='*60}")
        print("✅ RECOVERY SUCCESSFUL")
        print(f"{'='*60}")
        print(f"  File: {args.output}")
        print(f"  Size: {result.file_size:,} bytes")
        print(f"  Commitment Valid: {'Yes' if result.commitment_valid else 'No'}")
        print(f"  Download Time: {result.download_time_ms}ms")
        print(f"  Decryption Time: {result.decryption_time_ms}ms")
        print()

    sys.exit(0)


if __name__ == "__main__":
    main()
