#!/usr/bin/env python3
"""Verify that evidence was produced by the expected GitHub Actions workflow."""
import argparse
import json
from pathlib import Path
from verify_signed_receipt import verify_signed_object


def validate(data, trusted_key, project_ref=None, environment=None, template_hash=None):
    issues = verify_signed_object(data, trusted_key, role="ci_attestation")
    for key in ("attestation_type", "repository", "workflow_ref", "workflow_sha", "run_id", "run_attempt", "project_ref", "environment", "workflow_template_sha256", "tests_job"):
        if not str(data.get(key, "")).strip(): issues.append(f"ci_attestation.{key} is missing")
    if data.get("attestation_type") != "github_actions_supabase_execution": issues.append("ci_attestation type is invalid")
    if data.get("tests_job") != "passed": issues.append("ci test job was not attested as passed")
    if project_ref and data.get("project_ref") != project_ref: issues.append("CI attestation project_ref mismatch")
    if environment and data.get("environment") != environment: issues.append("CI attestation environment mismatch")
    if template_hash and data.get("workflow_template_sha256") != template_hash: issues.append("CI attestation template hash mismatch")
    return issues


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("attestation"); parser.add_argument("--trusted-key", required=True); parser.add_argument("--project-ref"); parser.add_argument("--environment"); parser.add_argument("--template-hash")
    args = parser.parse_args(); data = json.loads(Path(args.attestation).read_text(encoding="utf-8")); issues = validate(data, args.trusted_key, args.project_ref, args.environment, args.template_hash)
    if issues:
        for issue in issues: print(issue)
        return 2
    print("CI_ATTESTATION_OK"); return 0

if __name__ == "__main__": raise SystemExit(main())
