#!/usr/bin/env python3
"""Verify that a CI adapter ran known repository tests and produced raw cases."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

# Only statuses with an unambiguous test-result meaning are accepted here.
# Framework adapters must normalize any framework-specific success value to
# ``passed`` or ``pass`` before producing the raw evidence file.
PASS_STATUSES = {"passed", "pass"}


def verify(area, test_paths, raw_results, min_count=1, started_at=None, run_nonce=None, command=None):
    issues = []
    if min_count < 1:
        issues.append(f"{area}: minimum executed-case count must be greater than zero")
        min_count = 1
    paths = [Path(p) for p in test_paths if str(p).strip()]
    if not paths:
        issues.append(f"{area}: no repository test paths were configured")
    for path in paths:
        if not path.is_file():
            issues.append(f"{area}: configured test file does not exist: {path}")
    result_path = Path(raw_results)
    if not result_path.is_file():
        issues.append(f"{area}: raw result file does not exist: {result_path}")
        return issues
    if started_at is not None and result_path.stat().st_mtime < started_at:
        issues.append(f"{area}: raw result file predates this adapter execution")
    try:
        data = json.loads(result_path.read_text(encoding="utf-8"))
    except Exception as exc:
        issues.append(f"{area}: raw result file is not valid JSON: {exc}")
        return issues
    tests = data.get("tests") if isinstance(data, dict) else None
    if not isinstance(tests, list):
        issues.append(f"{area}: raw result must contain a tests array")
        return issues
    if len(tests) < min_count:
        issues.append(f"{area}: executed case count {len(tests)} is below required minimum {min_count}")
    malformed = [index for index, case in enumerate(tests) if not isinstance(case, dict)]
    if malformed:
        issues.append(f"{area}: raw results contain malformed test cases at indexes {malformed}")
    valid_cases = [case for case in tests if isinstance(case, dict)]
    area_cases = [case for case in valid_cases if str(case.get("area", "")).lower() == area.lower()]
    if len(area_cases) != len(tests):
        issues.append(f"{area}: raw results contain cases from another area")
    for case in area_cases:
        status = str(case.get("status", "")).lower().strip()
        if status not in PASS_STATUSES:
            issues.append(f"{area}: test case is not passed: {case.get('id', '<unknown>')} ({status or 'missing status'})")
        if not str(case.get("id", "")).strip():
            issues.append(f"{area}: an executed case is missing id")
    for field in ("run_id", "source_revision"):
        if isinstance(data, dict) and not str(data.get(field, "")).strip():
            issues.append(f"{area}: raw result is missing {field}")
    if not str(data.get("test_framework", "")).strip():
        issues.append(f"{area}: raw result is missing test_framework")
    if run_nonce and data.get("run_nonce") != run_nonce:
        issues.append(f"{area}: raw result run_nonce does not match this adapter execution")
    if command is not None:
        expected_hash = hashlib.sha256(command.encode()).hexdigest()
        if data.get("command_sha256") != expected_hash:
            issues.append(f"{area}: raw result command_sha256 does not match the configured command")
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--area", required=True)
    parser.add_argument("--test-paths", required=True, help="Comma-separated repository-relative test files")
    parser.add_argument("--raw-results", required=True)
    parser.add_argument("--min-count", type=int, default=1)
    parser.add_argument("--started-at", type=float)
    parser.add_argument("--run-nonce")
    parser.add_argument("--command")
    args = parser.parse_args()
    issues = verify(args.area, args.test_paths.split(","), args.raw_results, args.min_count, args.started_at, args.run_nonce, args.command)
    if issues:
        for issue in issues: print(issue, file=sys.stderr)
        return 2
    print(f"{args.area}_RAW_EVIDENCE_OK")
    return 0

if __name__ == "__main__": raise SystemExit(main())
