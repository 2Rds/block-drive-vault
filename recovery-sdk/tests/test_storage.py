"""Tests for blockdrive.storage — gateway fallback logic."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx

from blockdrive.storage import BlockDriveStorage, DEFAULT_IPFS_GATEWAYS, DownloadResult


class TestIPFSGateways:
    """IPFS gateway configuration and defaults."""

    def test_default_gateways(self):
        storage = BlockDriveStorage()
        assert len(storage.ipfs_gateways) == len(DEFAULT_IPFS_GATEWAYS)
        # Filebase should be first
        assert "filebase" in storage.ipfs_gateways[0]

    def test_custom_gateways(self):
        custom = ["https://my-gateway.example.com/ipfs/"]
        storage = BlockDriveStorage(ipfs_gateways=custom)
        assert storage.ipfs_gateways == custom


class TestGatewayFallback:
    """Verify fallback behavior when gateways fail."""

    def test_sync_fallback_succeeds_on_second(self):
        """First gateway fails, second succeeds."""
        storage = BlockDriveStorage(
            ipfs_gateways=[
                "https://gateway1.example.com/ipfs/",
                "https://gateway2.example.com/ipfs/",
            ],
            timeout=5.0,
        )

        call_count = 0

        def mock_get(url, **kwargs):
            nonlocal call_count
            call_count += 1
            resp = MagicMock()
            if "gateway1" in url:
                resp.status_code = 500
            else:
                resp.status_code = 200
                resp.content = b"file data"
            return resp

        with patch.object(httpx.Client, "get", side_effect=mock_get):
            result = storage.download_ipfs_sync("QmTest123")

        assert result.success
        assert result.data == b"file data"
        assert "gateway2" in result.provider
        assert call_count == 2

    def test_sync_all_fail(self):
        """All gateways fail."""
        storage = BlockDriveStorage(
            ipfs_gateways=["https://bad1.example.com/ipfs/"],
            timeout=5.0,
        )

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 503
            return resp

        with patch.object(httpx.Client, "get", side_effect=mock_get):
            result = storage.download_ipfs_sync("QmTest123")

        assert not result.success
        assert result.error is not None

    def test_sync_network_error_fallback(self):
        """Network error on first gateway, second works."""
        storage = BlockDriveStorage(
            ipfs_gateways=[
                "https://bad.example.com/ipfs/",
                "https://good.example.com/ipfs/",
            ],
            timeout=5.0,
        )

        def mock_get(url, **kwargs):
            if "bad" in url:
                raise httpx.ConnectError("Connection refused")
            resp = MagicMock()
            resp.status_code = 200
            resp.content = b"recovered"
            return resp

        with patch.object(httpx.Client, "get", side_effect=mock_get):
            result = storage.download_ipfs_sync("QmTest123")

        assert result.success
        assert result.data == b"recovered"


class TestProofDownload:
    """R2 proof download."""

    def test_sync_proof_download(self):
        storage = BlockDriveStorage(r2_url="https://test-r2.example.com")

        proof_data = json.dumps({"commitment": "abc", "version": 2}).encode()

        def mock_get(url, **kwargs):
            resp = MagicMock()
            resp.status_code = 200
            resp.content = proof_data
            return resp

        with patch.object(httpx.Client, "get", side_effect=mock_get):
            result = storage.download_proof_sync("proof-123")

        assert result.success
        parsed = BlockDriveStorage.parse_proof_json(result.data)
        assert parsed["commitment"] == "abc"


class TestProofFallback:
    """Proof download with IPFS fallback."""

    def test_sync_r2_fails_ipfs_succeeds(self):
        storage = BlockDriveStorage(
            ipfs_gateways=["https://ipfs.example.com/ipfs/"],
            r2_url="https://r2.example.com",
            timeout=5.0,
        )

        proof_data = json.dumps({"commitment": "xyz"}).encode()

        def mock_get(url, **kwargs):
            resp = MagicMock()
            if "r2" in url:
                resp.status_code = 404
            else:
                resp.status_code = 200
                resp.content = proof_data
            return resp

        with patch.object(httpx.Client, "get", side_effect=mock_get):
            result = storage.download_proof_with_fallback_sync("proof-456")

        assert result.success
