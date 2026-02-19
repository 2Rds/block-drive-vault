"""
BlockDrive Recovery SDK — Solana On-Chain Verification (optional)

Reads FileRecord PDAs from Solana to verify commitments before decryption.
Requires: pip install blockdrive-recovery[solana]
"""

from __future__ import annotations

import hashlib
import struct
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .wallet import SecurityLevel

# Solana deps are optional
try:
    from solders.pubkey import Pubkey  # type: ignore[import-untyped]
    from solana.rpc.api import Client as SolanaClient  # type: ignore[import-untyped]
    SOLANA_AVAILABLE = True
except ImportError:
    SOLANA_AVAILABLE = False
    Pubkey = None  # type: ignore[assignment,misc]
    SolanaClient = None  # type: ignore[assignment,misc]


# Default program ID (update after deployment)
DEFAULT_PROGRAM_ID = "BLKDrv1111111111111111111111111111111111111"

RPC_ENDPOINTS = {
    "mainnet": "https://api.mainnet-beta.solana.com",
    "devnet": "https://api.devnet.solana.com",
    "localnet": "http://localhost:8899",
}


@dataclass
class FileRecord:
    """Deserialized on-chain FileRecord."""
    file_id: str
    vault: str
    owner: str
    metadata_blob_cid: str
    encryption_commitment: str
    critical_bytes_commitment: str
    security_level: SecurityLevel
    file_size: int
    created_at: int
    status: int
    delegation_count: int


@dataclass
class VerificationResult:
    """Result of on-chain commitment verification."""
    verified: bool
    on_chain: bool
    commitment_matches: bool
    owner_matches: bool
    record: Optional[FileRecord] = None
    error: Optional[str] = None


