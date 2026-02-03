"""
BlockDrive Recovery SDK - Storage Module

Handles fetching content from IPFS/Filebase and Cloudflare R2.

BlockDrive uses Filebase (https://filebase.com) as the primary enterprise-grade
IPFS infrastructure provider. Files are pinned to IPFS via Filebase's S3-compatible
API, ensuring permanent storage and fast retrieval.

Storage Architecture:
- Encrypted content: Stored on IPFS via Filebase (enterprise pinning)
- Critical bytes + ZK proofs: Stored on Cloudflare R2 (edge storage)
- Commitments: Stored on Solana blockchain (verification)

Filebase Bucket Hierarchy:
    blockdrive-ipfs/
    ├── personal/{userId}/{timestamp}-{filename}           # Individual users
    └── orgs/{teamId}/
        ├── shared/{timestamp}-{filename}                  # Team shared files
        └── members/{userId}/{timestamp}-{filename}        # Member files in org

For recovery, the SDK supports:
1. Filebase dedicated gateway (enterprise users with custom domains)
2. Public Filebase IPFS gateway (default)
3. Fallback to other public gateways (redundancy)
4. Direct S3 API access with Filebase credentials (optional)
"""

import json
import time
import hashlib
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
import requests

from .types import ProofPackage, SecurityLevel

# Optional: boto3 for direct Filebase S3 API access
try:
    import boto3
    from botocore.config import Config
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False


@dataclass
class DownloadResult:
    """Result of a download operation."""
    success: bool
    data: bytes
    provider: str
    download_time_ms: int
    error: Optional[str] = None


