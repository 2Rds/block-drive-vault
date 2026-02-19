"""
BlockDrive Recovery SDK

Open-source Python SDK for recovering files encrypted with BlockDrive.
Works independently of the BlockDrive platform — users can recover files
even if BlockDrive ceases to exist.

Quick start:
    from blockdrive import BlockDriveRecovery, SecurityLevel

    recovery = BlockDriveRecovery(
        signatures={SecurityLevel.STANDARD: my_signature_bytes},
    )
    result = recovery.recover_file(
        content_cid="bafybeig...",
        proof_cid="proof-abc123",
        security_level=SecurityLevel.STANDARD,
    )
    with open("recovered.pdf", "wb") as f:
        f.write(result.data)
"""

from .wallet import BlockDriveWallet, SecurityLevel
from .crypto import BlockDriveCrypto
from .storage import BlockDriveStorage
from .recovery import BlockDriveRecovery, RecoveryResult

__version__ = "1.0.0"
__all__ = [
    "BlockDriveRecovery",
    "BlockDriveWallet",
    "BlockDriveCrypto",
    "BlockDriveStorage",
    "SecurityLevel",
    "RecoveryResult",
]
