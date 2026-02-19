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
        errors: List[str] = []

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
                    errors.append(f"HTTP {resp.status_code} from {gateway}")
                except httpx.HTTPError as exc:
                    errors.append(f"{gateway}: {exc}")

        return DownloadResult(
            success=False,
            data=b"",
            provider="",
            error="; ".join(errors) if errors else "No IPFS gateways configured",
        )

    def download_ipfs_sync(self, cid: str) -> DownloadResult:
        """Synchronous wrapper around download_ipfs."""
        errors: List[str] = []

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
                    errors.append(f"HTTP {resp.status_code} from {gateway}")
                except httpx.HTTPError as exc:
                    errors.append(f"{gateway}: {exc}")

        return DownloadResult(
            success=False,
            data=b"",
            provider="",
            error="; ".join(errors) if errors else "No IPFS gateways configured",
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
        r2_result = await self.download_proof(proof_cid)
        if r2_result.success:
            return r2_result
        # Fall back to IPFS, preserving R2 error context
        ipfs_result = await self.download_ipfs(proof_cid)
        if not ipfs_result.success:
            ipfs_result.error = f"R2: {r2_result.error}; IPFS: {ipfs_result.error}"
        return ipfs_result

    def download_proof_with_fallback_sync(self, proof_cid: str) -> DownloadResult:
        """Synchronous version of download_proof_with_fallback."""
        r2_result = self.download_proof_sync(proof_cid)
        if r2_result.success:
            return r2_result
        ipfs_result = self.download_ipfs_sync(proof_cid)
        if not ipfs_result.success:
            ipfs_result.error = f"R2: {r2_result.error}; IPFS: {ipfs_result.error}"
        return ipfs_result

    @staticmethod
    def parse_proof_json(data: bytes) -> Dict[str, Any]:
        """Parse raw proof bytes into a dict."""
        return json.loads(data.decode("utf-8"))
