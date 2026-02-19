"""
BlockDrive Recovery SDK — Main Orchestration

High-level API for recovering BlockDrive-encrypted files.
"""

from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from .wallet import BlockDriveWallet, SecurityLevel
from .crypto import BlockDriveCrypto
from .storage import BlockDriveStorage, DownloadResult

if TYPE_CHECKING:
    from .solana import FileRecord


@dataclass
class RecoveryResult:
    """Result of a file recovery operation."""
    success: bool
    data: bytes
    commitment: str = ""
    verified: bool = False
    error: Optional[str] = None


class BlockDriveRecovery:
    """
    Primary user-facing API for recovering BlockDrive-encrypted files.

    Usage (sync):
        recovery = BlockDriveRecovery(
            signatures={SecurityLevel.STANDARD: sig_bytes},
        )
        result = recovery.recover_file(
            content_cid="bafybeig...",
            proof_cid="proof-abc123",
            security_level=SecurityLevel.STANDARD,
        )
        with open("recovered.pdf", "wb") as f:
            f.write(result.data)

    Usage (async):
        result = await recovery.recover_file_async(...)
    """

    def __init__(
        self,
        signatures: Optional[Dict[SecurityLevel, bytes]] = None,
        owner_pubkey: Optional[str] = None,
        ipfs_gateways: Optional[list] = None,
        r2_url: Optional[str] = None,
        timeout: float = 60.0,
    ):
        """
        Args:
            signatures: Mapping of security level to wallet signature bytes.
                        Keys are derived immediately via HKDF.
            owner_pubkey: Owner's Solana wallet address (for on-chain verification).
            ipfs_gateways: Custom IPFS gateway URLs.
            r2_url: Custom R2 base URL for proofs.
            timeout: HTTP timeout in seconds.
        """
        self._wallet = BlockDriveWallet()
        self._storage = BlockDriveStorage(
            ipfs_gateways=ipfs_gateways,
            r2_url=r2_url,
            timeout=timeout,
        )
        self._owner_pubkey = owner_pubkey

        # Derive keys from signatures
        self._crypto: Dict[SecurityLevel, BlockDriveCrypto] = {}

        if signatures:
            for level, sig in signatures.items():
                self._add_key(level, sig)

    def _add_key(self, level: SecurityLevel, signature: bytes) -> None:
        key = BlockDriveWallet.derive_key(signature, level)
        self._crypto[level] = BlockDriveCrypto(key)

    def add_signature(self, signature: bytes, level: SecurityLevel) -> None:
        """Derive and store a key from a signature after construction."""
        self._add_key(level, signature)

    def has_key(self, level: SecurityLevel) -> bool:
        """Check if a key has been derived for the given security level."""
        return level in self._crypto

    # ------------------------------------------------------------------
    # Single-file recovery (sync)
    # ------------------------------------------------------------------

    def recover_file(
        self,
        content_cid: str,
        proof_cid: str,
        security_level: SecurityLevel,
        expected_hash: Optional[str] = None,
    ) -> RecoveryResult:
        """
        Recover a single encrypted file (synchronous).

        Steps:
          1. Download encrypted content from IPFS
          2. Download ZK proof from R2 (with IPFS fallback)
          3. Verify proof integrity & decrypt → critical_bytes + file_iv
          4. Verify commitment
          5. Reconstruct + AES-256-GCM decrypt

        Args:
            content_cid: IPFS CID of the encrypted content (without critical bytes).
            proof_cid: CID / key of the ZK proof package.
            security_level: Security level the file was encrypted with.
            expected_hash: Optional SHA-256 hex of original plaintext.

        Returns:
            RecoveryResult with decrypted bytes on success.
        """
        crypto = self._get_crypto(security_level)

        # Step 1: Download encrypted content
        content_result = self._storage.download_ipfs_sync(content_cid)
        if not content_result.success:
            return RecoveryResult(
                success=False, data=b"",
                error=f"Failed to download content: {content_result.error}",
            )

        # Step 2: Download ZK proof
        proof_result = self._storage.download_proof_with_fallback_sync(proof_cid)
        if not proof_result.success:
            return RecoveryResult(
                success=False, data=b"",
                error=f"Failed to download proof: {proof_result.error}",
            )

        proof_json = BlockDriveStorage.parse_proof_json(proof_result.data)

        # Steps 3-5: Verify proof, extract, decrypt
        return self._decrypt_with_proof(
            crypto, content_result.data, proof_json, expected_hash,
        )

    # ------------------------------------------------------------------
    # Single-file recovery (async)
    # ------------------------------------------------------------------

    async def recover_file_async(
        self,
        content_cid: str,
        proof_cid: str,
        security_level: SecurityLevel,
        expected_hash: Optional[str] = None,
    ) -> RecoveryResult:
        """Async version of recover_file."""
        crypto = self._get_crypto(security_level)

        # Download content and proof concurrently
        content_task = self._storage.download_ipfs(content_cid)
        proof_task = self._storage.download_proof_with_fallback(proof_cid)
        content_result, proof_result = await asyncio.gather(
            content_task, proof_task,
        )

        if not content_result.success:
            return RecoveryResult(
                success=False, data=b"",
                error=f"Failed to download content: {content_result.error}",
            )
        if not proof_result.success:
            return RecoveryResult(
                success=False, data=b"",
                error=f"Failed to download proof: {proof_result.error}",
            )

        proof_json = BlockDriveStorage.parse_proof_json(proof_result.data)
        return self._decrypt_with_proof(
            crypto, content_result.data, proof_json, expected_hash,
        )

    # ------------------------------------------------------------------
    # Batch recovery from Solana
    # ------------------------------------------------------------------

    def recover_all_files(
        self,
        output_dir: str | Path,
    ) -> List[RecoveryResult]:
        """
        Recover all files for the owner by reading FileRecords from Solana.

        Requires the solana optional dependency and owner_pubkey set.

        Args:
            output_dir: Directory to write recovered files into.

        Returns:
            List of RecoveryResult for each file.
        """
        from .solana import BlockDriveSolana, is_solana_available

        if not is_solana_available():
            return [RecoveryResult(
                success=False, data=b"",
                error="Solana dependencies not installed",
            )]

        if not self._owner_pubkey:
            return [RecoveryResult(
                success=False, data=b"",
                error="owner_pubkey is required for recover_all_files",
            )]

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        solana = BlockDriveSolana()
        records = solana.fetch_all_file_records(self._owner_pubkey)

        results: List[RecoveryResult] = []
        for record in records:
            result = self.recover_file_record(record, output_path)
            results.append(result)

        return results

    def recover_file_record(
        self,
        record: FileRecord,
        output_dir: Optional[Path] = None,
    ) -> RecoveryResult:
        """
        Recover a file from a Solana FileRecord object.

        Args:
            record: FileRecord with file_id, metadata_blob_cid, etc.
            output_dir: Optional directory to write the recovered file.

        Returns:
            RecoveryResult.
        """
        level = record.security_level
        if not self.has_key(level):
            return RecoveryResult(
                success=False, data=b"",
                error=f"No key for security level {level}. Add a signature first.",
            )

        # metadata_blob_cid may contain the content CID
        # The proof CID needs to come from metadata or a known pattern
        # For now, we require metadata_blob_cid to point to a JSON with both CIDs
        try:
            meta_result = self._storage.download_ipfs_sync(record.metadata_blob_cid)
            if not meta_result.success:
                return RecoveryResult(
                    success=False, data=b"",
                    error=f"Failed to download metadata: {meta_result.error}",
                )

            meta = json.loads(meta_result.data.decode("utf-8"))
            content_cid = meta.get("contentCid", "")
            proof_cid = meta.get("proofCid", "")

            if not content_cid or not proof_cid:
                return RecoveryResult(
                    success=False, data=b"",
                    error="Metadata missing contentCid or proofCid",
                )

            result = self.recover_file(content_cid, proof_cid, level)

            if result.success and output_dir:
                filename = meta.get("fileName", f"file_{record.file_id}")
                filepath = output_dir / filename
                filepath.write_bytes(result.data)

            return result
        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            return RecoveryResult(
                success=False, data=b"",
                error=f"Recovery failed: {exc}",
            )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _get_crypto(self, level: SecurityLevel) -> BlockDriveCrypto:
        if level not in self._crypto:
            raise ValueError(
                f"No key derived for security level {level}. "
                "Call add_signature() or pass signatures to constructor."
            )
        return self._crypto[level]

    @staticmethod
    def _decrypt_with_proof(
        crypto: BlockDriveCrypto,
        encrypted_content: bytes,
        proof_json: Dict[str, Any],
        expected_hash: Optional[str],
    ) -> RecoveryResult:
        """Verify proof, extract critical bytes, and decrypt file."""
        try:
            critical_bytes, file_iv = crypto.verify_and_decrypt_proof(proof_json)

            decrypted = crypto.decrypt_file(
                encrypted_content=encrypted_content,
                critical_bytes=critical_bytes,
                file_iv=file_iv,
                commitment=proof_json["commitment"],
                expected_hash=expected_hash,
            )

            return RecoveryResult(
                success=True,
                data=decrypted,
                commitment=proof_json["commitment"],
                verified=True,
            )
        except (ValueError, KeyError) as exc:
            return RecoveryResult(
                success=False, data=b"",
                error=str(exc),
            )
