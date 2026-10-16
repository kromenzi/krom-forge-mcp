#!/usr/bin/env python3
"""Validate provenance metadata for evidence used by release gates.

This validates that a manifest is bound to a host-attested execution receipt
and to a deterministic payload digest. It does not authenticate Supabase by
itself; the host/KROM must trust and attest the receipt issuer.
"""
import hashlib
import json
from pathlib import Path

REQUIRED_TESTS = ["RLS", "REST", "Storage", "Migration"]
ALLOWED_SOURCES = {"supabase_mcp", "supabase_cli", "host_ci"}
ALLOWED_ROLES = {"production", "reconstructed"}
HEX64 = set("0123456789abcdef")


def canonical_payload(data):
    payload = {key: value for key, value in data.items() if key not in {"provenance", "execution_receipt"}}
    return json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def payload_sha256(data):
    return hashlib.sha256(canonical_payload(data)).hexdigest()


def _is_sha256(value):
    value = str(value or "").lower()
    return len(value) == 64 and set(value) <= HEX64


def validate_provenance(data, source_path, role="manifest"):
    """Return human-readable errors; an empty list means structurally valid."""
    errors = []
    provenance = data.get("provenance")
    receipt = data.get("execution_receipt")
    if not isinstance(provenance, dict):
        return [f"{role}: missing provenance object"]
    if not isinstance(receipt, dict):
        return [f"{role}: missing execution_receipt object"]

    source_type = str(provenance.get("source_type", "")).strip().lower()
    if source_type not in ALLOWED_SOURCES:
        errors.append(f"{role}: unsupported provenance source_type {source_type or 'missing'}")
    for key in ("project_ref", "environment", "captured_at", "run_id", "source_revision", "role"):
        if not str(provenance.get(key, "")).strip():
            errors.append(f"{role}: provenance.{key} is missing")
    if str(provenance.get("role", "")).lower() not in ALLOWED_ROLES:
        errors.append(f"{role}: provenance.role must be production or reconstructed")
    digest = payload_sha256(data)
    if provenance.get("payload_sha256") != digest:
        errors.append(f"{role}: provenance.payload_sha256 does not match manifest payload")

    required_receipt = ("receipt_id", "run_id", "target_service", "project_ref", "environment", "started_at", "finished_at", "payload_sha256")
    for key in required_receipt:
        if not str(receipt.get(key, "")).strip():
            errors.append(f"{role}: execution_receipt.{key} is missing")
    if str(receipt.get("target_service", "")).lower() != "supabase":
        errors.append(f"{role}: execution_receipt.target_service must be supabase")
    if receipt.get("host_attested") is not True:
        errors.append(f"{role}: execution_receipt.host_attested must be true")
    if receipt.get("exit_code") != 0:
        errors.append(f"{role}: execution_receipt.exit_code must be 0")
    if receipt.get("payload_sha256") != digest:
        errors.append(f"{role}: execution_receipt.payload_sha256 does not match manifest payload")
    if receipt.get("project_ref") != provenance.get("project_ref"):
        errors.append(f"{role}: receipt project_ref does not match provenance")
    if receipt.get("environment") != provenance.get("environment"):
        errors.append(f"{role}: receipt environment does not match provenance")
    if receipt.get("run_id") != provenance.get("run_id"):
        errors.append(f"{role}: receipt run_id does not match provenance")
    tests_run = {str(value) for value in receipt.get("tests_run", [])} if isinstance(receipt.get("tests_run"), list) else set()
    missing_tests = [test for test in REQUIRED_TESTS if test not in tests_run]
    if missing_tests:
        errors.append(f"{role}: execution receipt missing tests_run: {', '.join(missing_tests)}")
    test_results = receipt.get("test_results")
    if not isinstance(test_results, list):
        errors.append(f"{role}: execution_receipt.test_results must be a non-empty list")
    else:
        result_names = set()
        for index, result in enumerate(test_results):
            if not isinstance(result, dict):
                errors.append(f"{role}: test_results[{index}] has invalid shape")
                continue
            name = str(result.get("name", "")); result_names.add(name)
            if name not in REQUIRED_TESTS:
                errors.append(f"{role}: test_results[{index}] has unknown test name")
            if str(result.get("status", "")).lower() not in {"passed", "pass", "success"}:
                errors.append(f"{role}: test result {name or index} is not passed")
            if not str(result.get("artifact_uri", "")).strip() or not _is_sha256(result.get("artifact_sha256")):
                errors.append(f"{role}: test result {name or index} needs artifact_uri and artifact_sha256")
        missing_results = [test for test in REQUIRED_TESTS if test not in result_names]
        if missing_results:
            errors.append(f"{role}: execution receipt missing test_results: {', '.join(missing_results)}")
    artifacts = receipt.get("artifacts")
    if not isinstance(artifacts, list) or not artifacts:
        errors.append(f"{role}: execution_receipt.artifacts must be a non-empty list")
    else:
        for index, artifact in enumerate(artifacts):
            if not isinstance(artifact, dict) or not str(artifact.get("uri", "")).strip() or not _is_sha256(artifact.get("sha256")):
                errors.append(f"{role}: execution_receipt.artifacts[{index}] needs uri and 64-character sha256")
    return errors


def verify_file(path):
    file_path = Path(path)
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"cannot read evidence file: {exc}"]
    if not isinstance(data, dict):
        return ["evidence file must contain a JSON object"]
    return validate_provenance(data, str(file_path))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(); parser.add_argument("manifest")
    args = parser.parse_args(); errors = verify_file(args.manifest)
    if errors:
        for error in errors: print(error)
        raise SystemExit(2)
    print("PROVENANCE_OK")
