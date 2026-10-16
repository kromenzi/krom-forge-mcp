#!/usr/bin/env python3
"""Run the complete signed-evidence and schema-parity gate for two Staging manifests."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


def run(command):
    completed = subprocess.run(command, text=True, capture_output=True)
    return completed.returncode, completed.stdout, completed.stderr


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--production", required=True)
    parser.add_argument("--reconstructed", required=True)
    parser.add_argument("--trusted-key", required=True)
    parser.add_argument("--approval-receipt", required=True)
    parser.add_argument("--approval-key", required=True)
    parser.add_argument("--approver-registry", required=True)
    parser.add_argument("--results", required=True, help="Raw test-result JSON for analyze_results.py")
    parser.add_argument("--ci-attestation", required=True)
    parser.add_argument("--ci-project-ref", required=True)
    parser.add_argument("--ci-environment", required=True)
    parser.add_argument("--workflow-template", required=True)
    parser.add_argument("--target-revision", required=True)
    parser.add_argument("--out-dir", default="evidence/full-check")
    args = parser.parse_args()
    if Path(args.production).resolve() == Path(args.reconstructed).resolve():
        raise SystemExit("production and reconstructed manifest paths must be different")
    out = Path(args.out_dir); out.mkdir(parents=True, exist_ok=True)
    parity = out / "schema-parity.json"
    report = out / "test-report.md"
    summary = out / "test-summary.json"
    comparator = Path(__file__).resolve().parent / "compare_schema_manifests.py"
    analyzer = Path(__file__).resolve().parent / "analyze_results.py"
    verifier = Path(__file__).resolve().parent / "verify_ci_attestation.py"
    attestation_rc, attestation_out, attestation_err = run([sys.executable, str(verifier), args.ci_attestation, "--trusted-key", args.trusted_key, "--project-ref", args.ci_project_ref, "--environment", args.ci_environment, "--template-hash", hashlib.sha256(Path(args.workflow_template).read_bytes()).hexdigest()])
    compare_cmd = [sys.executable, str(comparator), args.production, args.reconstructed, "--trusted-key", args.trusted_key, "--approval-receipt", args.approval_receipt, "--approval-key", args.approval_key, "--approver-registry", args.approver_registry, "--target-revision", args.target_revision, "--out", str(parity)]
    compare_rc, compare_out, compare_err = run(compare_cmd)
    analyze_cmd = [sys.executable, str(analyzer), args.results, "--trusted-key", args.trusted_key, "--manifest", args.production, "--manifest", args.reconstructed, "--approval-receipt", args.approval_receipt, "--approval-key", args.approval_key, "--approver-registry", args.approver_registry, "--target-revision", args.target_revision, "--out", str(report), "--summary", str(summary)]
    analyze_rc, analyze_out, analyze_err = run(analyze_cmd)
    result = {
        "production_manifest": str(Path(args.production).resolve()),
        "reconstructed_manifest": str(Path(args.reconstructed).resolve()),
        "schema_parity_report": str(parity.resolve()),
        "test_report": str(report.resolve()),
        "test_summary": str(summary.resolve()),
        "comparator_exit_code": compare_rc,
        "analyzer_exit_code": analyze_rc,
        "comparator_stdout": compare_out[-4000:],
        "comparator_stderr": compare_err[-4000:],
        "analyzer_stdout": analyze_out[-4000:],
        "analyzer_stderr": analyze_err[-4000:],
        "ci_attestation_exit_code": attestation_rc,
        "ci_attestation_stdout": attestation_out[-4000:],
        "ci_attestation_stderr": attestation_err[-4000:],
        "decision": "GO" if compare_rc == 0 and analyze_rc == 0 and attestation_rc == 0 else "BLOCKED",
    }
    (out / "full-check.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["decision"] == "GO" else 2


if __name__ == "__main__": raise SystemExit(main())
