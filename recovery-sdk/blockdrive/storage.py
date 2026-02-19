"""
BlockDrive Recovery SDK — Storage Module

Downloads encrypted content from IPFS and ZK proofs from Cloudflare R2.
Uses httpx for async HTTP with gateway fallback.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx


# IPFS gateways in priority order (Filebase first — enterprise-grade)
DEFAULT_IPFS_GATEWAYS: List[str] = [
    "https://ipfs.filebase.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
]

# Default R2 endpoint for BlockDrive ZK proofs
DEFAULT_R2_URL = "https://blockdrive-proofs.r2.cloudflarestorage.com"


@dataclass
class DownloadResult:
    """Result of a download operation."""
    success: bool
    data: bytes
    provider: str
    error: Optional[str] = None


class BlockDriveStorage:
    """
    Multi-provider download client for BlockDrive file recovery.

    Handles:
      - IPFS downloads with automatic gateway fallback
      - R2 downloads for ZK proof packages
      - Optional Filebase S3 direct access (requires boto3)
    """

    def __init__(
        self,
        ipfs_gateways: Optional[List[str]] = None,
        r2_url: Optional[str] = None,
        timeout: float = 60.0,
    ):
        """
        Args:
            ipfs_gateways: IPFS gateway URLs in priority order.
            r2_url: Base URL for BlockDrive R2 proof bucket.
            timeout: HTTP request timeout in seconds.
        """
        self.ipfs_gateways = ipfs_gateways or list(DEFAULT_IPFS_GATEWAYS)
        self.r2_url = (r2_url or DEFAULT_R2_URL).rstrip("/")
        self.timeout = timeout

    # ------------------------------------------------------------------
    # IPFS content download
    # ------------------------------------------------------------------

    async def download_ipfs(self, cid: str) -> DownloadResult:
        """
        Download content from IPFS, trying gateways in order.

        Args:
            cid: IPFS Content Identifier.

        Returns:
            DownloadResult with the raw encrypted bytes.
        """
        last_error: Optional[str] = None

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for gateway in self.ipfs_gateways:
                url = f"{gateway.rstrip('/')}/{cid}"
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        return DownloadResult(
                            success=True,
                            data=resp.content,
                            provider=gateway,
                        )
                    last_error = f"HTTP {resp.status_code} from {gateway}"
                except httpx.HTTPError as exc:
                    last_error = f"{gateway}: {exc}"

        return DownloadResult(
            success=False,
            data=b"",
            provider="",
            error=last_error or "All IPFS gateways failed",
        )

    def download_ipfs_sync(self, cid: str) -> DownloadResult:
        """Synchronous wrapper around download_ipfs."""
        last_error: Optional[str] = None

        with httpx.Client(timeout=self.timeout) as client:
            for gateway in self.ipfs_gateways:
                url = f"{gateway.rstrip('/')}/{cid}"
                try:
                    resp = client.get(url)
                    if resp.status_code == 200:
                        return DownloadResult(
                            success=True,
                            data=resp.content,
                            provider=gateway,
                        )
                    last_error = f"HTTP {resp.status_code} from {gateway}"
                except httpx.HTTPError as exc:
                    last_error = f"{gateway}: {exc}"

        return DownloadResult(
            success=False,
            data=b"",
            provider="",
            error=last_error or "All IPFS gateways failed",
        )

    # ------------------------------------------------------------------
    # R2 proof download
    # ------------------------------------------------------------------

    async def download_proof(self, proof_cid: str) -> DownloadResult:
        """
        Download a ZK proof package from R2.

        Args:
            proof_cid: Proof identifier / CID.

        Returns:
            DownloadResult with raw JSON bytes.
        """
        url = f"{self.r2_url}/{proof_cid}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return DownloadResult(
                        success=True,
                        data=resp.content,
                        provider="r2",
                    )
                return DownloadResult(
                    success=False,
                    data=b"",
                    provider="r2",
                    error=f"HTTP {resp.status_code}",
                )
            except httpx.HTTPError as exc:
                return DownloadResult(
                    success=False,
                    data=b"",
                    provider="r2",
                    error=str(exc),
                )

    def download_proof_sync(self, proof_cid: str) -> DownloadResult:
        """Synchronous wrapper around download_proof."""
        url = f"{self.r2_url}/{proof_cid}"

        with httpx.Client(timeout=self.timeout) as client:
            try:
                resp = client.get(url)
                if resp.status_code == 200:
                    return DownloadResult(
                        success=True,
                        data=resp.content,
                        provider="r2",
                    )
                return DownloadResult(
                    success=False,
                    data=b"",
                    provider="r2",
                    error=f"HTTP {resp.status_code}",
                )
            except httpx.HTTPError as exc:
                return DownloadResult(
                    success=False,
                    data=b"",
                    provider="r2",
                    error=str(exc),
                )

    # ------------------------------------------------------------------
    # Proof download with IPFS fallback
    # ------------------------------------------------------------------

    async def download_proof_with_fallback(self, proof_cid: str) -> DownloadResult:
        """Try R2 first, then fall back to IPFS for proof retrieval."""
        result = await self.download_proof(proof_cid)
        if result.success:
            return result
        # Fall back to IPFS
        return await self.download_ipfs(proof_cid)

    def download_proof_with_fallback_sync(self, proof_cid: str) -> DownloadResult:
        """Synchronous version of download_proof_with_fallback."""
        result = self.download_proof_sync(proof_cid)
        if result.success:
            return result
        return self.download_ipfs_sync(proof_cid)

    @staticmethod
    def parse_proof_json(data: bytes) -> Dict[str, Any]:
        """Parse raw proof bytes into a dict."""
        return json.loads(data.decode("utf-8"))
