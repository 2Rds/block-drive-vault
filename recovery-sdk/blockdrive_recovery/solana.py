"""
BlockDrive Recovery SDK - Solana Verification Module

Verifies file commitments on the Solana blockchain before decryption.
This provides cryptographic proof that the file being recovered matches
what was originally registered on-chain.

This module is optional - install with: pip install blockdrive-recovery[solana]
"""

import hashlib
import struct
from typing import Optional, Tuple
from dataclasses import dataclass

from .types import SecurityLevel, OnChainRecord

# Solana imports are optional
try:
    from solders.pubkey import Pubkey
    from solders.rpc.responses import GetAccountInfoResp
    from solana.rpc.api import Client as SolanaClient
    SOLANA_AVAILABLE = True
except ImportError:
    SOLANA_AVAILABLE = False
    Pubkey = None
    SolanaClient = None


# Default program ID (update after deployment)
DEFAULT_PROGRAM_ID = "BLKDrv1111111111111111111111111111111111111"

# RPC endpoints
RPC_ENDPOINTS = {
    "mainnet": "https://api.mainnet-beta.solana.com",
    "devnet": "https://api.devnet.solana.com",
    "localnet": "http://localhost:8899",
}


@dataclass
class VerificationResult:
    """Result of on-chain verification."""
    verified: bool
    on_chain: bool
    commitment_matches: bool
    owner_matches: bool
    record: Optional[OnChainRecord] = None
    error: Optional[str] = None


