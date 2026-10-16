#!/usr/bin/env python3
"""Compare schema manifests with strict evidence, security, and approval gates.

A manifest must be a non-empty JSON object containing every required schema
section and explicit test evidence for RLS, REST, Storage, and Migration.
Schema/test success is reported separately from merge/deploy approval.
"""
import argparse
import json
import sys
from pathlib import Path

from verify_evidence_provenance import validate_provenance
from verify_signed_receipt import verify_receipt
from verify_approval_receipt import validate as validate_approval_receipt

SCHEMA_CATEGORIES = ["tables", "columns", "indexes", "constraints", "functions", "triggers", "views", "grants", "policies"]
REQUIRED_TESTS = ["RLS", "REST", "Storage", "Migration"]
PASS = {"pass", "passed", "success", "ok", "complete", "completed"}
APPROVED = PASS | {"approved", "approve", "accepted", "accept"}
BLOCKED = {"blocked", "bypassed", "skip", "skipped", "not_run", "not-run", "unknown", "unverified", "unavailable"}


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False) if isinstance(value, dict) else str(value)


def normalize(values):
    return {canonical(value) for value in values}


def read_manifest(path, trusted_key):
    file_path = Path(path)
    if not file_path.exists():
        raise ValueError(f"manifest does not exist: {path}")
    raw = file_path.read_text(encoding="utf-8")
    if not raw.strip():
        raise ValueError(f"manifest is empty: {path}")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"manifest is not valid JSON: {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError(f"manifest must be a JSON object: {path}")
    missing = [key for key in SCHEMA_CATEGORIES if key not in data]
    if missing:
        raise ValueError(f"manifest missing required schema sections: {', '.join(missing)}")
    invalid = [key for key in SCHEMA_CATEGORIES if not isinstance(data[key], list)]
    if invalid:
        raise ValueError(f"schema sections must be arrays: {', '.join(invalid)}")
    if not any(data[key] for key in SCHEMA_CATEGORIES):
        raise ValueError("manifest contains no schema objects; empty manifests are not acceptable evidence")
    provenance_errors = validate_provenance(data, str(file_path), role="manifest")
    if provenance_errors:
        raise ValueError("; ".join(provenance_errors))
    signature_errors = verify_receipt(data.get("execution_receipt"), trusted_key, role="manifest")
    if signature_errors:
        raise ValueError("; ".join(signature_errors))
    return data


def status(value):
    return str(value or "").strip().lower().replace(" ", "_")


def extract_test_statuses(manifest):
    evidence = manifest.get("test_evidence")
    if not isinstance(evidence, dict):
        return {}, "missing test_evidence object"
    statuses = {}
    for test in REQUIRED_TESTS:
        item = evidence.get(test)
        if isinstance(item, str):
            statuses[test] = status(item)
        elif isinstance(item, dict):
            statuses[test] = status(item.get("status"))
        else:
            statuses[test] = "missing"
    return statuses, None


def assess_tests(prod, recon):
    issues = []
    combined = {}
    for source_name, manifest in (("production", prod), ("reconstructed", recon)):
        receipt_results = manifest.get("execution_receipt", {}).get("test_results", [])
        statuses = {str(item.get("name")): status(item.get("status")) for item in receipt_results if isinstance(item, dict)}
        error = None if statuses else "missing signed execution test_results"
        if error:
            issues.append(f"{source_name}: {error}")
    for test in REQUIRED_TESTS:
            value = statuses.get(test, "missing")
            combined.setdefault(test, {})[source_name] = value
            if value in BLOCKED or value not in PASS:
                issues.append(f"{source_name}: required {test} test is {value or 'missing'}")
    return combined, issues


def assess_security(manifest, source_name):
    findings = manifest.get("security_findings", [])
    if findings is None:
        findings = []
    if not isinstance(findings, list):
        return [f"{source_name}: security_findings must be an array"]
    issues = []
    for index, finding in enumerate(findings):
        if isinstance(finding, str):
            issues.append(f"{source_name}: security finding {index + 1} is unresolved")
            continue
        if not isinstance(finding, dict):
            issues.append(f"{source_name}: security finding {index + 1} has invalid shape")
            continue
        finding_status = status(finding.get("status"))
        if finding_status in BLOCKED or finding_status not in PASS:
            severity = finding.get("severity", "unknown")
            issues.append(f"{source_name}: security finding {finding.get('id', index + 1)} is {finding_status or 'unresolved'} ({severity})")
    security_gate = manifest.get("security_gate")
    if security_gate is not None and status(security_gate) not in PASS:
        issues.append(f"{source_name}: security_gate is {status(security_gate) or 'missing'}")
    return issues


def assess_lineage(manifest, source_name):
    lineage = manifest.get("migration_lineage")
    if not isinstance(lineage, dict):
        return [f"{source_name}: missing migration_lineage; Phase 7.4 remains blocked"]
    expected = lineage.get("expected_count")
    missing = lineage.get("missing_count")
    state = status(lineage.get("status"))
    issues = []
    if expected != 33:
        issues.append(f"{source_name}: migration_lineage.expected_count must be 33")
    if not isinstance(missing, int) or missing != 0:
        issues.append(f"{source_name}: migration lineage still has {missing if isinstance(missing, int) else 'unknown'} missing migrations")
    if state not in {"complete", "resolved", "proven"}:
        issues.append(f"{source_name}: migration_lineage.status is {state or 'missing'}")
    return issues


