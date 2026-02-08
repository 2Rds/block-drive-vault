"""
BlockDrive Recovery SDK - Type Definitions

Defines data structures matching the BlockDrive TypeScript implementation.
"""

from dataclasses import dataclass
from enum import IntEnum
from typing import Optional, Dict, Any


class SecurityLevel(IntEnum):
    """Security levels for file encryption."""
    STANDARD = 1   # Level 1 - Basic encryption
    SENSITIVE = 2  # Level 2 - Enhanced protection
    MAXIMUM = 3    # Level 3 - Maximum security


# Messages to sign for deriving encryption keys
# MUST match the TypeScript SECURITY_LEVEL_MESSAGES exactly
SECURITY_LEVEL_MESSAGES: Dict[SecurityLevel, str] = {
    SecurityLevel.STANDARD: "BlockDrive Security Level One - Standard Protection",
    SecurityLevel.SENSITIVE: "BlockDrive Security Level Two - Sensitive Data Protection",
    SecurityLevel.MAXIMUM: "BlockDrive Security Level Three - Maximum Security",
}

# HKDF salt - MUST match TypeScript HKDF_SALT
HKDF_SALT = b"BlockDrive-HKDF-Salt-v1"

# HKDF info strings for context separation - MUST match TypeScript
HKDF_INFO: Dict[SecurityLevel, bytes] = {
    SecurityLevel.STANDARD: b"blockdrive-level-1-encryption",
    SecurityLevel.SENSITIVE: b"blockdrive-level-2-encryption",
    SecurityLevel.MAXIMUM: b"blockdrive-level-3-encryption",
}

# Critical bytes length (first 16 bytes extracted during encryption)
CRITICAL_BYTES_LENGTH = 16


@dataclass
class ProofPackage:
    """
    ZK Proof package containing critical bytes and metadata.
    Downloaded from Cloudflare R2.
    """
    commitment: str                    # SHA-256 hash of critical bytes
    encrypted_critical_bytes: str      # Base64-encoded encrypted critical bytes
    encryption_iv: str                 # IV used to encrypt critical bytes
    encrypted_iv: str                  # IV used for file encryption (Base64)
    security_level: SecurityLevel
    timestamp: int
    version: str = "1.0"


@dataclass
class RecoveryResult:
    """Result of a file recovery operation."""
    success: bool
    data: bytes
    file_name: str
    file_type: str
    file_size: int
    verified: bool                     # Content hash verified
    commitment_valid: bool             # Commitment matched critical bytes
    download_time_ms: int
    decryption_time_ms: int
    error: Optional[str] = None


@dataclass
class FileMetadata:
    """Decrypted file metadata."""
    file_name: str
    file_type: str
    file_size: int
    uploaded_at: int
    security_level: SecurityLevel
    content_hash: str


@dataclass
class OnChainRecord:
    """File record from Solana blockchain."""
    file_id: str
    primary_cid: str
    proof_cid: str
    encryption_commitment: str
    critical_bytes_commitment: str
    security_level: SecurityLevel
    owner: str
    created_at: int
    is_shared: bool
    delegation_count: int
