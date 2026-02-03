"""
BlockDrive Recovery SDK - Main Recovery Module

High-level interface for recovering BlockDrive-encrypted files.
"""

import time
import base64
import hashlib
from typing import Optional, Dict

from .types import (
    SecurityLevel,
    RecoveryResult,
    ProofPackage,
    FileMetadata,
    OnChainRecord,
    SECURITY_LEVEL_MESSAGES,
)
from .crypto import KeyDerivation, AESDecryptor, base64_decode
from .storage import StorageOrchestrator, IPFSClient, R2Client, FilebaseClient

# Solana verification is optional
try:
    from .solana import SolanaVerifier, VerificationResult, is_solana_available
    SOLANA_AVAILABLE = is_solana_available()
except ImportError:
    SOLANA_AVAILABLE = False
    SolanaVerifier = None
    VerificationResult = None


class BlockDriveRecovery:
    """
    Main class for recovering BlockDrive-encrypted files.

    BlockDrive uses Filebase for enterprise-grade IPFS infrastructure.
    Files are encrypted with AES-256-GCM and stored on IPFS via Filebase,
    with critical bytes stored separately on Cloudflare R2.

    Usage:
        # Basic recovery (uses public Filebase gateway)
        recovery = BlockDriveRecovery()
        recovery.derive_key_from_signature(signature, SecurityLevel.STANDARD)
        result = recovery.recover_file(content_cid, proof_cid, SecurityLevel.STANDARD)

        # With enterprise Filebase gateway
        filebase = FilebaseClient(dedicated_gateway="https://your-gateway.filebase.io")
        recovery = BlockDriveRecovery(filebase_client=filebase)
    """

    def __init__(
        self,
        ipfs_gateways: Optional[list] = None,
        r2_url: Optional[str] = None,
        filebase_client: Optional[FilebaseClient] = None,
        filebase_gateway: Optional[str] = None
    ):
        """
        Initialize the recovery SDK.

        Args:
            ipfs_gateways: Custom IPFS gateway URLs (overrides defaults)
            r2_url: Custom R2 bucket URL for proofs
            filebase_client: Enterprise Filebase client (optional)
            filebase_gateway: Dedicated Filebase gateway URL (simpler than full client)
        """
        # Build IPFS client with optional Filebase gateway
        ipfs_client = None
        if ipfs_gateways:
            ipfs_client = IPFSClient(gateways=ipfs_gateways)
        elif filebase_gateway:
            ipfs_client = IPFSClient(filebase_gateway=filebase_gateway)

        self.storage = StorageOrchestrator(
            ipfs_client=ipfs_client,
            r2_client=R2Client(base_url=r2_url) if r2_url else None,
            filebase_client=filebase_client
        )
        self._keys: Dict[SecurityLevel, bytes] = {}
        self._decryptors: Dict[SecurityLevel, AESDecryptor] = {}

    def derive_key_from_signature(
        self,
        signature: bytes,
        level: SecurityLevel
    ) -> bool:
        """
        Derive an encryption key from a wallet signature.

        Args:
            signature: The wallet signature bytes
            level: Security level (1, 2, or 3)

        Returns:
            True if key derivation succeeded
        """
        try:
            key = KeyDerivation.derive_key(signature, level)
            self._keys[level] = key
            self._decryptors[level] = AESDecryptor(key)
            return True
        except Exception as e:
            print(f"Key derivation failed: {e}")
            return False

    def derive_all_keys(
        self,
        signatures: Dict[SecurityLevel, bytes]
    ) -> bool:
        """
        Derive all 3 security level keys from signatures.

        Args:
            signatures: Dict mapping security levels to signature bytes

        Returns:
            True if all keys derived successfully
        """
        for level, signature in signatures.items():
            if not self.derive_key_from_signature(signature, level):
                return False
        return True

    def has_key(self, level: SecurityLevel) -> bool:
        """Check if a key has been derived for the given security level."""
        return level in self._keys

    @staticmethod
    def get_message_to_sign(level: SecurityLevel) -> str:
        """
        Get the message that needs to be signed to derive a key.

        The user must sign this exact message with their wallet.
        """
        return SECURITY_LEVEL_MESSAGES[level]

    @staticmethod
    def get_all_messages() -> Dict[SecurityLevel, str]:
        """Get all messages that need to be signed for full access."""
        return dict(SECURITY_LEVEL_MESSAGES)

    def recover_file(
        self,
        content_cid: str,
        proof_cid: str,
        security_level: SecurityLevel,
        storage_provider: str = "filebase",
        verify_commitment: bool = True
    ) -> RecoveryResult:
        """
        Recover an encrypted file.

        This is the main entry point for file recovery.

        Args:
            content_cid: IPFS CID of encrypted content
            proof_cid: Identifier of ZK proof containing critical bytes
            security_level: Security level used during encryption
            storage_provider: Storage provider name (filebase, pinata, etc.)
            verify_commitment: Whether to verify commitment (recommended)

        Returns:
            RecoveryResult with decrypted file data
        """
        start_time = time.time()
        download_time = 0
        decryption_time = 0

        # Check for required key
        if security_level not in self._decryptors:
            return RecoveryResult(
                success=False,
                data=b"",
                file_name="",
                file_type="",
                file_size=0,
                verified=False,
                commitment_valid=False,
                download_time_ms=0,
                decryption_time_ms=0,
                error=f"No key derived for security level {security_level}. "
                      f"Call derive_key_from_signature() first."
            )

        decryptor = self._decryptors[security_level]

        try:
            # Step 1: Download encrypted content from IPFS
            print(f"[1/4] Downloading encrypted content from IPFS...")
            content_result = self.storage.download_encrypted_content(
                content_cid, storage_provider
            )

            if not content_result.success:
                return RecoveryResult(
                    success=False,
                    data=b"",
                    file_name="",
                    file_type="",
                    file_size=0,
                    verified=False,
                    commitment_valid=False,
                    download_time_ms=content_result.download_time_ms,
                    decryption_time_ms=0,
                    error=f"Failed to download content: {content_result.error}"
                )

            download_time = content_result.download_time_ms
            print(f"    Downloaded {len(content_result.data)} bytes from {content_result.provider}")

            # Step 2: Download ZK proof from R2
            print(f"[2/4] Downloading ZK proof from R2...")
            proof_success, proof, proof_error = self.storage.download_proof(proof_cid)

            if not proof_success or proof is None:
                return RecoveryResult(
                    success=False,
                    data=b"",
                    file_name="",
                    file_type="",
                    file_size=0,
                    verified=False,
                    commitment_valid=False,
                    download_time_ms=download_time,
                    decryption_time_ms=0,
                    error=f"Failed to download proof: {proof_error}"
                )

            print(f"    Proof downloaded, commitment: {proof.commitment[:16]}...")

            # Step 3: Decrypt critical bytes
            print(f"[3/4] Decrypting critical bytes...")
            decrypt_start = time.time()

            critical_bytes = decryptor.decrypt_critical_bytes(
                proof.encrypted_critical_bytes,
                proof.encryption_iv
            )

            print(f"    Critical bytes decrypted: {len(critical_bytes)} bytes")

            # Step 4: Decrypt file
            print(f"[4/4] Reconstructing and decrypting file...")

            # Get the file IV from the proof
            file_iv = base64_decode(proof.encrypted_iv)

            decrypted_data, verified, commitment_valid = decryptor.decrypt_file(
                encrypted_content=content_result.data,
                critical_bytes=critical_bytes,
                iv=file_iv,
                commitment=proof.commitment
            )

            decryption_time = int((time.time() - decrypt_start) * 1000)

            print(f"    File decrypted: {len(decrypted_data)} bytes")
            print(f"    Commitment valid: {commitment_valid}")

            return RecoveryResult(
                success=True,
                data=decrypted_data,
                file_name="recovered_file",  # Metadata would provide actual name
                file_type="application/octet-stream",
                file_size=len(decrypted_data),
                verified=verified,
                commitment_valid=commitment_valid,
                download_time_ms=download_time,
                decryption_time_ms=decryption_time
            )

        except ValueError as e:
            # Commitment verification failed
            return RecoveryResult(
                success=False,
                data=b"",
                file_name="",
                file_type="",
                file_size=0,
                verified=False,
                commitment_valid=False,
                download_time_ms=download_time,
                decryption_time_ms=decryption_time,
                error=str(e)
            )

        except Exception as e:
            total_time = int((time.time() - start_time) * 1000)
            return RecoveryResult(
                success=False,
                data=b"",
                file_name="",
                file_type="",
                file_size=0,
                verified=False,
                commitment_valid=False,
                download_time_ms=download_time,
                decryption_time_ms=decryption_time,
                error=f"Recovery failed: {str(e)}"
            )

    def verify_on_chain(
        self,
        vault_owner: str,
        file_id: str,
        expected_commitment: str,
        network: str = "devnet",
        program_id: Optional[str] = None
    ) -> Optional["VerificationResult"]:
        """
        Verify file commitment on Solana blockchain.

        This is optional but recommended for high-value files.
        Requires: pip install blockdrive-recovery[solana]

        Args:
            vault_owner: Owner's wallet address
            file_id: File UUID (hex string)
            expected_commitment: Expected SHA-256 hash of critical bytes
            network: Solana network (mainnet, devnet, localnet)
            program_id: Custom program ID (optional)

        Returns:
            VerificationResult if Solana is available, None otherwise
        """
        if not SOLANA_AVAILABLE:
            print("Warning: Solana verification not available. "
                  "Install with: pip install blockdrive-recovery[solana]")
            return None

        try:
            verifier = SolanaVerifier(network=network, program_id=program_id)
            return verifier.verify_file_commitment(
                vault_owner, file_id, expected_commitment
            )
        except Exception as e:
            print(f"Solana verification error: {e}")
            return None

    def recover_with_verification(
        self,
        content_cid: str,
        proof_cid: str,
        security_level: SecurityLevel,
        vault_owner: str,
        file_id: str,
        storage_provider: str = "filebase",
        network: str = "devnet",
        program_id: Optional[str] = None
    ) -> RecoveryResult:
        """
        Recover a file with on-chain verification.

        This method verifies the file's commitment on Solana before
        downloading and decrypting, providing cryptographic proof
        of file authenticity.

        Args:
            content_cid: IPFS CID of encrypted content
            proof_cid: Proof identifier from R2
            security_level: Security level used during encryption
            vault_owner: Owner's wallet address (for on-chain lookup)
            file_id: File UUID (for on-chain lookup)
            storage_provider: Storage provider name
            network: Solana network
            program_id: Custom program ID

        Returns:
            RecoveryResult with verification status
        """
        # Step 1: Download proof first to get commitment
        print(f"[1/5] Downloading proof to verify commitment...")
        proof_success, proof, proof_error = self.storage.download_proof(proof_cid)

        if not proof_success or proof is None:
            return RecoveryResult(
                success=False,
                data=b"",
                file_name="",
                file_type="",
                file_size=0,
                verified=False,
                commitment_valid=False,
                download_time_ms=0,
                decryption_time_ms=0,
                error=f"Failed to download proof: {proof_error}"
            )

        # Step 2: Verify on-chain if Solana is available
        if SOLANA_AVAILABLE:
            print(f"[2/5] Verifying commitment on Solana ({network})...")
            verification = self.verify_on_chain(
                vault_owner, file_id, proof.commitment, network, program_id
            )

            if verification and not verification.verified:
                error_msg = "On-chain verification failed"
                if not verification.on_chain:
                    error_msg = "File not found on-chain"
                elif not verification.commitment_matches:
                    error_msg = "Commitment mismatch - file may be tampered"

                return RecoveryResult(
                    success=False,
                    data=b"",
                    file_name="",
                    file_type="",
                    file_size=0,
                    verified=False,
                    commitment_valid=False,
                    download_time_ms=0,
                    decryption_time_ms=0,
                    error=error_msg
                )

            if verification:
                print(f"    ✓ On-chain verification passed")
        else:
            print(f"[2/5] Skipping on-chain verification (Solana not installed)")

        # Step 3-5: Continue with normal recovery
        return self.recover_file(
            content_cid=content_cid,
            proof_cid=proof_cid,
            security_level=security_level,
            storage_provider=storage_provider,
            verify_commitment=True
        )

    def recover_with_metadata(
        self,
        content_cid: str,
        proof_cid: str,
        metadata_cid: str,
        security_level: SecurityLevel,
        storage_provider: str = "filebase"
    ) -> RecoveryResult:
        """
        Recover a file and its metadata.

        Args:
            content_cid: IPFS CID of encrypted content
            proof_cid: Identifier of ZK proof
            metadata_cid: IPFS CID of encrypted metadata
            security_level: Security level used during encryption
            storage_provider: Storage provider name

        Returns:
            RecoveryResult with decrypted file and metadata
        """
        # First recover the file
        result = self.recover_file(
            content_cid, proof_cid, security_level, storage_provider
        )

        if not result.success:
            return result

        # Then try to recover metadata
        decryptor = self._decryptors[security_level]

        try:
            metadata_result = self.storage.download_encrypted_content(
                metadata_cid, storage_provider
            )

            if metadata_result.success:
                import json
                metadata_json = json.loads(metadata_result.data.decode())
                metadata = decryptor.decrypt_metadata(
                    metadata_json["encryptedMetadata"],
                    metadata_json["metadataIv"]
                )

                # Update result with metadata
                return RecoveryResult(
                    success=True,
                    data=result.data,
                    file_name=metadata.file_name,
                    file_type=metadata.file_type,
                    file_size=metadata.file_size,
                    verified=result.verified,
                    commitment_valid=result.commitment_valid,
                    download_time_ms=result.download_time_ms,
                    decryption_time_ms=result.decryption_time_ms
                )

        except Exception as e:
            print(f"Warning: Could not recover metadata: {e}")

        return result