class SolanaVerifier:
    """
    Verifies BlockDrive file commitments on Solana.

    Usage:
        verifier = SolanaVerifier(network="devnet")
        result = verifier.verify_file_commitment(
            vault_owner="...",
            file_id="...",
            expected_commitment="..."
        )
    """

    # Account data layout sizes (matching Anchor/Borsh)
    FILE_RECORD_DISCRIMINATOR = bytes([0x54, 0x1e, 0x3f, 0xb2, 0x4d, 0x7a, 0x91, 0xc5])  # 8 bytes

    def __init__(
        self,
        network: str = "devnet",
        rpc_url: Optional[str] = None,
        program_id: Optional[str] = None
    ):
        """
        Initialize Solana verifier.

        Args:
            network: Network name (mainnet, devnet, localnet)
            rpc_url: Custom RPC URL (overrides network setting)
            program_id: BlockDrive program ID (uses default if not provided)
        """
        if not SOLANA_AVAILABLE:
            raise ImportError(
                "Solana dependencies not installed. "
                "Install with: pip install blockdrive-recovery[solana]"
            )

        self.rpc_url = rpc_url or RPC_ENDPOINTS.get(network, RPC_ENDPOINTS["devnet"])
        self.program_id = Pubkey.from_string(program_id or DEFAULT_PROGRAM_ID)
        self.client = SolanaClient(self.rpc_url)

    def derive_vault_pda(self, owner: str) -> Tuple[Pubkey, int]:
        """
        Derive the UserVault PDA for an owner.

        Seeds: ["vault", owner_pubkey]
        """
        owner_pubkey = Pubkey.from_string(owner)
        seeds = [b"vault", bytes(owner_pubkey)]

        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump

    def derive_file_record_pda(self, vault: Pubkey, file_id: bytes) -> Tuple[Pubkey, int]:
        """
        Derive the FileRecord PDA for a file.

        Seeds: ["file", vault_pubkey, file_id]
        """
        if len(file_id) != 16:
            raise ValueError("file_id must be 16 bytes (UUID)")

        seeds = [b"file", bytes(vault), file_id]
        pda, bump = Pubkey.find_program_address(seeds, self.program_id)
        return pda, bump

    def fetch_file_record(
        self,
        vault_owner: str,
        file_id: str
    ) -> Optional[OnChainRecord]:
        """
        Fetch a FileRecord from on-chain.

        Args:
            vault_owner: Owner's wallet address
            file_id: File UUID (hex string without dashes)

        Returns:
            OnChainRecord if found, None otherwise
        """
        try:
            # Convert file_id to bytes
            file_id_bytes = bytes.fromhex(file_id.replace("-", ""))
            if len(file_id_bytes) != 16:
                raise ValueError("Invalid file_id format")

            # Derive PDAs
            vault_pda, _ = self.derive_vault_pda(vault_owner)
            file_pda, _ = self.derive_file_record_pda(vault_pda, file_id_bytes)

            # Fetch account
            response = self.client.get_account_info(file_pda)

            if response.value is None:
                return None

            account_data = response.value.data
            return self._deserialize_file_record(account_data, vault_owner)

        except Exception as e:
            print(f"Error fetching file record: {e}")
            return None

    def _deserialize_file_record(
        self,
        data: bytes,
        owner: str
    ) -> OnChainRecord:
        """
        Deserialize a FileRecord from account data.

        Layout (Borsh):
        - 8 bytes: discriminator
        - 1 byte: bump
        - 32 bytes: vault
        - 32 bytes: owner
        - 16 bytes: file_id
        - 32 bytes: filename_hash
        - 8 bytes: file_size
        - 8 bytes: encrypted_size
        - 32 bytes: mime_type_hash
        - 1 byte: security_level
        - 32 bytes: encryption_commitment
        - 32 bytes: critical_bytes_commitment
        - 64 bytes: primary_cid
        - 64 bytes: redundancy_cid
        - 1 byte: provider_count
        - 8 bytes: created_at
        - 8 bytes: accessed_at
        - 1 byte: status
        - 1 byte: is_shared
        - 1 byte: delegation_count
        - 32 bytes: reserved
        """
        offset = 0

        # Skip discriminator (8 bytes)
        offset += 8

        # bump (1 byte)
        _bump = data[offset]
        offset += 1

        # vault (32 bytes)
        _vault = data[offset:offset + 32]
        offset += 32

        # owner (32 bytes)
        _owner = data[offset:offset + 32]
        offset += 32

        # file_id (16 bytes)
        file_id = data[offset:offset + 16].hex()
        offset += 16

        # filename_hash (32 bytes) - skip
        offset += 32

        # file_size (8 bytes u64)
        _file_size = struct.unpack("<Q", data[offset:offset + 8])[0]
        offset += 8

        # encrypted_size (8 bytes u64) - skip
        offset += 8

        # mime_type_hash (32 bytes) - skip
        offset += 32

        # security_level (1 byte)
        security_level_value = data[offset]
        security_level = SecurityLevel(security_level_value + 1)  # On-chain is 0-indexed
        offset += 1

        # encryption_commitment (32 bytes)
        encryption_commitment = data[offset:offset + 32].hex()
        offset += 32

        # critical_bytes_commitment (32 bytes)
        critical_bytes_commitment = data[offset:offset + 32].hex()
        offset += 32

        # primary_cid (64 bytes) - padded string
        primary_cid_bytes = data[offset:offset + 64]
        primary_cid = primary_cid_bytes.rstrip(b'\x00').decode('utf-8', errors='ignore')
        offset += 64

        # redundancy_cid (64 bytes) - skip for now
        offset += 64

        # provider_count (1 byte) - skip
        offset += 1

        # created_at (8 bytes i64)
        created_at = struct.unpack("<q", data[offset:offset + 8])[0]
        offset += 8

        # accessed_at (8 bytes) - skip
        offset += 8

        # status (1 byte) - skip
        offset += 1

        # is_shared (1 byte)
        is_shared = data[offset] == 1
        offset += 1

        # delegation_count (1 byte)
        delegation_count = data[offset]

        return OnChainRecord(
            file_id=file_id,
            primary_cid=primary_cid,
            proof_cid="",  # Not stored on-chain
            encryption_commitment=encryption_commitment,
            critical_bytes_commitment=critical_bytes_commitment,
            security_level=security_level,
            owner=owner,
            created_at=created_at,
            is_shared=is_shared,
            delegation_count=delegation_count
        )

    def verify_file_commitment(
        self,
        vault_owner: str,
        file_id: str,
        expected_commitment: str,
        current_owner: Optional[str] = None
    ) -> VerificationResult:
        """
        Verify that a file's commitment matches on-chain data.

        Args:
            vault_owner: Owner's wallet address
            file_id: File UUID
            expected_commitment: SHA-256 hash of critical bytes (hex)
            current_owner: Current user's wallet (for ownership check)

        Returns:
            VerificationResult with verification status
        """
        try:
            record = self.fetch_file_record(vault_owner, file_id)

            if record is None:
                return VerificationResult(
                    verified=False,
                    on_chain=False,
                    commitment_matches=False,
                    owner_matches=False,
                    error="File not found on-chain"
                )

            # Normalize commitment format
            expected = expected_commitment.lower().strip()
            on_chain = record.critical_bytes_commitment.lower().strip()

            commitment_matches = expected == on_chain
            owner_matches = current_owner is None or vault_owner == current_owner

            return VerificationResult(
                verified=commitment_matches and owner_matches,
                on_chain=True,
                commitment_matches=commitment_matches,
                owner_matches=owner_matches,
                record=record
            )

        except Exception as e:
            return VerificationResult(
                verified=False,
                on_chain=False,
                commitment_matches=False,
                owner_matches=False,
                error=str(e)
            )

    def verify_critical_bytes(
        self,
        critical_bytes: bytes,
        expected_commitment: str
    ) -> bool:
        """
        Verify critical bytes match a commitment hash.

        Args:
            critical_bytes: The decrypted critical bytes
            expected_commitment: Expected SHA-256 hash (hex)

        Returns:
            True if commitment matches
        """
        actual = hashlib.sha256(critical_bytes).hexdigest()
        return actual.lower() == expected_commitment.lower()


def is_solana_available() -> bool:
    """Check if Solana dependencies are installed."""
    return SOLANA_AVAILABLE


def verify_on_chain(
    vault_owner: str,
    file_id: str,
    critical_bytes: bytes,
    network: str = "devnet",
    program_id: Optional[str] = None
) -> VerificationResult:
    """
    Convenience function to verify a file's critical bytes against on-chain commitment.

    Args:
        vault_owner: Owner's wallet address
        file_id: File UUID
        critical_bytes: Decrypted critical bytes to verify
        network: Solana network (mainnet, devnet, localnet)
        program_id: Optional custom program ID

    Returns:
        VerificationResult with verification status
    """
    if not SOLANA_AVAILABLE:
        return VerificationResult(
            verified=False,
            on_chain=False,
            commitment_matches=False,
            owner_matches=False,
            error="Solana dependencies not installed"
        )

    verifier = SolanaVerifier(network=network, program_id=program_id)

    # Calculate commitment from critical bytes
    commitment = hashlib.sha256(critical_bytes).hexdigest()

    return verifier.verify_file_commitment(vault_owner, file_id, commitment)