class BlockDriveSolana:
    """
    Read-only Solana client for verifying BlockDrive file commitments.

    PDA derivation:
      - Vault: seeds = ["user_vault", owner_pubkey]
      - File:  seeds = ["file", vault_pubkey, file_id_bytes]
    """

    def __init__(
        self,
        network: str = "devnet",
        rpc_url: Optional[str] = None,
        program_id: Optional[str] = None,
    ):
        if not SOLANA_AVAILABLE:
            raise ImportError(
                "Solana dependencies not installed. "
                "Install with: pip install blockdrive-recovery[solana]"
            )

        self.rpc_url = rpc_url or RPC_ENDPOINTS.get(network, RPC_ENDPOINTS["devnet"])
        self.program_id = Pubkey.from_string(program_id or DEFAULT_PROGRAM_ID)
        self.client = SolanaClient(self.rpc_url)

    # ------------------------------------------------------------------
    # PDA derivation
    # ------------------------------------------------------------------

    def derive_vault_pda(self, owner: str) -> Tuple["Pubkey", int]:
        """Derive UserVault PDA. Seeds: ["user_vault", owner_pubkey]."""
        owner_pubkey = Pubkey.from_string(owner)
        return Pubkey.find_program_address(
            [b"user_vault", bytes(owner_pubkey)],
            self.program_id,
        )

    def derive_file_pda(
        self, vault: "Pubkey", file_id_bytes: bytes
    ) -> Tuple["Pubkey", int]:
        """Derive FileRecord PDA. Seeds: ["file", vault_pubkey, file_id]."""
        if len(file_id_bytes) != 16:
            raise ValueError("file_id must be 16 bytes")
        return Pubkey.find_program_address(
            [b"file", bytes(vault), file_id_bytes],
            self.program_id,
        )

    # ------------------------------------------------------------------
    # Fetch & deserialize
    # ------------------------------------------------------------------

    def fetch_file_record(
        self, vault_owner: str, file_id_hex: str
    ) -> Optional[FileRecord]:
        """
        Fetch a FileRecord from Solana.

        Args:
            vault_owner: Owner wallet address (base58).
            file_id_hex: 32-char hex file ID (no dashes).

        Returns:
            FileRecord or None if not found.
        """
        file_id_bytes = bytes.fromhex(file_id_hex.replace("-", ""))
        if len(file_id_bytes) != 16:
            raise ValueError("file_id must decode to 16 bytes")

        vault_pda, _ = self.derive_vault_pda(vault_owner)
        file_pda, _ = self.derive_file_pda(vault_pda, file_id_bytes)

        resp = self.client.get_account_info(file_pda)
        if resp.value is None:
            return None

        return self._deserialize(resp.value.data, vault_owner)

    def fetch_all_file_records(self, vault_owner: str) -> List[FileRecord]:
        """
        Fetch all FileRecords for an owner using getProgramAccounts.

        This is an expensive RPC call. Use sparingly.
        """
        owner_pubkey = Pubkey.from_string(vault_owner)

        # Filter by owner field (offset 41 = 8 discriminator + 1 bump + 32 vault)
        filters = [
            {"memcmp": {"offset": 41, "bytes": str(owner_pubkey)}},
        ]

        resp = self.client.get_program_accounts(
            self.program_id,
            encoding="base64",
            filters=filters,
        )

        records: List[FileRecord] = []
        for account in resp.value or []:
            try:
                record = self._deserialize(account.account.data, vault_owner)
                records.append(record)
            except Exception:
                continue
        return records

    def _deserialize(self, data: bytes, owner: str) -> FileRecord:
        """
        Deserialize FileRecord from Borsh-encoded account data.

        Layout (from IMPLEMENTATION_PLAN.md):
          discriminator[8], bump[1], vault[32], owner[32],
          file_id[16], metadata_blob_cid[64],
          encryption_commitment[32], critical_bytes_commitment[32],
          security_level[1], file_size[8], created_at[8],
          status[1], delegation_count[1]
        """
        o = 8  # skip discriminator

        _bump = data[o]; o += 1
        vault_bytes = data[o:o + 32]; o += 32
        owner_bytes = data[o:o + 32]; o += 32
        file_id = data[o:o + 16].hex(); o += 16
        metadata_cid_bytes = data[o:o + 64]; o += 64
        enc_commitment = data[o:o + 32].hex(); o += 32
        cb_commitment = data[o:o + 32].hex(); o += 32
        sec_level_raw = data[o]; o += 1
        file_size = struct.unpack("<Q", data[o:o + 8])[0]; o += 8
        created_at = struct.unpack("<q", data[o:o + 8])[0]; o += 8
        status = data[o]; o += 1
        delegation_count = data[o]; o += 1

        metadata_cid = metadata_cid_bytes.rstrip(b"\x00").decode("utf-8", errors="ignore")
        vault_str = str(Pubkey.from_bytes(vault_bytes))

        return FileRecord(
            file_id=file_id,
            vault=vault_str,
            owner=owner,
            metadata_blob_cid=metadata_cid,
            encryption_commitment=enc_commitment,
            critical_bytes_commitment=cb_commitment,
            security_level=SecurityLevel(sec_level_raw + 1),  # on-chain is 0-indexed
            file_size=file_size,
            created_at=created_at,
            status=status,
            delegation_count=delegation_count,
        )

    # ------------------------------------------------------------------
    # Verification
    # ------------------------------------------------------------------

    def verify_commitment(
        self,
        vault_owner: str,
        file_id_hex: str,
        expected_commitment: str,
    ) -> VerificationResult:
        """
        Verify a file's commitment against what's stored on-chain.

        Args:
            vault_owner: Owner wallet address.
            file_id_hex: File ID hex string.
            expected_commitment: SHA-256 hex of critical bytes.

        Returns:
            VerificationResult.
        """
        try:
            record = self.fetch_file_record(vault_owner, file_id_hex)
            if record is None:
                return VerificationResult(
                    verified=False, on_chain=False,
                    commitment_matches=False, owner_matches=False,
                    error="File not found on-chain",
                )

            matches = (
                expected_commitment.lower() == record.critical_bytes_commitment.lower()
            )

            return VerificationResult(
                verified=matches,
                on_chain=True,
                commitment_matches=matches,
                owner_matches=True,
                record=record,
            )
        except Exception as exc:
            return VerificationResult(
                verified=False, on_chain=False,
                commitment_matches=False, owner_matches=False,
                error=str(exc),
            )


def is_solana_available() -> bool:
    """Check if Solana dependencies are installed."""
    return SOLANA_AVAILABLE
