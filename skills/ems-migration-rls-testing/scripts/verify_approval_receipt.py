#!/usr/bin/env python3
"""Verify independent signed Merge/Deploy approval evidence."""
import argparse
import json
from pathlib import Path
from verify_signed_receipt import verify_signed_object


def validate(receipt, trusted_key, approver_registry=None, target_revision=None):
    issues = verify_signed_object(receipt, trusted_key, role="approval_receipt")
    for key in ("receipt_id", "approved_at", "approver_id", "approver_role", "target_revision"):
        if not str(receipt.get(key, "")).strip(): issues.append(f"approval_receipt.{key} is missing")
    if target_revision and receipt.get("target_revision") != target_revision:
        issues.append("approval receipt target_revision does not match requested revision")
    registry = approver_registry or {}
    approver = registry.get(receipt.get("approver_id")) if isinstance(registry, dict) else None
    if not isinstance(approver, dict):
        issues.append("approver_id is not present in the trusted approver registry")
    else:
        allowed_roles = set(approver.get("roles", [])) if isinstance(approver.get("roles"), list) else set()
        if receipt.get("approver_role") not in allowed_roles:
            issues.append("approver_role is not authorized by the trusted approver registry")
        if approver.get("key_id") != receipt.get("signature", {}).get("key_id"):
            issues.append("approval signature key_id is not bound to the approver registry")
    approvals = receipt.get("approvals")
    if not isinstance(approvals, dict):
        issues.append("approval_receipt.approvals must be an object")
    else:
        for name in ("merge", "deploy"):
            item = approvals.get(name)
            if not isinstance(item, dict) or str(item.get("status", "")).lower() not in {"approved", "accepted"}:
                issues.append(f"{name} approval is not independently approved")
            elif not str(item.get("approved_by", "")).strip():
                issues.append(f"{name} approval has no approver identity")
            elif item.get("approved_by") != receipt.get("approver_id"):
                issues.append(f"{name} approval identity does not match the signed approver")
    return issues


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("receipt"); parser.add_argument("--trusted-key", required=True); parser.add_argument("--approver-registry", required=True); parser.add_argument("--target-revision")
    args = parser.parse_args(); data = json.loads(Path(args.receipt).read_text(encoding="utf-8")); registry = json.loads(Path(args.approver_registry).read_text(encoding="utf-8")); issues = validate(data, args.trusted_key, registry, args.target_revision)
    if issues:
        for issue in issues: print(issue)
        return 2
    print("APPROVAL_RECEIPT_OK"); return 0

if __name__ == "__main__": raise SystemExit(main())