class FilebaseClient:
    """
    Enterprise client for Filebase IPFS infrastructure.

    Filebase provides S3-compatible API for IPFS with:
    - Automatic pinning and persistence
    - Dedicated gateways for enterprise users
    - Geographic redundancy (3x replication)
    - 99.9% SLA uptime
    - No egress fees for IPFS retrieval

    BlockDrive uses Filebase as the primary storage provider for all
    encrypted file content, ensuring enterprise-grade reliability.

    Usage:
        # Public gateway (no credentials needed)
        client = FilebaseClient()
        result = client.download_by_cid("bafybeig...")

        # Dedicated gateway (enterprise)
        client = FilebaseClient(
            dedicated_gateway="https://your-gateway.filebase.io"
        )

        # With S3 credentials (for direct API access)
        client = FilebaseClient(
            access_key="your-access-key",
            secret_key="your-secret-key",
            bucket="your-bucket"
        )
    """

    # Filebase S3 endpoint
    S3_ENDPOINT = "https://s3.filebase.com"

    # Default public gateway
    PUBLIC_GATEWAY = "https://ipfs.filebase.io/ipfs/"

    def __init__(
        self,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket: Optional[str] = None,
        dedicated_gateway: Optional[str] = None,
        timeout: int = 60
    ):
        """
        Initialize Filebase client.

        Args:
            access_key: Filebase S3 access key (optional, for S3 API)
            secret_key: Filebase S3 secret key (optional, for S3 API)
            bucket: Filebase bucket name (optional, for S3 API)
            dedicated_gateway: Custom dedicated gateway URL (enterprise)
            timeout: Request timeout in seconds
        """
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket = bucket
        self.timeout = timeout

        # Use dedicated gateway if provided, otherwise public
        self.gateway = dedicated_gateway or self.PUBLIC_GATEWAY
        if not self.gateway.endswith("/"):
            self.gateway += "/"

        # Initialize S3 client if credentials provided
        self._s3_client = None
        if access_key and secret_key and BOTO3_AVAILABLE:
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=self.S3_ENDPOINT,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version="s3v4"),
                region_name="us-east-1"
            )

    def download_by_cid(self, cid: str) -> DownloadResult:
        """
        Download content from IPFS via Filebase gateway.

        This is the recommended method for recovery - uses IPFS CID
        which is content-addressed and verifiable.

        Args:
            cid: IPFS Content Identifier

        Returns:
            DownloadResult with content data
        """
        start_time = time.time()

        try:
            url = f"{self.gateway}{cid}"
            response = requests.get(url, timeout=self.timeout)

            if response.status_code == 200:
                elapsed_ms = int((time.time() - start_time) * 1000)
                return DownloadResult(
                    success=True,
                    data=response.content,
                    provider="filebase",
                    download_time_ms=elapsed_ms
                )

            return DownloadResult(
                success=False,
                data=b"",
                provider="filebase",
                download_time_ms=int((time.time() - start_time) * 1000),
                error=f"HTTP {response.status_code}"
            )

        except requests.RequestException as e:
            return DownloadResult(
                success=False,
                data=b"",
                provider="filebase",
                download_time_ms=int((time.time() - start_time) * 1000),
                error=str(e)
            )

    def download_by_key(self, object_key: str) -> DownloadResult:
        """
        Download content directly from Filebase S3 API by object key.

        This method requires credentials. Useful when you have the
        original object key used during upload.

        Args:
            object_key: S3 object key in Filebase bucket

        Returns:
            DownloadResult with content data
        """
        if not self._s3_client:
            return DownloadResult(
                success=False,
                data=b"",
                provider="filebase-s3",
                download_time_ms=0,
                error="S3 client not configured. Install boto3 and provide credentials."
            )

        if not self.bucket:
            return DownloadResult(
                success=False,
                data=b"",
                provider="filebase-s3",
                download_time_ms=0,
                error="Bucket not configured."
            )

        start_time = time.time()

        try:
            response = self._s3_client.get_object(Bucket=self.bucket, Key=object_key)
            data = response["Body"].read()

            return DownloadResult(
                success=True,
                data=data,
                provider="filebase-s3",
                download_time_ms=int((time.time() - start_time) * 1000)
            )

        except Exception as e:
            return DownloadResult(
                success=False,
                data=b"",
                provider="filebase-s3",
                download_time_ms=int((time.time() - start_time) * 1000),
                error=str(e)
            )

    def get_cid_from_key(self, object_key: str) -> Optional[str]:
        """
        Get the IPFS CID for an object stored in Filebase.

        Filebase automatically pins objects to IPFS and stores the
        CID in object metadata.

        Args:
            object_key: S3 object key

        Returns:
            CID if available, None otherwise
        """
        if not self._s3_client or not self.bucket:
            return None

        try:
            response = self._s3_client.head_object(Bucket=self.bucket, Key=object_key)
            return response.get("Metadata", {}).get("cid")
        except Exception:
            return None

    @staticmethod
    def build_object_key(
        user_id: str,
        filename: str,
        team_id: Optional[str] = None,
        is_shared: bool = False,
        folder_path: Optional[str] = None
    ) -> str:
        """
        Build a Filebase object key following BlockDrive's bucket hierarchy.

        Bucket Hierarchy:
            personal/{userId}/{folder}/{timestamp}-{filename}
            orgs/{teamId}/shared/{folder}/{timestamp}-{filename}
            orgs/{teamId}/members/{userId}/{folder}/{timestamp}-{filename}

        Args:
            user_id: User's unique identifier
            filename: Original filename
            team_id: Team/organization ID (if org storage)
            is_shared: Whether file is shared (only applies to org context)
            folder_path: Optional folder path within user/team space

        Returns:
            S3 object key string
        """
        import time

        # Sanitize filename
        sanitized = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
        sanitized = sanitized[:200]  # Limit length

        # Clean folder path
        folder_segment = ""
        if folder_path and folder_path not in ("/", ""):
            folder_segment = folder_path.strip("/").replace("//", "/")
            folder_segment = "".join(c if c.isalnum() or c in "._-/" else "_" for c in folder_segment)

        timestamp = int(time.time() * 1000)

        if team_id:
            if is_shared:
                prefix = f"orgs/{team_id}/shared"
            else:
                prefix = f"orgs/{team_id}/members/{user_id}"
        else:
            prefix = f"personal/{user_id}"

        if folder_segment:
            return f"{prefix}/{folder_segment}/{timestamp}-{sanitized}"
        return f"{prefix}/{timestamp}-{sanitized}"

    @staticmethod
    def parse_object_key(object_key: str) -> Dict[str, Any]:
        """
        Parse a Filebase object key to extract storage context.

        Args:
            object_key: S3 object key

        Returns:
            Dict with user_id, team_id (if org), is_shared, storage_context
        """
        import re

        # Personal: personal/{userId}/...
        personal_match = re.match(r"^personal/([^/]+)/", object_key)
        if personal_match:
            return {
                "user_id": personal_match.group(1),
                "team_id": None,
                "is_shared": False,
                "storage_context": "personal"
            }

        # Org shared: orgs/{teamId}/shared/...
        org_shared_match = re.match(r"^orgs/([^/]+)/shared/", object_key)
        if org_shared_match:
            return {
                "user_id": None,
                "team_id": org_shared_match.group(1),
                "is_shared": True,
                "storage_context": "organization"
            }

        # Org member: orgs/{teamId}/members/{userId}/...
        org_member_match = re.match(r"^orgs/([^/]+)/members/([^/]+)/", object_key)
        if org_member_match:
            return {
                "user_id": org_member_match.group(2),
                "team_id": org_member_match.group(1),
                "is_shared": False,
                "storage_context": "organization"
            }

        return {"error": "Unknown key format"}


