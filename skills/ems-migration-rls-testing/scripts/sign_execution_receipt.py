#!/usr/bin/env python3
"""Sign an existing Supabase execution receipt using an out-of-band Ed25519 key."""
import argparse
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from verify_signed_receipt import canonical_receipt, trusted_key_fingerprint


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    parser.add_argument("--private-key", required=True, help="CI-protected Ed25519 private-key PEM")
    parser.add_argument("--key-id", required=True)
    args = parser.parse_args()
    path = Path(args.manifest); data = json.loads(path.read_text(encoding="utf-8"))
    receipt = data.get("execution_receipt")
    if not isinstance(receipt, dict): raise SystemExit("missing execution_receipt")
    private = serialization.load_pem_private_key(Path(args.private_key).read_bytes(), password=None)
    if not isinstance(private, Ed25519PrivateKey): raise SystemExit("private key must be Ed25519")
    receipt = {key: value for key, value in receipt.items() if key != "signature"}
    receipt["signature"] = {"algorithm": "Ed25519", "key_id": args.key_id, "key_fingerprint_sha256": trusted_key_fingerprint(private.public_key()), "signature_b64": base64.b64encode(private.sign(canonical_receipt(receipt))).decode("ascii")}
    data["execution_receipt"] = receipt
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"manifest": str(path), "key_id": args.key_id, "fingerprint": receipt["signature"]["key_fingerprint_sha256"]}, ensure_ascii=False))

if __name__ == "__main__": raise SystemExit(main())
