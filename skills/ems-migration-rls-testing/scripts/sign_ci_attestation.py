#!/usr/bin/env python3
"""Create a signed attestation that the protected GitHub Actions workflow ran."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from verify_signed_receipt import canonical_receipt, trusted_key_fingerprint


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--private-key", required=True); parser.add_argument("--out", required=True); parser.add_argument("--workflow-template", required=True); parser.add_argument("--project-ref", required=True); parser.add_argument("--environment", required=True); parser.add_argument("--key-id", required=True)
    args = parser.parse_args()
    private = serialization.load_pem_private_key(Path(args.private_key).read_bytes(), password=None)
    if not isinstance(private, Ed25519PrivateKey): raise SystemExit("private key must be Ed25519")
    template_hash = hashlib.sha256(Path(args.workflow_template).read_bytes()).hexdigest()
    attestation = {"attestation_type": "github_actions_supabase_execution", "repository": os.environ.get("GITHUB_REPOSITORY", ""), "workflow_ref": os.environ.get("GITHUB_WORKFLOW_REF", ""), "workflow_sha": os.environ.get("GITHUB_SHA", ""), "run_id": os.environ.get("GITHUB_RUN_ID", ""), "run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT", ""), "project_ref": args.project_ref, "environment": args.environment, "workflow_template_sha256": template_hash, "tests_job": "passed", "signed_by": args.key_id}
    attestation["signature"] = {"algorithm": "Ed25519", "key_id": args.key_id, "key_fingerprint_sha256": trusted_key_fingerprint(private.public_key()), "signature_b64": base64.b64encode(private.sign(canonical_receipt(attestation))).decode("ascii")}
    Path(args.out).write_text(json.dumps(attestation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__": raise SystemExit(main())
