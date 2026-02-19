"""
BlockDrive Recovery SDK — Key Derivation

Derives AES-256 encryption keys from wallet signatures using HKDF.
Must match src/services/crypto/keyDerivationService.ts exactly.
"""

import hashlib
from enum import IntEnum
from typing import Dict

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


class SecurityLevel(IntEnum):
    """Security levels for file encryption (matches TypeScript enum)."""
    STANDARD = 1
    SENSITIVE = 2
    MAXIMUM = 3


# Salt for HKDF — unique to BlockDrive
# Must match: const HKDF_SALT = stringToBytes('BlockDrive-HKDF-Salt-v1')
HKDF_SALT = b"BlockDrive-HKDF-Salt-v1"

# HKDF info strings for context separation
# Must match: const HKDF_INFO = { [level]: stringToBytes('blockdrive-level-{n}-encryption') }
HKDF_INFO: Dict[SecurityLevel, bytes] = {
    SecurityLevel.STANDARD: b"blockdrive-level-1-encryption",
    SecurityLevel.SENSITIVE: b"blockdrive-level-2-encryption",
    SecurityLevel.MAXIMUM: b"blockdrive-level-3-encryption",
}

# Messages the user signs with their wallet to produce key material
# Must match: SECURITY_LEVEL_MESSAGES in src/types/blockdriveCrypto.ts
SECURITY_MESSAGES: Dict[SecurityLevel, str] = {
    SecurityLevel.STANDARD: "BlockDrive Security Level One - Standard Protection",
    SecurityLevel.SENSITIVE: "BlockDrive Security Level Two - Sensitive Data Protection",
    SecurityLevel.MAXIMUM: "BlockDrive Security Level Three - Maximum Security",
}


class BlockDriveWallet:
    """
    Derives AES-256-GCM encryption keys from wallet signatures.

    Usage:
        wallet = BlockDriveWallet()

        # Sign the message for each security level with your Ed25519 wallet
        msg = BlockDriveWallet.get_sign_message(SecurityLevel.STANDARD)
        signature = my_wallet.sign(msg.encode())  # 64-byte Ed25519 signature

        key = wallet.derive_key(signature, SecurityLevel.STANDARD)
    """

    @staticmethod
    def derive_key(signature: bytes, level: SecurityLevel) -> bytes:
        """
        Derive a 32-byte AES-256 key from wallet signature using HKDF-SHA256.

        This exactly replicates the Web Crypto HKDF operation in
        keyDerivationService.ts::deriveKeyFromMaterial().

        Args:
            signature: Ed25519 signature bytes (typically 64 bytes)
                       or raw key material (32+ bytes).
            level: Security level for HKDF context separation.

        Returns:
            32-byte AES-256 key.

        Raises:
            KeyError: If level is not a valid SecurityLevel.
        """
        if level not in HKDF_INFO:
            raise KeyError(f"Unknown security level: {level}")
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=HKDF_SALT,
            info=HKDF_INFO[level],
        )
        return hkdf.derive(signature)

    @staticmethod
    def derive_all_keys(
        signatures: Dict[SecurityLevel, bytes],
    ) -> Dict[SecurityLevel, bytes]:
        """
        Derive AES-256 keys for all provided security levels.

        Args:
            signatures: Mapping of security level to signature bytes.

        Returns:
            Mapping of security level to 32-byte AES key.
        """
        return {
            level: BlockDriveWallet.derive_key(sig, level)
            for level, sig in signatures.items()
        }

    @staticmethod
    def generate_key_hash(signature: bytes, level: SecurityLevel) -> str:
        """
        Generate a verification hash of the derived key material.

        Matches keyDerivationService.ts::generateKeyHash().
        """
        hash_input = signature + f"-level-{int(level)}-hash".encode()
        return hashlib.sha256(hash_input).hexdigest()

    @staticmethod
    def get_sign_message(level: SecurityLevel) -> str:
        """Get the message a user must sign to derive a key for this level.

        Raises:
            KeyError: If level is not a valid SecurityLevel.
        """
        if level not in SECURITY_MESSAGES:
            raise KeyError(f"Unknown security level: {level}")
        return SECURITY_MESSAGES[level]

    @staticmethod
    def get_all_sign_messages() -> Dict[SecurityLevel, str]:
        """Get all sign messages for all security levels."""
        return dict(SECURITY_MESSAGES)