class IPFSClient:
    """
    Client for fetching content from IPFS with multi-gateway support.

    Uses Filebase as the primary enterprise-grade provider with fallback
    to other public gateways for redundancy.

    Gateway Priority:
    1. Filebase (enterprise pinning, guaranteed availability)
    2. Cloudflare (fast CDN caching)
    3. Protocol Labs gateways (reference implementations)
    4. Pinata (popular alternative)
    """

    # IPFS gateways in priority order
    DEFAULT_GATEWAYS = [
        "https://ipfs.filebase.io/ipfs/",      # Filebase - primary, enterprise-grade
        "https://cloudflare-ipfs.com/ipfs/",   # Cloudflare - fast CDN caching
        "https://ipfs.io/ipfs/",               # Protocol Labs - reference gateway
        "https://dweb.link/ipfs/",             # Protocol Labs - alternative
        "https://gateway.pinata.cloud/ipfs/",  # Pinata - popular alternative
    ]

    def __init__(
        self,
        gateways: Optional[list] = None,
        filebase_gateway: Optional[str] = None,
        timeout: int = 60
    ):
        """
        Initialize IPFS client.

        Args:
            gateways: List of gateway URLs (uses defaults if not provided)
            filebase_gateway: Dedicated Filebase gateway URL (prepended to list)
            timeout: Request timeout in seconds
        """
        self.gateways = gateways or list(self.DEFAULT_GATEWAYS)
        self.timeout = timeout

        # If dedicated Filebase gateway provided, use it first
        if filebase_gateway:
            if not filebase_gateway.endswith("/"):
                filebase_gateway += "/"
            # Remove default Filebase gateway and add dedicated one first
            self.gateways = [g for g in self.gateways if "filebase.io" not in g]
            self.gateways.insert(0, filebase_gateway)

    def download(self, cid: str, preferred_gateway: Optional[str] = None) -> DownloadResult:
        """
        Download content from IPFS by CID.

        Tries the preferred gateway first, then falls back to others.

        Args:
            cid: IPFS Content Identifier
            preferred_gateway: Optional preferred gateway URL

        Returns:
            DownloadResult with content data
        """
        gateways = list(self.gateways)

        # Put preferred gateway first if specified
        if preferred_gateway:
            if preferred_gateway in gateways:
                gateways.remove(preferred_gateway)
            gateways.insert(0, preferred_gateway)

        last_error = None
        start_time = time.time()

        for gateway in gateways:
            try:
                url = f"{gateway.rstrip('/')}/{cid}"
                response = requests.get(url, timeout=self.timeout)

                if response.status_code == 200:
                    elapsed_ms = int((time.time() - start_time) * 1000)
                    return DownloadResult(
                        success=True,
                        data=response.content,
                        provider=gateway,
                        download_time_ms=elapsed_ms
                    )

                last_error = f"HTTP {response.status_code} from {gateway}"

            except requests.RequestException as e:
                last_error = f"Request failed for {gateway}: {str(e)}"
                continue

        elapsed_ms = int((time.time() - start_time) * 1000)
        return DownloadResult(
            success=False,
            data=b"",
            provider="",
            download_time_ms=elapsed_ms,
            error=last_error or "All gateways failed"
        )


