"""
BlockDrive Recovery SDK — Cryptography Module

AES-256-GCM decryption and ZK proof verification.
Must match src/services/crypto/zkProofService.ts and aesEncryptionService.ts exactly.

Compatibility notes (matching TypeScript Web Crypto API behavior):
  - AES-GCM: 12-byte IV, 128-bit auth tag appended to ciphertext, no AAD
  - Base64: standard RFC 4648 (not URL-safe)
  - Commitments: SHA-256 hex, lowercase, 64 chars
  - Proof hash: JSON.stringify with no whitespace, keys in exact insertion order
"""

import hashlib
import base64
import json
from typing import Tuple, Any, Dict, Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Layout constants (must match TypeScript)
CRITICAL_BYTES_LENGTH = 16
FILE_IV_LENGTH = 12


class BlockDriveCrypto:
    """
    AES-256-GCM decryption and ZK proof operations for BlockDrive recovery.

    Implements the "Programmed Incompleteness" decryption flow:
      1. Verify proof hash integrity
      2. Decrypt proof payload → critical_bytes[16] + file_iv[12]
      3. Verify commitment (SHA-256 of critical bytes)
      4. Reconstruct full ciphertext = critical_bytes + stored_encrypted_content
      5. AES-256-GCM decrypt with file_iv → plaintext
    """

    def __init__(self, key: bytes):
        """
        Args:
            key: 32-byte AES-256 key (from BlockDriveWallet.derive_key).
        """
        if len(key) != 32:
            raise ValueError(f"Key must be 32 bytes for AES-256, got {len(key)}")
        self._aesgcm = AESGCM(key)

    # ------------------------------------------------------------------
    # ZK proof verification & extraction
    # ------------------------------------------------------------------

    def verify_and_decrypt_proof(
        self,
        proof_json: Dict[str, Any],
    ) -> Tuple[bytes, bytes]:
        """
        Verify a ZK proof package and extract critical bytes + file IV.

        Matches zkProofService.ts::verifyAndExtract() exactly:
          1. Verify proof hash integrity
          2. Decrypt encryptedCriticalBytes payload with encryptionIv
          3. Split payload → critical_bytes[16] + file_iv[12]
          4. Verify commitment matches SHA-256(critical_bytes)

        Args:
            proof_json: Parsed ZK proof package (v1 or v2 format).

        Returns:
            (critical_bytes, file_iv) tuple.

        Raises:
            ValueError: If integrity check, decryption, or commitment fails.
        """
        version = proof_json.get("version", 1)

        # Step 1: Verify proof hash
        computed_hash = self._compute_proof_hash(proof_json)
        if computed_hash != proof_json["proofHash"]:
            raise ValueError(
                "Proof integrity verification failed — data may be tampered"
            )

        # Step 2: Decrypt the payload
        encrypted_data = base64.b64decode(proof_json["encryptedCriticalBytes"])
        encryption_iv = base64.b64decode(proof_json["encryptionIv"])

        try:
            payload = self._aesgcm.decrypt(encryption_iv, encrypted_data, None)
        except Exception as exc:
            raise ValueError(
                "Failed to decrypt proof — wrong key or corrupted data"
            ) from exc

        # Step 3: Split payload
        if len(payload) < CRITICAL_BYTES_LENGTH + FILE_IV_LENGTH:
            raise ValueError(
                f"Decrypted payload too short: {len(payload)} bytes, "
                f"expected >= {CRITICAL_BYTES_LENGTH + FILE_IV_LENGTH}"
            )

        critical_bytes = bytes(payload[:CRITICAL_BYTES_LENGTH])
        file_iv = bytes(payload[CRITICAL_BYTES_LENGTH:CRITICAL_BYTES_LENGTH + FILE_IV_LENGTH])

        # Step 4: Verify commitment
        commitment = proof_json["commitment"]
        actual_commitment = hashlib.sha256(critical_bytes).hexdigest()
        if actual_commitment != commitment:
            raise ValueError(
                f"Commitment mismatch — extracted bytes do not match. "
                f"Expected {commitment}, got {actual_commitment}"
            )

        return critical_bytes, file_iv

    def decrypt_file(
        self,
        encrypted_content: bytes,
        critical_bytes: bytes,
        file_iv: bytes,
        commitment: str,
        expected_hash: Optional[str] = None,
    ) -> bytes:
        """
        Decrypt a file by reconstructing it with critical bytes.

        Matches blockDriveCryptoService.ts::decryptFileWithCriticalBytes():
          1. Verify commitment = SHA-256(critical_bytes)
          2. full_ciphertext = critical_bytes + encrypted_content
          3. AES-256-GCM decrypt(full_ciphertext, file_iv)

        Args:
            encrypted_content: Encrypted file WITHOUT the first 16 bytes.
            critical_bytes: The 16 critical bytes from the ZK proof.
            file_iv: 12-byte IV used during file encryption.
            commitment: Expected SHA-256 hex of critical_bytes.
            expected_hash: Optional SHA-256 hex of original plaintext for integrity.

        Returns:
            Decrypted file bytes.

        Raises:
            ValueError: If commitment or content hash verification fails.
        """
        # Step 1: Verify commitment
        actual_commitment = hashlib.sha256(critical_bytes).hexdigest()
        if actual_commitment != commitment:
            raise ValueError(
                "Commitment verification failed — data may be tampered. "
                f"Expected: {commitment}, Got: {actual_commitment}"
            )

        # Step 2: Reconstruct full ciphertext
        full_encrypted = critical_bytes + encrypted_content

        # Step 3: Decrypt
        decrypted = self._aesgcm.decrypt(file_iv, full_encrypted, None)

        # Step 4: Verify content hash if provided
        if expected_hash:
            actual_hash = hashlib.sha256(decrypted).hexdigest()
            if actual_hash != expected_hash:
                raise ValueError(
                    "Content hash verification failed — "
                    f"Expected: {expected_hash}, Got: {actual_hash}"
                )

        return bytes(decrypted)

    # ------------------------------------------------------------------
    # Proof hash computation
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_proof_hash(proof: Dict[str, Any]) -> str:
        """
        Compute the proof hash for integrity verification.

        Must produce the exact same output as zkProofService.ts::buildProofHashContent()
        followed by sha256(new TextEncoder().encode(content)).

        Key ordering and JSON serialization must match JS JSON.stringify exactly:
          - No whitespace (separators=(',', ':'))
          - Keys in insertion order
          - null for None values
        """
        version = proof.get("version", 1)

        if version == 2:
            hash_content = {
                "commitment": proof["commitment"],
                "groth16Proof": proof.get("groth16Proof"),
                "publicSignals": proof.get("publicSignals", []),
                "encryptedCriticalBytes": proof["encryptedCriticalBytes"],
                "proofTimestamp": proof["proofTimestamp"],
            }
        else:
            # V1 legacy format
            hash_content = {
                "commitment": proof["commitment"],
                "encryptedCriticalBytes": proof["encryptedCriticalBytes"],
                "proofTimestamp": proof["proofTimestamp"],
            }

        # JSON.stringify uses no whitespace and preserves key order
        json_str = json.dumps(hash_content, separators=(",", ":"), ensure_ascii=False)
        return hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    @staticmethod
    def verify_proof_integrity(proof: Dict[str, Any]) -> bool:
        """Check proof hash without decrypting."""
        try:
            computed = BlockDriveCrypto._compute_proof_hash(proof)
            return computed == proof.get("proofHash", "")
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Standalone helpers
    # ------------------------------------------------------------------

    @staticmethod
    def verify_commitment(critical_bytes: bytes, expected_commitment: str) -> bool:
        """Verify that critical bytes match a commitment hash."""
        return hashlib.sha256(critical_bytes).hexdigest() == expected_commitment.lower()

    @staticmethod
    def sha256_hex(data: bytes) -> str:
        """SHA-256 hash as lowercase hex string."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def b64decode(data: str) -> bytes:
        """Decode standard Base64 (RFC 4648)."""
        return base64.b64decode(data)

    @staticmethod
    def b64encode(data: bytes) -> str:
        """Encode to standard Base64 (RFC 4648)."""
        return base64.b64encode(data).decode("ascii")
