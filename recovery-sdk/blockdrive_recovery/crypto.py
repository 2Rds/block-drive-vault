"""
BlockDrive Recovery SDK - Cryptography Module

Implements key derivation and AES-256-GCM decryption matching
the BlockDrive TypeScript implementation.
"""

import hashlib
import base64
import json
from typing import Tuple, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

from .types import (
    SecurityLevel,
    HKDF_SALT,
    HKDF_INFO,
    CRITICAL_BYTES_LENGTH,
    FileMetadata,
)


class KeyDerivation:
    """
    Derives AES-256-GCM encryption keys from wallet signatures using HKDF.

    This matches the TypeScript keyDerivationService.ts implementation.
    """

    @staticmethod
    def derive_key(signature: bytes, level: SecurityLevel) -> bytes:
        """
        Derive an AES-256 key from a wallet signature using HKDF.

        Args:
            signature: The wallet signature bytes
            level: Security level for context separation

        Returns:
            32-byte AES-256 key
        """
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits for AES-256
            salt=HKDF_SALT,
            info=HKDF_INFO[level],
            backend=default_backend()
        )
        return hkdf.derive(signature)

    @staticmethod
    def generate_key_hash(signature: bytes, level: SecurityLevel) -> str:
        """
        Generate a hash of the key for verification purposes.
        This can be compared without exposing the actual key.
        """
        hash_input = signature + f"-level-{level}-hash".encode()
        return hashlib.sha256(hash_input).hexdigest()

    @staticmethod
    def get_signature_message(level: SecurityLevel) -> str:
        """Get the message to sign for a specific security level."""
        from .types import SECURITY_LEVEL_MESSAGES
        return SECURITY_LEVEL_MESSAGES[level]


class AESDecryptor:
    """
    AES-256-GCM decryption for BlockDrive files.

    Implements the "Programmed Incompleteness" decryption flow:
    1. Decrypt critical bytes from proof
    2. Verify commitment
    3. Reconstruct full encrypted content
    4. Decrypt with AES-256-GCM
    """

    def __init__(self, key: bytes):
        """
        Initialize decryptor with an AES-256 key.

        Args:
            key: 32-byte AES-256 key (from KeyDerivation.derive_key)
        """
        if len(key) != 32:
            raise ValueError("Key must be 32 bytes for AES-256")
        self.aesgcm = AESGCM(key)
        self._key = key

    def decrypt_critical_bytes(
        self,
        encrypted_data: str,
        iv: str
    ) -> bytes:
        """
        Decrypt the critical bytes from the ZK proof.

        Args:
            encrypted_data: Base64-encoded encrypted JSON containing bytes
            iv: Base64-encoded initialization vector

        Returns:
            16 critical bytes
        """
        encrypted_bytes = base64.b64decode(encrypted_data)
        iv_bytes = base64.b64decode(iv)

        # Decrypt the JSON wrapper
        decrypted_json = self.aesgcm.decrypt(iv_bytes, encrypted_bytes, None)
        data = json.loads(decrypted_json.decode())

        # Extract the base64-encoded bytes
        return base64.b64decode(data["bytes"])

    def decrypt_file(
        self,
        encrypted_content: bytes,
        critical_bytes: bytes,
        iv: bytes,
        commitment: str,
        expected_hash: Optional[str] = None
    ) -> Tuple[bytes, bool, bool]:
        """
        Decrypt a file by reconstructing it with critical bytes.

        Args:
            encrypted_content: Encrypted file WITHOUT critical bytes
            critical_bytes: The 16 critical bytes from ZK proof
            iv: Initialization vector used during encryption
            commitment: Expected SHA-256 hash of critical bytes
            expected_hash: Optional content hash for verification

        Returns:
            Tuple of (decrypted_data, verified, commitment_valid)

        Raises:
            ValueError: If commitment verification fails
        """
        # Step 1: Verify commitment
        actual_commitment = hashlib.sha256(critical_bytes).hexdigest()
        commitment_valid = actual_commitment == commitment

        if not commitment_valid:
            raise ValueError(
                "Commitment verification failed - data may be tampered. "
                f"Expected: {commitment}, Got: {actual_commitment}"
            )

        # Step 2: Reconstruct full encrypted file
        full_encrypted = critical_bytes + encrypted_content

        # Step 3: Decrypt with AES-256-GCM
        decrypted = self.aesgcm.decrypt(iv, full_encrypted, None)

        # Step 4: Verify content hash if provided
        verified = True
        if expected_hash:
            actual_hash = hashlib.sha256(decrypted).hexdigest()
            verified = actual_hash == expected_hash

        return decrypted, verified, commitment_valid

    def decrypt_metadata(
        self,
        encrypted_metadata: str,
        metadata_iv: str
    ) -> FileMetadata:
        """
        Decrypt file metadata.

        Args:
            encrypted_metadata: Base64-encoded encrypted metadata JSON
            metadata_iv: Base64-encoded IV

        Returns:
            FileMetadata object
        """
        encrypted_bytes = base64.b64decode(encrypted_metadata)
        iv_bytes = base64.b64decode(metadata_iv)

        decrypted_json = self.aesgcm.decrypt(iv_bytes, encrypted_bytes, None)
        data = json.loads(decrypted_json.decode())

        return FileMetadata(
            file_name=data.get("fileName", "unknown"),
            file_type=data.get("fileType", "application/octet-stream"),
            file_size=data.get("fileSize", 0),
            uploaded_at=data.get("uploadedAt", 0),
            security_level=SecurityLevel(data.get("securityLevel", 1)),
            content_hash=data.get("contentHash", "")
        )


def sha256_hex(data: bytes) -> str:
    """Compute SHA-256 hash and return as hex string."""
    return hashlib.sha256(data).hexdigest()


def base64_decode(data: str) -> bytes:
    """Decode base64 string to bytes."""
    return base64.b64decode(data)


def base64_encode(data: bytes) -> str:
    """Encode bytes to base64 string."""
    return base64.b64encode(data).decode()
