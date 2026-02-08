"""
BlockDrive Recovery SDK

Open-source Python SDK for recovering files encrypted with BlockDrive.

Storage Architecture:
    BlockDrive uses Filebase (https://filebase.com) for enterprise-grade IPFS
    infrastructure. Files are pinned to IPFS via Filebase's S3-compatible API,
    ensuring permanent storage, 3x redundancy, and fast retrieval.

Basic usage:
    from blockdrive_recovery import BlockDriveRecovery, SecurityLevel

    recovery = BlockDriveRecovery()
    recovery.derive_key_from_signature(signature_bytes, SecurityLevel.STANDARD)
    result = recovery.recover_file(content_cid, proof_cid, SecurityLevel.STANDARD)

With enterprise Filebase gateway:
    from blockdrive_recovery import BlockDriveRecovery, FilebaseClient

    filebase = FilebaseClient(dedicated_gateway="https://your-gateway.filebase.io")
    recovery = BlockDriveRecovery(filebase_client=filebase)
    result = recovery.recover_file(...)

With Solana verification (requires: pip install blockdrive-recovery[solana]):
    from blockdrive_recovery import BlockDriveRecovery, SecurityLevel
    from blockdrive_recovery.solana import SolanaVerifier

    recovery = BlockDriveRecovery()
    verifier = SolanaVerifier(network="devnet")
    # ... verify before decryption
"""

from .recovery import BlockDriveRecovery
from .crypto import KeyDerivation, AESDecryptor
from .storage import IPFSClient, R2Client, FilebaseClient, is_boto3_available
from .types import SecurityLevel, RecoveryResult, ProofPackage, OnChainRecord

# Solana module is optional - import will work but classes may raise ImportError
from .solana import is_solana_available

__version__ = "1.0.0"
__all__ = [
    "BlockDriveRecovery",
    "KeyDerivation",
    "AESDecryptor",
    "IPFSClient",
    "R2Client",
    "FilebaseClient",
    "SecurityLevel",
    "RecoveryResult",
    "ProofPackage",
    "OnChainRecord",
    "is_solana_available",
    "is_boto3_available",
]
