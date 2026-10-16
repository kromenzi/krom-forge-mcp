#!/usr/bin/env python3
"""Verify a host/CI-signed execution receipt with a trusted Ed25519 key.

The trusted public key must be supplied out-of-band with --trusted-key. A key
embedded only in the JSON receipt is never trusted automatically.
"""
import base64
import hashlib
import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


def canonical_receipt(receipt):
    signed = {key: value for key, value in receipt.items() if key != "signature"}
    return json.dumps(signed, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def trusted_key_fingerprint(public_key):
    der = public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    return hashlib.sha256(der).hexdigest()


def load_trusted_key(path):
    raw = Path(path).read_bytes()
    key = serialization.load_pem_public_key(raw)
    if not isinstance(key, Ed25519PublicKey):
        raise ValueError("trusted key must be an Ed25519 public key")
    return key


def verify_receipt(receipt, trusted_key_path, role="manifest"):
    errors = []
    if not isinstance(receipt, dict):
        return [f"{role}: execution_receipt is not an object"]
    signature = receipt.get("signature")
    if not isinstance(signature, dict):
        return [f"{role}: missing execution_receipt.signature"]
    if str(signature.get("algorithm", "")) != "Ed25519":
        errors.append(f"{role}: signature algorithm must be Ed25519")
    if not str(signature.get("key_id", "")).strip():
        errors.append(f"{role}: signature.key_id is missing")
    encoded = signature.get("signature_b64")
    if not isinstance(encoded, str) or not encoded:
        errors.append(f"{role}: signature.signature_b64 is missing")
    try:
        trusted = load_trusted_key(trusted_key_path)
    except Exception as exc:
        return errors + [f"{role}: cannot load trusted key: {exc}"]
    actual_fingerprint = trusted_key_fingerprint(trusted)
    if signature.get("key_fingerprint_sha256") != actual_fingerprint:
        errors.append(f"{role}: receipt key fingerprint does not match trusted key")
    if errors:
        return errors
    errors.extend(verify_signed_object(receipt, trusted_key_path, role=role))
    return errors


def verify_signed_object(value, trusted_key_path, role="signed_object"):
    """Verify only the detached Ed25519 signature on a JSON object."""
    errors = []
    signature = value.get("signature") if isinstance(value, dict) else None
    if not isinstance(signature, dict): return [f"{role}: missing signature"]
    if str(signature.get("algorithm", "")) != "Ed25519": errors.append(f"{role}: signature algorithm must be Ed25519")
    encoded = signature.get("signature_b64")
    try: trusted = load_trusted_key(trusted_key_path)
    except Exception as exc: return errors + [f"{role}: cannot load trusted key: {exc}"]
    if signature.get("key_fingerprint_sha256") != trusted_key_fingerprint(trusted): errors.append(f"{role}: receipt key fingerprint does not match trusted key")
    if errors: return errors
    try: trusted.verify(base64.b64decode(encoded, validate=True), canonical_receipt(value))
    except Exception: errors.append(f"{role}: Ed25519 signature verification failed")
    return errors


def verify_manifest_file(path, trusted_key_path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"manifest cannot be read: {exc}"]
    return verify_receipt(data.get("execution_receipt"), trusted_key_path, role=str(path))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(); parser.add_argument("manifest"); parser.add_argument("--trusted-key", required=True)
    args = parser.parse_args(); issues = verify_manifest_file(args.manifest, args.trusted_key)
    if issues:
        for issue in issues: print(issue)
        raise SystemExit(2)
    print("SIGNED_RECEIPT_OK")
