"""Tests for blockdrive.crypto — AES-256-GCM and ZK proof verification."""

import base64
import hashlib
import json
import os

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from blockdrive.crypto import BlockDriveCrypto, CRITICAL_BYTES_LENGTH, FILE_IV_LENGTH
from blockdrive.wallet import BlockDriveWallet, SecurityLevel


def _make_key() -> bytes:
    """Derive a deterministic test key."""
    sig = b"\x42" * 64
    return BlockDriveWallet.derive_key(sig, SecurityLevel.STANDARD)


def _encrypt_payload(key: bytes, critical_bytes: bytes, file_iv: bytes) -> tuple:
    """
    Encrypt critical_bytes + file_iv as a proof payload.
    Replicates zkProofService.ts::generateProof() payload encryption.
    """
    payload = critical_bytes + file_iv
    encryption_iv = os.urandom(12)
    aesgcm = AESGCM(key)
    encrypted = aesgcm.encrypt(encryption_iv, payload, None)
    return encrypted, encryption_iv


def _encrypt_file(key: bytes, plaintext: bytes) -> tuple:
    """
    Encrypt a file with AES-256-GCM, matching aesEncryptionService.ts.
    Returns (ciphertext_without_critical, critical_bytes, file_iv, commitment).
    """
    file_iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(file_iv, plaintext, None)

    critical_bytes = ciphertext[:CRITICAL_BYTES_LENGTH]
    remaining = ciphertext[CRITICAL_BYTES_LENGTH:]
    commitment = hashlib.sha256(critical_bytes).hexdigest()

    return remaining, critical_bytes, file_iv, commitment


def _build_proof_v2(
    key: bytes,
    critical_bytes: bytes,
    file_iv: bytes,
    commitment: str,
    groth16_proof=None,
    public_signals=None,
) -> dict:
    """Build a v2 ZK proof package matching TypeScript format."""
    encrypted, encryption_iv = _encrypt_payload(key, critical_bytes, file_iv)

    proof = {
        "version": 2,
        "commitment": commitment,
        "groth16Proof": groth16_proof,
        "publicSignals": public_signals or [],
        "encryptedCriticalBytes": base64.b64encode(encrypted).decode(),
        "encryptedIv": base64.b64encode(file_iv).decode(),
        "encryptionIv": base64.b64encode(encryption_iv).decode(),
        "proofHash": "",
        "proofTimestamp": 1700000000000,
        "verificationData": {
            "commitmentAlgorithm": "SHA-256",
            "encryptionAlgorithm": "AES-256-GCM",
            "proofType": "BlockDrive-ZK-v2-Simulated",
            "circuitVersion": "1.0.0",
        },
    }

    # Compute proof hash (must match TS buildProofHashContent)
    hash_content = {
        "commitment": proof["commitment"],
        "groth16Proof": proof["groth16Proof"],
        "publicSignals": proof["publicSignals"],
        "encryptedCriticalBytes": proof["encryptedCriticalBytes"],
        "proofTimestamp": proof["proofTimestamp"],
    }
    json_str = json.dumps(hash_content, separators=(",", ":"), ensure_ascii=False)
    proof["proofHash"] = hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    return proof


def _build_proof_v1(
    key: bytes,
    critical_bytes: bytes,
    file_iv: bytes,
    commitment: str,
) -> dict:
    """Build a v1 ZK proof package."""
    encrypted, encryption_iv = _encrypt_payload(key, critical_bytes, file_iv)

    proof = {
        "version": 1,
        "commitment": commitment,
        "encryptedCriticalBytes": base64.b64encode(encrypted).decode(),
        "encryptedIv": base64.b64encode(file_iv).decode(),
        "encryptionIv": base64.b64encode(encryption_iv).decode(),
        "proofHash": "",
        "proofTimestamp": 1700000000000,
        "verificationData": {
            "commitmentAlgorithm": "SHA-256",
            "encryptionAlgorithm": "AES-256-GCM",
            "proofType": "BlockDrive-ZK-v1",
        },
    }

    hash_content = {
        "commitment": proof["commitment"],
        "encryptedCriticalBytes": proof["encryptedCriticalBytes"],
        "proofTimestamp": proof["proofTimestamp"],
    }
    json_str = json.dumps(hash_content, separators=(",", ":"), ensure_ascii=False)
    proof["proofHash"] = hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    return proof


class TestAESGCMRoundTrip:
    """AES-256-GCM encrypt → split → reassemble → decrypt."""

    def test_roundtrip_basic(self):
        key = _make_key()
        plaintext = b"Hello, BlockDrive Recovery SDK!"
        remaining, critical_bytes, file_iv, commitment = _encrypt_file(key, plaintext)

        crypto = BlockDriveCrypto(key)
        decrypted = crypto.decrypt_file(remaining, critical_bytes, file_iv, commitment)
        assert decrypted == plaintext

    def test_roundtrip_large_file(self):
        key = _make_key()
        plaintext = os.urandom(1024 * 1024)  # 1 MB
        remaining, critical_bytes, file_iv, commitment = _encrypt_file(key, plaintext)

        crypto = BlockDriveCrypto(key)
        decrypted = crypto.decrypt_file(remaining, critical_bytes, file_iv, commitment)
        assert decrypted == plaintext

    def test_roundtrip_with_hash_verification(self):
        key = _make_key()
        plaintext = b"verified content"
        expected_hash = hashlib.sha256(plaintext).hexdigest()
        remaining, critical_bytes, file_iv, commitment = _encrypt_file(key, plaintext)

        crypto = BlockDriveCrypto(key)
        decrypted = crypto.decrypt_file(
            remaining, critical_bytes, file_iv, commitment,
            expected_hash=expected_hash,
        )
        assert decrypted == plaintext

    def test_wrong_commitment_raises(self):
        key = _make_key()
        remaining, critical_bytes, file_iv, _ = _encrypt_file(key, b"data")

        crypto = BlockDriveCrypto(key)
        with pytest.raises(ValueError, match="Commitment verification failed"):
            crypto.decrypt_file(remaining, critical_bytes, file_iv, "0" * 64)

    def test_wrong_hash_raises(self):
        key = _make_key()
        plaintext = b"data"
        remaining, critical_bytes, file_iv, commitment = _encrypt_file(key, plaintext)

        crypto = BlockDriveCrypto(key)
        with pytest.raises(ValueError, match="Content hash verification failed"):
            crypto.decrypt_file(
                remaining, critical_bytes, file_iv, commitment,
                expected_hash="0" * 64,
            )

    def test_invalid_key_length_raises(self):
        with pytest.raises(ValueError, match="32 bytes"):
            BlockDriveCrypto(b"short")


