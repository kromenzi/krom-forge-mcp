#!/usr/bin/env python3
"""Summarize JSON or JUnit results without conflating tests with release approval."""
import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

from verify_evidence_provenance import verify_file as verify_provenance_file
from verify_signed_receipt import verify_manifest_file as verify_signature_file
from verify_approval_receipt import validate as validate_approval_receipt

SEVERITY = {"P0": 0, "P1": 1, "P2": 2, "Critical": 0, "High": 1, "Medium": 2, "Low": 3}
REQUIRED_AREAS = {"RLS", "REST", "Storage", "Migration"}
PASS = {"passed", "pass", "success", "ok", "complete", "completed"}
APPROVED = PASS | {"approved", "approve", "accepted", "accept"}
BLOCKED = {"blocked", "bypassed", "skipped", "skip", "unknown", "unverified", "not_run", "not-run"}

def load_json(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else {"tests": data}

def load_junit(path):
    root = ET.parse(path).getroot(); tests = []
    for i, case in enumerate(root.iter("testcase"), 1):
        status, detail = "passed", ""
        if case.find("skipped") is not None:
            status = "skipped"; detail = (case.find("skipped").text or "").strip()
        elif case.find("failure") is not None:
            status = "failed"; detail = (case.find("failure").text or case.find("failure").get("message", "")).strip()
        elif case.find("error") is not None:
            status = "error"; detail = (case.find("error").text or case.find("error").get("message", "")).strip()
        name = case.get("name", f"junit-{i}")
        tests.append({"id": name, "title": name, "area": case.get("classname", "unknown"), "priority": "P1", "status": status, "duration_ms": round(float(case.get("time", 0)) * 1000, 2), "message": detail})
    return {"run_id": Path(path).stem, "environment": "unknown", "tests": tests}

def normalize_status(value):
    value = str(value or "unknown").lower().replace(" ", "_")
    return {"ok":"passed", "pass":"passed", "success":"passed", "fail":"failed", "failure":"failed", "skip":"skipped", "xfail":"skipped"}.get(value, value)

def approval_status(data, key):
    approvals = data.get("approvals", {})
    item = approvals.get(key) if isinstance(approvals, dict) else None
    if isinstance(item, str): return normalize_status(item)
    if isinstance(item, dict): return normalize_status(item.get("status"))
    return "missing"

def required_test_gate(tests, data):
    issues, matrix = [], {}
    supplied = data.get("required_tests", {})
    for area in sorted(REQUIRED_AREAS):
        area_tests = [t for t in tests if str(t.get("area", "")).lower() == area.lower()]
        statuses = [normalize_status(t.get("status")) for t in area_tests]
        explicit = supplied.get(area) if isinstance(supplied, dict) else None
        if isinstance(explicit, str): statuses.append(normalize_status(explicit))
        elif isinstance(explicit, dict): statuses.append(normalize_status(explicit.get("status")))
        passed = any(s in PASS for s in statuses) and not any(s in BLOCKED or s not in PASS for s in statuses)
        matrix[area] = {"statuses": statuses, "passed": passed}
        if not passed: issues.append(f"required {area} evidence is missing, failed, blocked, or bypassed")
    return matrix, issues

def analyze(data):
    tests = data.get("tests", [])
    for test in tests:
        test["status"] = normalize_status(test.get("status")); test.setdefault("area", "unknown"); test.setdefault("priority", "P1")
    counts = Counter(t["status"] for t in tests); by_area = defaultdict(Counter); by_priority = defaultdict(Counter)
    for test in tests:
        by_area[test["area"]][test["status"]] += 1; by_priority[test["priority"]][test["status"]] += 1
    security = [t for t in tests if t["status"] in BLOCKED or (t["status"] in {"failed", "error"} and (str(t["area"]).lower() == "rls" or t.get("security_finding")))]
    blockers = [t for t in tests if t["status"] in {"failed", "error", "blocked", "bypassed"} and t["priority"] in {"P0", "Critical", "High"}]
    required_matrix, required_issues = required_test_gate(tests, data)
    merge, deploy = approval_status(data, "merge"), approval_status(data, "deploy")
    test_failures = [t for t in tests if t["status"] not in PASS]
    tests_passed = not test_failures and not required_issues
    if security or required_issues or blockers: release_decision = "NO-GO"
    elif merge not in APPROVED or deploy not in APPROVED: release_decision = "BLOCKED"
    else: release_decision = "GO"
    return {"run_id": data.get("run_id", "unknown"), "environment": data.get("environment", "unknown"), "total": len(tests), "counts": dict(counts), "pass_rate": round(counts["passed"] / len(tests) * 100, 2) if tests else 0, "by_area": {k: dict(v) for k, v in sorted(by_area.items())}, "by_priority": {k: dict(v) for k, v in sorted(by_priority.items(), key=lambda x: SEVERITY.get(x[0], 99))}, "required_test_matrix": required_matrix, "required_test_issues": required_issues, "security_findings": security, "blockers": blockers, "tests_passed": tests_passed, "merge_approval": merge, "deploy_approval": deploy, "release_decision": release_decision, "go_no_go": release_decision}

def md_report(summary):
    counts = summary["counts"]
    lines = [f"# Automated Test Report — {summary['run_id']}", "", f"**Environment:** {summary['environment']}  ", f"**Release decision:** **{summary['release_decision']}**", f"**Tests passed:** **{summary['tests_passed']}** | **Provenance gate:** `{summary.get('provenance_gate', 'BLOCKED')}` | **Migration lineage:** `{summary.get('migration_lineage_gate', 'BLOCKED')}` | **Approval gate:** `{summary.get('approval_gate', 'BLOCKED')}` | **Merge approval:** `{summary['merge_approval']}` | **Deploy approval:** `{summary['deploy_approval']}`", "", "## Executive summary", f"- Total: **{summary['total']}** | Passed: **{counts.get('passed',0)}** | Failed: **{counts.get('failed',0)}** | Blocked/bypassed: **{counts.get('blocked',0) + counts.get('bypassed',0)}** | Errors: **{counts.get('error',0)}**", f"- Pass rate: **{summary['pass_rate']}%**", "", "## Provenance gate", f"- Status: **{summary.get('provenance_gate', 'BLOCKED')}**", f"- Issues: {', '.join(summary.get('provenance_issues', [])) or 'none'}", f"- Approval issues: {', '.join(summary.get('approval_issues', [])) or 'none'}", "", "## Required test gates", "", "| Area | Statuses | Gate |", "|---|---|---|"]
    for area, value in summary["required_test_matrix"].items(): lines.append(f"| {area} | {', '.join(value['statuses']) or 'missing'} | {'PASS' if value['passed'] else 'BLOCKED'} |")
    lines += ["", "## Coverage by area", "", "| Area | Passed | Failed | Error | Skipped |", "|---|---:|---:|---:|---:|"]
    for area, vals in summary["by_area"].items(): lines.append(f"| {area} | {vals.get('passed',0)} | {vals.get('failed',0)} | {vals.get('error',0)} | {vals.get('skipped',0)} |")
    lines += ["", "## Security findings and blockers"]
    findings = summary["security_findings"] + [t for t in summary["blockers"] if t not in summary["security_findings"]]
    if not findings: lines.append("No security blockers reported.")
    for test in findings: lines += [f"### {test.get('id','unknown')} — {test.get('title', test.get('id',''))}", f"- Area/priority: `{test.get('area')}` / `{test.get('priority')}`", f"- Status: **{test.get('status')}**", f"- Evidence: {test.get('message') or 'No message supplied.'}", ""]
    lines += ["## Decision boundaries", "Test success does not approve merge or deployment. Both approvals must be explicit and current; missing approvals keep the release **BLOCKED**.", "", "## Recommendations", "1. Resolve every P0/Critical/High failure and every blocked security result.", "2. Supply passing RLS, REST, Storage, and Migration evidence.", "3. Obtain separate merge and deploy approvals, then rerun the release gate."]
    return "\n".join(lines) + "\n"

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("input"); parser.add_argument("--format", choices=["json", "junit"], default="json"); parser.add_argument("--out", default="report.md"); parser.add_argument("--summary", default=None); parser.add_argument("--trusted-key", default=None, help="Out-of-band trusted Ed25519 public key PEM"); parser.add_argument("--manifest", action="append", default=[], help="Signed Supabase manifest; repeat for Production and reconstructed evidence"); parser.add_argument("--approval-receipt", default=None); parser.add_argument("--approval-key", default=None); parser.add_argument("--approver-registry", default=None); parser.add_argument("--target-revision", default=None, help="Commit SHA that the signed approval must authorize")
    args = parser.parse_args()
    try: data = load_junit(args.input) if args.format == "junit" else load_json(args.input)
    except Exception as exc: print(f"Could not read results: {exc}", file=sys.stderr); return 2
    summary = analyze(data)
    provenance_issues = []
    lineage_issues = []
    approval_issues = []
    if not args.trusted_key:
        provenance_issues.append("--trusted-key is required; no out-of-band signing identity was supplied")
    if len(args.manifest) < 2:
        provenance_issues.append("two signed Supabase manifests (Production and reconstructed) are required")
    if len(set(args.manifest)) != len(args.manifest):
        provenance_issues.append("duplicate manifest path supplied; independent evidence files are required")
    if args.trusted_key:
        identities = []
        for manifest in args.manifest:
            provenance_issues.extend(verify_provenance_file(manifest))
            provenance_issues.extend(verify_signature_file(manifest, args.trusted_key))
            try:
                manifest_data = load_json(manifest)
                provenance = manifest_data.get("provenance", {})
                identities.append((provenance.get("role"), provenance.get("project_ref"), provenance.get("run_id"), provenance.get("payload_sha256")))
                lineage = manifest_data.get("migration_lineage", {})
                if lineage.get("expected_count") != 33 or lineage.get("missing_count") != 0 or str(lineage.get("status", "")).lower() not in {"complete", "resolved", "proven"}:
                    lineage_issues.append(f"{manifest}: the 33-migration lineage is incomplete or unresolved")
            except Exception as exc:
                lineage_issues.append(f"{manifest}: cannot inspect migration lineage: {exc}")
        if len(identities) >= 2:
            if {item[0] for item in identities} != {"production", "reconstructed"}:
                provenance_issues.append("manifests must have distinct production and reconstructed roles")
            if len({item[1] for item in identities}) != len(identities):
                provenance_issues.append("manifests must reference distinct Supabase project identities")
            if len({item[2] for item in identities}) != len(identities):
                provenance_issues.append("manifests must reference distinct run identities")
            if len({item[3] for item in identities}) != len(identities):
                provenance_issues.append("manifests must contain distinct payload evidence")
            environments = []
            for manifest in args.manifest:
                try:
                    environments.append(load_json(manifest).get("provenance", {}).get("environment"))
                except Exception:
                    pass
            if len(environments) >= 2 and len(set(environments)) != len(environments):
                provenance_issues.append("Production and reconstructed manifests must use distinct environment identities")
    if not args.approval_receipt or not args.approval_key or not args.approver_registry:
        approval_issues.append("signed approval receipt, approval key, and approver registry are required")
    else:
        try:
            approval_data = load_json(args.approval_receipt)
            registry = load_json(args.approver_registry)
            approval_issues.extend(validate_approval_receipt(approval_data, args.approval_key, registry, args.target_revision))
        except Exception as exc:
            approval_issues.append(f"cannot verify approval receipt: {exc}")
    summary["provenance_gate"] = "PASS" if not provenance_issues else "BLOCKED"
    summary["provenance_issues"] = provenance_issues
    summary["migration_lineage_gate"] = "PASS" if not lineage_issues else "BLOCKED"
    summary["migration_lineage_issues"] = lineage_issues
    summary["approval_gate"] = "PASS" if not approval_issues else "BLOCKED"
    summary["approval_issues"] = approval_issues
    if (provenance_issues or lineage_issues or approval_issues) and summary["release_decision"] == "GO": summary["release_decision"] = "BLOCKED" if not lineage_issues else "NO-GO"
    Path(args.out).write_text(md_report(summary), encoding="utf-8")
    if args.summary: Path(args.summary).write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"report": args.out, "summary": args.summary, "tests_passed": summary["tests_passed"], "release_decision": summary["release_decision"], "total": summary["total"]}, ensure_ascii=False))
    return 0 if summary["release_decision"] == "GO" else 2

if __name__ == "__main__": raise SystemExit(main())