class R2Client:
    """
    Client for fetching ZK proofs from Cloudflare R2.

    BlockDrive stores critical bytes in ZK proofs on R2 for
    the "Programmed Incompleteness" architecture.
    """

    # Default R2 endpoint for BlockDrive proofs
    DEFAULT_R2_URL = "https://blockdrive-proofs.r2.cloudflarestorage.com"

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize R2 client.

        Args:
            base_url: R2 bucket URL (uses default if not provided)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or self.DEFAULT_R2_URL
        self.timeout = timeout

    def download_proof(self, proof_cid: str) -> tuple[bool, Optional[ProofPackage], Optional[str]]:
        """
        Download and parse a ZK proof from R2.

        Args:
            proof_cid: The proof identifier/CID

        Returns:
            Tuple of (success, ProofPackage or None, error message or None)
        """
        try:
            url = f"{self.base_url.rstrip('/')}/{proof_cid}"
            response = requests.get(url, timeout=self.timeout)

            if response.status_code != 200:
                return False, None, f"HTTP {response.status_code}"

            data = response.json()

            # Verify proof integrity
            if "commitment" not in data or "encryptedCriticalBytes" not in data:
                return False, None, "Invalid proof structure"

            proof = ProofPackage(
                commitment=data["commitment"],
                encrypted_critical_bytes=data["encryptedCriticalBytes"],
                encryption_iv=data["encryptionIv"],
                encrypted_iv=data["encryptedIv"],
                security_level=SecurityLevel(data.get("securityLevel", 1)),
                timestamp=data.get("timestamp", 0),
                version=data.get("version", "1.0")
            )

            return True, proof, None

        except json.JSONDecodeError:
            return False, None, "Invalid JSON in proof"
        except requests.RequestException as e:
            return False, None, f"Request failed: {str(e)}"
        except Exception as e:
            return False, None, f"Unexpected error: {str(e)}"

    def verify_proof_integrity(self, proof: ProofPackage, critical_bytes: bytes) -> bool:
        """
        Verify that decrypted critical bytes match the commitment.

        Args:
            proof: The proof package
            critical_bytes: Decrypted critical bytes

        Returns:
            True if commitment matches
        """
        actual_commitment = hashlib.sha256(critical_bytes).hexdigest()
        return actual_commitment == proof.commitment


class StorageOrchestrator:
    """
    Orchestrates downloads from multiple storage providers.

    BlockDrive Storage Architecture:
    - IPFS (via Filebase): Encrypted file content
    - Cloudflare R2: Critical bytes + ZK proofs
    - Solana: Commitment verification (optional)

    The orchestrator handles provider selection and fallback logic.
    """

    def __init__(
        self,
        ipfs_client: Optional[IPFSClient] = None,
        r2_client: Optional[R2Client] = None,
        filebase_client: Optional[FilebaseClient] = None
    ):
        """
        Initialize storage orchestrator.

        Args:
            ipfs_client: IPFS client instance (multi-gateway)
            r2_client: R2 client instance (for proofs)
            filebase_client: Filebase client instance (enterprise, optional)
        """
        self.ipfs = ipfs_client or IPFSClient()
        self.r2 = r2_client or R2Client()
        self.filebase = filebase_client  # Optional enterprise client

    def download_encrypted_content(
        self,
        content_cid: str,
        provider: str = "filebase"
    ) -> DownloadResult:
        """
        Download encrypted file content from IPFS.

        Uses Filebase as the primary provider (enterprise-grade pinning),
        with automatic fallback to other gateways if needed.

        Args:
            content_cid: IPFS CID of encrypted content
            provider: Preferred storage provider (filebase, pinata, etc.)

        Returns:
            DownloadResult with encrypted content
        """
        # If enterprise Filebase client is configured, try it first
        if self.filebase and provider.lower() == "filebase":
            result = self.filebase.download_by_cid(content_cid)
            if result.success:
                return result
            # Fall through to multi-gateway client

        # Map provider names to gateway URLs
        provider_gateways = {
            "filebase": "https://ipfs.filebase.io/ipfs/",
            "pinata": "https://gateway.pinata.cloud/ipfs/",
            "infura": "https://ipfs.infura.io/ipfs/",
            "cloudflare": "https://cloudflare-ipfs.com/ipfs/",
        }

        preferred = provider_gateways.get(provider.lower())
        return self.ipfs.download(content_cid, preferred)

    def download_proof(self, proof_cid: str) -> Tuple[bool, Optional[ProofPackage], Optional[str]]:
        """
        Download ZK proof containing critical bytes from R2.

        The proof contains:
        - Encrypted critical bytes (first 16 bytes of encrypted file)
        - IV for decryption
        - Commitment hash for verification

        Args:
            proof_cid: Proof identifier

        Returns:
            Tuple of (success, ProofPackage, error)
        """
        return self.r2.download_proof(proof_cid)


def is_boto3_available() -> bool:
    """Check if boto3 is available for Filebase S3 API access."""
    return BOTO3_AVAILABLE
