#!/usr/bin/env python3
"""
BlockDrive Recovery SDK - Web Integration Example

This example shows how to integrate the recovery SDK into a web application
(Flask/FastAPI) that receives signatures from a frontend wallet connection.

Requirements:
    pip install blockdrive-recovery flask

Usage:
    python web_integration.py
    # Then POST to http://localhost:5000/recover
"""

import os
import sys
import json
import base64
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from blockdrive_recovery import BlockDriveRecovery, SecurityLevel

# Flask is optional - this is just an example
try:
    from flask import Flask, request, jsonify, send_file
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("Flask not installed. This example shows the integration pattern.")

# Initialize the recovery SDK (can be shared across requests)
recovery_sdk = BlockDriveRecovery()


def recover_file_from_request(data: dict) -> dict:
    """
    Process a file recovery request.

    Expected request data:
    {
        "content_cid": "bafybeig...",
        "proof_cid": "proof_abc123",
        "security_level": 1,
        "signature": "base64-encoded-signature",
        "output_format": "base64" | "file"
    }
    """
    # Validate required fields
    required = ["content_cid", "proof_cid", "security_level", "signature"]
    for field in required:
        if field not in data:
            return {"error": f"Missing required field: {field}"}

    # Decode signature from base64
    try:
        signature = base64.b64decode(data["signature"])
    except Exception as e:
        return {"error": f"Invalid signature encoding: {e}"}

    # Get security level
    try:
        level = SecurityLevel(int(data["security_level"]))
    except ValueError:
        return {"error": "Invalid security level (must be 1, 2, or 3)"}

    # Derive encryption key
    if not recovery_sdk.derive_key_from_signature(signature, level):
        return {"error": "Failed to derive encryption key from signature"}

    # Recover file
    result = recovery_sdk.recover_file(
        content_cid=data["content_cid"],
        proof_cid=data["proof_cid"],
        security_level=level,
        storage_provider=data.get("provider", "filebase"),
        verify_commitment=True
    )

    if not result.success:
        return {"error": result.error}

    # Return based on output format
    output_format = data.get("output_format", "base64")

    if output_format == "base64":
        return {
            "success": True,
            "data": base64.b64encode(result.data).decode(),
            "file_name": result.file_name,
            "file_type": result.file_type,
            "file_size": result.file_size,
            "commitment_valid": result.commitment_valid,
            "download_time_ms": result.download_time_ms,
            "decryption_time_ms": result.decryption_time_ms
        }
    else:
        # Return file path for streaming
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".bin")
        temp_file.write(result.data)
        temp_file.close()
        return {
            "success": True,
            "file_path": temp_file.name,
            "file_size": result.file_size,
            "commitment_valid": result.commitment_valid
        }


# Flask application (if available)
if FLASK_AVAILABLE:
    app = Flask(__name__)

    @app.route("/recover", methods=["POST"])
    def recover_endpoint():
        """
        POST /recover

        Recovers a BlockDrive-encrypted file.

        Body: JSON with content_cid, proof_cid, security_level, signature
        Returns: JSON with base64-encoded file data
        """
        try:
            data = request.get_json()
            result = recover_file_from_request(data)

            if "error" in result:
                return jsonify(result), 400

            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/recover/download", methods=["POST"])
    def recover_download_endpoint():
        """
        POST /recover/download

        Recovers and directly downloads a file.
        """
        try:
            data = request.get_json()
            data["output_format"] = "file"
            result = recover_file_from_request(data)

            if "error" in result:
                return jsonify(result), 400

            return send_file(
                result["file_path"],
                as_attachment=True,
                download_name=data.get("filename", "recovered_file")
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint."""
        return jsonify({
            "status": "healthy",
            "sdk_version": "1.0.0"
        })


def example_client_request():
    """
    Example of how to call the recovery endpoint from a client.

    In a real frontend application, you would:
    1. Connect to wallet (Phantom, Solflare, etc.)
    2. Request signature for the security level message
    3. Send the recovery request with the signature
    """
    import requests

    # Example request data
    request_data = {
        "content_cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
        "proof_cid": "proof_abc123",
        "security_level": 1,
        "signature": base64.b64encode(b"example_signature_bytes").decode(),
        "output_format": "base64"
    }

    response = requests.post(
        "http://localhost:5000/recover",
        json=request_data
    )

    if response.status_code == 200:
        result = response.json()
        file_data = base64.b64decode(result["data"])
        print(f"Recovered {len(file_data)} bytes")
    else:
        print(f"Error: {response.json()}")


if __name__ == "__main__":
    if FLASK_AVAILABLE:
        print("Starting BlockDrive Recovery API server...")
        print("Endpoints:")
        print("  POST /recover         - Recover file (returns base64)")
        print("  POST /recover/download - Recover file (direct download)")
        print("  GET  /health          - Health check")
        print()
        app.run(host="0.0.0.0", port=5000, debug=True)
    else:
        print("Flask not installed. Showing example usage...")
        print()
        print("Example recovery request:")
        print(json.dumps({
            "content_cid": "bafybeig...",
            "proof_cid": "proof_abc123",
            "security_level": 1,
            "signature": "<base64-encoded-wallet-signature>"
        }, indent=2))
        print()
        print("Install Flask to run the server: pip install flask")