def compare(prod, recon, approval_ok=False, approval_issues=None):
    approval_issues = approval_issues or []
    categories = {}
    parity_ok = True
    for category in SCHEMA_CATEGORIES:
        production = normalize(prod[category])
        reconstructed = normalize(recon[category])
        equal = production == reconstructed
        parity_ok = parity_ok and equal
        categories[category] = {
            "production_only": sorted(production - reconstructed),
            "reconstructed_only": sorted(reconstructed - production),
            "equal": equal,
            "production_count": len(production),
            "reconstructed_count": len(reconstructed),
        }

    test_matrix, test_issues = assess_tests(prod, recon)
    security_issues = assess_security(prod, "production") + assess_security(recon, "reconstructed")
    lineage_issues = assess_lineage(prod, "production") + assess_lineage(recon, "reconstructed")
    parity_issues = [category for category, value in categories.items() if not value["equal"]]
    hard_stops = parity_issues or test_issues or security_issues or lineage_issues
    tests_passed = parity_ok and not test_issues and not security_issues and not lineage_issues

    # Deliberately keep test success separate from approvals. A passing suite is
    # not permission to merge or deploy; approvals must be explicit and current.
    if hard_stops:
        release_decision = "NO-GO"
    elif not approval_ok:
        release_decision = "BLOCKED"
    else:
        release_decision = "GO"

    return {
        "provenance_gate": "PASS",
        "schema_parity": "PASS" if parity_ok else "FAIL",
        "required_test_gate": "PASS" if not test_issues else "FAIL",
        "security_gate": "PASS" if not security_issues else "BLOCKED",
        "migration_lineage_gate": "PASS" if not lineage_issues else "BLOCKED",
        "approval_gate": "PASS" if approval_ok else "BLOCKED",
        "tests_passed": tests_passed,
        "merge_approval": "approved" if approval_ok else "blocked",
        "deploy_approval": "approved" if approval_ok else "blocked",
        "release_decision": release_decision,
        "categories": categories,
        "required_tests": test_matrix,
        "issues": {"parity": parity_issues, "required_tests": test_issues, "security": security_issues, "migration_lineage": lineage_issues, "approval": approval_issues},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("production")
    parser.add_argument("reconstructed")
    parser.add_argument("--trusted-key", required=True, help="Out-of-band trusted Ed25519 public key PEM")
    parser.add_argument("--approval-receipt", required=True, help="Independently signed merge/deploy approval receipt JSON")
    parser.add_argument("--approval-key", required=True, help="Out-of-band trusted Ed25519 approval key PEM")
    parser.add_argument("--approver-registry", required=True, help="Out-of-band approver registry JSON")
    parser.add_argument("--target-revision", required=True, help="Commit SHA authorized by the approval receipt")
    parser.add_argument("--out", default="schema-parity.json")
    args = parser.parse_args()
    try:
        production = read_manifest(args.production, args.trusted_key)
        reconstructed = read_manifest(args.reconstructed, args.trusted_key)
        approval_data = json.loads(Path(args.approval_receipt).read_text(encoding="utf-8"))
        approver_registry = json.loads(Path(args.approver_registry).read_text(encoding="utf-8"))
        approval_issues = validate_approval_receipt(approval_data, args.approval_key, approver_registry, args.target_revision)
        if production.get("provenance", {}).get("role") != "production" or reconstructed.get("provenance", {}).get("role") != "reconstructed":
            raise ValueError("two role-bound manifests are required: production and reconstructed")
        if production.get("provenance", {}).get("project_ref") == reconstructed.get("provenance", {}).get("project_ref"):
            raise ValueError("Production and reconstructed manifests must come from distinct Supabase projects")
        if production.get("provenance", {}).get("environment") == reconstructed.get("provenance", {}).get("environment"):
            raise ValueError("Production and reconstructed manifests must use distinct environment identities")
        approval_ok = not approval_issues
        result = compare(production, reconstructed, approval_ok=approval_ok, approval_issues=approval_issues)
    except ValueError as exc:
        result = {
            "provenance_gate": "FAIL",
            "schema_parity": "INVALID",
            "required_test_gate": "NOT_EVALUATED",
            "security_gate": "NOT_EVALUATED",
            "migration_lineage_gate": "NOT_EVALUATED",
            "approval_gate": "NOT_EVALUATED",
            "tests_passed": False,
            "merge_approval": "NOT_EVALUATED",
            "deploy_approval": "NOT_EVALUATED",
            "release_decision": "NO-GO",
            "categories": {},
            "required_tests": {},
            "issues": {"input": [str(exc)]},
        }
        Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"output": args.out, "release_decision": "NO-GO", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"output": args.out, "schema_parity": result["schema_parity"], "tests_passed": result["tests_passed"], "release_decision": result["release_decision"], "issues": sum(len(v) for v in result["issues"].values())}, ensure_ascii=False))
    return 0 if result["release_decision"] == "GO" else 2


if __name__ == "__main__":
    raise SystemExit(main())