class TestProofVerification:
    """ZK proof hash computation and verification."""

    def test_v2_proof_hash_matches(self):
        key = _make_key()
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v2(key, critical_bytes, file_iv, commitment)
        assert BlockDriveCrypto.verify_proof_integrity(proof)

    def test_v1_proof_hash_matches(self):
        key = _make_key()
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v1(key, critical_bytes, file_iv, commitment)
        assert BlockDriveCrypto.verify_proof_integrity(proof)

    def test_tampered_proof_detected(self):
        key = _make_key()
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v2(key, critical_bytes, file_iv, commitment)
        proof["commitment"] = "0" * 64  # tamper
        assert not BlockDriveCrypto.verify_proof_integrity(proof)

    def test_v2_proof_hash_key_order(self):
        """Verify the JSON key order matches TypeScript buildProofHashContent."""
        key = _make_key()
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v2(
            key, critical_bytes, file_iv, commitment,
            groth16_proof={"pi_a": ["1", "2"], "pi_b": [["3", "4"]], "pi_c": ["5"]},
            public_signals=["signal1"],
        )

        # Verify the hash content has keys in the exact right order
        hash_content = json.dumps({
            "commitment": proof["commitment"],
            "groth16Proof": proof["groth16Proof"],
            "publicSignals": proof["publicSignals"],
            "encryptedCriticalBytes": proof["encryptedCriticalBytes"],
            "proofTimestamp": proof["proofTimestamp"],
        }, separators=(",", ":"), ensure_ascii=False)

        expected_hash = hashlib.sha256(hash_content.encode("utf-8")).hexdigest()
        assert proof["proofHash"] == expected_hash
        assert BlockDriveCrypto.verify_proof_integrity(proof)


class TestProofDecryption:
    """Full proof decrypt → extract → verify flow."""

    def test_v2_extract_critical_bytes(self):
        key = _make_key()
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v2(key, critical_bytes, file_iv, commitment)

        crypto = BlockDriveCrypto(key)
        extracted_cb, extracted_iv = crypto.verify_and_decrypt_proof(proof)
        assert extracted_cb == critical_bytes
        assert extracted_iv == file_iv

    def test_v1_extract_critical_bytes(self):
        key = _make_key()
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v1(key, critical_bytes, file_iv, commitment)

        crypto = BlockDriveCrypto(key)
        extracted_cb, extracted_iv = crypto.verify_and_decrypt_proof(proof)
        assert extracted_cb == critical_bytes
        assert extracted_iv == file_iv

    def test_wrong_key_raises(self):
        key = _make_key()
        wrong_key = os.urandom(32)
        critical_bytes = os.urandom(16)
        file_iv = os.urandom(12)
        commitment = hashlib.sha256(critical_bytes).hexdigest()

        proof = _build_proof_v2(key, critical_bytes, file_iv, commitment)

        crypto = BlockDriveCrypto(wrong_key)
        with pytest.raises(ValueError, match="Failed to decrypt proof"):
            crypto.verify_and_decrypt_proof(proof)

    def test_full_roundtrip(self):
        """End-to-end: encrypt file → build proof → verify proof → decrypt file."""
        key = _make_key()
        plaintext = b"This is a secret document for recovery testing."

        # Encrypt file
        remaining, critical_bytes, file_iv, commitment = _encrypt_file(key, plaintext)

        # Build proof
        proof = _build_proof_v2(key, critical_bytes, file_iv, commitment)

        # Verify and decrypt
        crypto = BlockDriveCrypto(key)
        extracted_cb, extracted_iv = crypto.verify_and_decrypt_proof(proof)
        decrypted = crypto.decrypt_file(remaining, extracted_cb, extracted_iv, commitment)

        assert decrypted == plaintext


class TestCommitment:
    """Commitment verification helpers."""

    def test_verify_commitment_correct(self):
        data = os.urandom(16)
        commitment = hashlib.sha256(data).hexdigest()
        assert BlockDriveCrypto.verify_commitment(data, commitment)

    def test_verify_commitment_wrong(self):
        assert not BlockDriveCrypto.verify_commitment(b"\x00" * 16, "0" * 64)

    def test_commitment_is_lowercase_hex(self):
        data = os.urandom(16)
        h = BlockDriveCrypto.sha256_hex(data)
        assert len(h) == 64
        assert h == h.lower()
        assert all(c in "0123456789abcdef" for c in h)
