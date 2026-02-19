"""Tests for blockdrive.wallet — key derivation."""

import os
import pytest

from blockdrive.wallet import BlockDriveWallet, SecurityLevel, HKDF_SALT, HKDF_INFO


class TestKeyDerivation:
    """HKDF key derivation must be deterministic and match TypeScript."""

    def test_derive_key_returns_32_bytes(self):
        sig = os.urandom(64)
        key = BlockDriveWallet.derive_key(sig, SecurityLevel.STANDARD)
        assert len(key) == 32

    def test_derive_key_deterministic(self):
        sig = os.urandom(64)
        k1 = BlockDriveWallet.derive_key(sig, SecurityLevel.STANDARD)
        k2 = BlockDriveWallet.derive_key(sig, SecurityLevel.STANDARD)
        assert k1 == k2

    def test_different_levels_produce_different_keys(self):
        sig = os.urandom(64)
        k1 = BlockDriveWallet.derive_key(sig, SecurityLevel.STANDARD)
        k2 = BlockDriveWallet.derive_key(sig, SecurityLevel.SENSITIVE)
        k3 = BlockDriveWallet.derive_key(sig, SecurityLevel.MAXIMUM)
        assert k1 != k2
        assert k2 != k3
        assert k1 != k3

    def test_different_signatures_produce_different_keys(self):
        s1 = os.urandom(64)
        s2 = os.urandom(64)
        k1 = BlockDriveWallet.derive_key(s1, SecurityLevel.STANDARD)
        k2 = BlockDriveWallet.derive_key(s2, SecurityLevel.STANDARD)
        assert k1 != k2

    def test_accepts_32_byte_material(self):
        """Wallet may provide raw 32-byte key material."""
        material = os.urandom(32)
        key = BlockDriveWallet.derive_key(material, SecurityLevel.STANDARD)
        assert len(key) == 32

    def test_derive_all_keys(self):
        sigs = {
            SecurityLevel.STANDARD: os.urandom(64),
            SecurityLevel.SENSITIVE: os.urandom(64),
            SecurityLevel.MAXIMUM: os.urandom(64),
        }
        keys = BlockDriveWallet.derive_all_keys(sigs)
        assert len(keys) == 3
        for level in SecurityLevel:
            assert len(keys[level]) == 32


class TestHKDFParameters:
    """Verify HKDF salt and info match TypeScript constants."""

    def test_salt(self):
        assert HKDF_SALT == b"BlockDrive-HKDF-Salt-v1"

    def test_info_level_1(self):
        assert HKDF_INFO[SecurityLevel.STANDARD] == b"blockdrive-level-1-encryption"

    def test_info_level_2(self):
        assert HKDF_INFO[SecurityLevel.SENSITIVE] == b"blockdrive-level-2-encryption"

    def test_info_level_3(self):
        assert HKDF_INFO[SecurityLevel.MAXIMUM] == b"blockdrive-level-3-encryption"


class TestSecurityMessages:
    """Verify sign messages match TypeScript SECURITY_LEVEL_MESSAGES."""

    def test_standard_message(self):
        msg = BlockDriveWallet.get_sign_message(SecurityLevel.STANDARD)
        assert msg == "BlockDrive Security Level One - Standard Protection"

    def test_sensitive_message(self):
        msg = BlockDriveWallet.get_sign_message(SecurityLevel.SENSITIVE)
        assert msg == "BlockDrive Security Level Two - Sensitive Data Protection"

    def test_maximum_message(self):
        msg = BlockDriveWallet.get_sign_message(SecurityLevel.MAXIMUM)
        assert msg == "BlockDrive Security Level Three - Maximum Security"


class TestKeyHash:
    """Key hash must be deterministic."""

    def test_key_hash_deterministic(self):
        sig = os.urandom(64)
        h1 = BlockDriveWallet.generate_key_hash(sig, SecurityLevel.STANDARD)
        h2 = BlockDriveWallet.generate_key_hash(sig, SecurityLevel.STANDARD)
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex

    def test_key_hash_different_levels(self):
        sig = os.urandom(64)
        h1 = BlockDriveWallet.generate_key_hash(sig, SecurityLevel.STANDARD)
        h2 = BlockDriveWallet.generate_key_hash(sig, SecurityLevel.SENSITIVE)
        assert h1 != h2
