#!/usr/bin/env python3
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ROOT = Path(__file__).resolve().parents[1]
COMPARATOR = ROOT / "scripts" / "compare_schema_manifests.py"
ANALYZER = ROOT / "scripts" / "analyze_results.py"
sys.path.insert(0, str(ROOT / "scripts"))
from verify_evidence_provenance import payload_sha256
from verify_signed_receipt import canonical_receipt, trusted_key_fingerprint
from verify_approval_receipt import validate as validate_approval
from validate_ci_commands import validate as validate_ci_commands
from verify_ci_test_evidence import verify as verify_ci_test_evidence

TEST_PRIVATE_KEY = Ed25519PrivateKey.generate()
TEST_PUBLIC_KEY = TEST_PRIVATE_KEY.public_key()
APPROVAL_PRIVATE_KEY = Ed25519PrivateKey.generate()
APPROVAL_PUBLIC_KEY = APPROVAL_PRIVATE_KEY.public_key()
CATEGORIES = ["tables", "columns", "indexes", "constraints", "functions", "triggers", "views", "grants", "policies"]


def manifest(role="production", project_ref="test-project-production", **overrides):
    data = {category: ([category + ":one"] if category == "tables" else []) for category in CATEGORIES}
    data["test_evidence"] = {name: {"status": "passed", "evidence_ref": f"evidence/{name}.json"} for name in ["RLS", "REST", "Storage", "Migration"]}
    data["security_gate"] = "passed"
    data["migration_lineage"] = {"expected_count": 33, "missing_count": 0, "status": "resolved"}
    data.update(overrides)
    digest = payload_sha256(data)
    environment = "production" if role == "production" else "staging"
    data["provenance"] = {"source_type": "host_ci", "role": role, "project_ref": project_ref, "environment": environment, "captured_at": "2026-10-15T00:00:00Z", "run_id": "regression-run-" + role, "source_revision": "test-sha", "payload_sha256": digest}
    receipt = {"receipt_id": "receipt-regression-" + role, "run_id": "regression-run-" + role, "target_service": "supabase", "project_ref": project_ref, "environment": environment, "started_at": "2026-10-15T00:00:00Z", "finished_at": "2026-10-15T00:01:00Z", "exit_code": 0, "host_attested": True, "payload_sha256": digest, "tests_run": ["RLS", "REST", "Storage", "Migration"], "test_results": [{"name": name, "status": "passed", "artifact_uri": f"evidence/{name}.json", "artifact_sha256": "a" * 64} for name in ["RLS", "REST", "Storage", "Migration"]], "artifacts": [{"uri": "evidence/test-results.json", "sha256": "a" * 64}]}
    receipt["signature"] = {"algorithm": "Ed25519", "key_id": "regression-key", "key_fingerprint_sha256": trusted_key_fingerprint(TEST_PUBLIC_KEY), "signature_b64": __import__("base64").b64encode(TEST_PRIVATE_KEY.sign(canonical_receipt(receipt))).decode("ascii")}
    data["execution_receipt"] = receipt
    return data

def refresh_provenance(data):
    digest = payload_sha256(data)
    data["provenance"]["payload_sha256"] = digest
    data["execution_receipt"]["payload_sha256"] = digest
    receipt = {key: value for key, value in data["execution_receipt"].items() if key != "signature"}
    receipt["signature"] = {"algorithm": "Ed25519", "key_id": "regression-key", "key_fingerprint_sha256": trusted_key_fingerprint(TEST_PUBLIC_KEY), "signature_b64": __import__("base64").b64encode(TEST_PRIVATE_KEY.sign(canonical_receipt(receipt))).decode("ascii")}
    data["execution_receipt"] = receipt


class ComparatorRegressionTests(unittest.TestCase):
    def run_compare(self, production, reconstructed, approval=True, authorized_approver=True, target_revision="test-sha"):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory); prod = directory / "prod.json"; recon = directory / "recon.json"; out = directory / "out.json"
            prod.write_text(json.dumps(production), encoding="utf-8"); recon.write_text(json.dumps(reconstructed), encoding="utf-8")
            approval_path = directory / "approval.json"
            approval_data = {"receipt_id": "approval-regression", "approved_at": "2026-10-15T00:02:00Z", "approver_id": "release-manager", "approver_role": "release-manager", "target_revision": "test-sha", "approvals": {"merge": {"status": "approved", "approved_by": "release-manager"}, "deploy": {"status": "approved", "approved_by": "release-manager"}}} if approval else {}
            if approval: approval_data["signature"] = {"algorithm": "Ed25519", "key_id": "approval-key", "key_fingerprint_sha256": trusted_key_fingerprint(APPROVAL_PUBLIC_KEY), "signature_b64": __import__("base64").b64encode(APPROVAL_PRIVATE_KEY.sign(canonical_receipt(approval_data))).decode("ascii")}
            approval_path.write_text(json.dumps(approval_data), encoding="utf-8")
            registry = directory / "approver-registry.json"; registry.write_text(json.dumps({"release-manager": {"roles": ["release-manager"], "key_id": "approval-key"}} if authorized_approver else {"different-person": {"roles": ["release-manager"], "key_id": "approval-key"}}), encoding="utf-8")
            trusted_key = directory / "trusted-key.pem"; approval_key = directory / "approval-key.pem"
            trusted_key.write_bytes(TEST_PUBLIC_KEY.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
            approval_key.write_bytes(APPROVAL_PUBLIC_KEY.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
            result = subprocess.run([sys.executable, str(COMPARATOR), str(prod), str(recon), "--trusted-key", str(trusted_key), "--approval-receipt", str(approval_path), "--approval-key", str(approval_key), "--approver-registry", str(registry), "--target-revision", target_revision, "--out", str(out)], capture_output=True, text=True)
            return result, json.loads(out.read_text(encoding="utf-8"))

    def test_empty_manifests_are_no_go(self):
        result, report = self.run_compare({}, {})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["release_decision"], "NO-GO")
        self.assertEqual(report["schema_parity"], "INVALID")

    def test_tables_only_manifest_is_rejected(self):
        result, report = self.run_compare({"tables": ["orders"]}, {"tables": ["orders"]})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["release_decision"], "NO-GO")
        self.assertIn("missing required schema sections", report["issues"]["input"][0])

    def test_missing_required_test_blocks_result(self):
        prod = manifest(); recon = manifest(role="reconstructed", project_ref="test-project-reconstructed"); recon["execution_receipt"]["test_results"][2]["status"] = "blocked"
        refresh_provenance(recon)
        result, report = self.run_compare(prod, recon)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["release_decision"], "NO-GO")

    def test_missing_provenance_is_no_go(self):
        prod = manifest(); recon = manifest(role="reconstructed", project_ref="test-project-reconstructed"); del recon["execution_receipt"]
        result, report = self.run_compare(prod, recon)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["release_decision"], "NO-GO")
        self.assertEqual(report["schema_parity"], "INVALID")

    def test_tampered_payload_digest_is_no_go(self):
        prod = manifest(); recon = manifest(role="reconstructed", project_ref="test-project-reconstructed"); recon["tables"].append("tampered")
        result, report = self.run_compare(prod, recon)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["release_decision"], "NO-GO")
        self.assertIn("payload_sha256", report["issues"]["input"][0])

    def test_incomplete_33_migration_lineage_is_no_go(self):
        prod = manifest(); recon = manifest(role="reconstructed", project_ref="test-project-reconstructed"); recon["migration_lineage"] = {"expected_count": 33, "missing_count": 33, "status": "incomplete"}; refresh_provenance(recon)
        result, report = self.run_compare(prod, recon)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["release_decision"], "NO-GO")

    def test_blocked_security_finding_is_no_go(self):
        prod = manifest(security_findings=[{"id": "RLS-1", "severity": "Critical", "status": "blocked"}]); recon = manifest(role="reconstructed", project_ref="test-project-reconstructed")
        result, report = self.run_compare(prod, recon)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["security_gate"], "BLOCKED")
        self.assertEqual(report["release_decision"], "NO-GO")

    def test_schema_and_tests_pass_but_approvals_remain_separate(self):
        result, report = self.run_compare(manifest(), manifest(role="reconstructed", project_ref="test-project-reconstructed"), approval=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(report["tests_passed"])
        self.assertEqual(report["schema_parity"], "PASS")
        self.assertEqual(report["merge_approval"], "blocked")
        self.assertEqual(report["deploy_approval"], "blocked")
        self.assertEqual(report["release_decision"], "BLOCKED")

    def test_explicit_approvals_allow_go_after_all_gates(self):
        reconstructed = manifest(role="reconstructed", project_ref="test-project-reconstructed", approvals={"merge": "approved", "deploy": "approved"})
        result, report = self.run_compare(manifest(), reconstructed)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(report["tests_passed"], True)
        self.assertEqual(report["release_decision"], "GO")

    def test_signed_approval_without_authorized_approver_is_blocked(self):
        result, report = self.run_compare(manifest(), manifest(role="reconstructed", project_ref="test-project-reconstructed"), authorized_approver=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["approval_gate"], "BLOCKED")
        self.assertEqual(report["release_decision"], "BLOCKED")

    def test_signed_approval_for_different_commit_is_blocked(self):
        result, report = self.run_compare(manifest(), manifest(role="reconstructed", project_ref="test-project-reconstructed"), target_revision="different-sha")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(report["approval_gate"], "BLOCKED")


class AnalyzerRegressionTests(unittest.TestCase):
    def test_required_areas_and_approvals_are_separate(self):
        data = {"run_id": "regression", "tests": [{"id": area, "area": area, "priority": "P1", "status": "passed"} for area in ["RLS", "REST", "Storage", "Migration"]]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"; report = Path(directory) / "report.md"
            path.write_text(json.dumps(data), encoding="utf-8")
            result = subprocess.run([sys.executable, str(ANALYZER), str(path), "--out", str(report)], capture_output=True, text=True)
            payload = json.loads(result.stdout)
            self.assertNotEqual(result.returncode, 0)
            self.assertTrue(payload["tests_passed"])
            self.assertEqual(payload["release_decision"], "BLOCKED")

    def test_bypassed_security_result_is_no_go(self):
        data = {"tests": [{"id": "RLS-1", "area": "RLS", "priority": "P0", "status": "bypassed"}]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"; report = Path(directory) / "report.md"
            path.write_text(json.dumps(data), encoding="utf-8")
            result = subprocess.run([sys.executable, str(ANALYZER), str(path), "--out", str(report)], capture_output=True, text=True)
            payload = json.loads(result.stdout)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(payload["release_decision"], "NO-GO")

    def test_analyzer_never_goes_from_json_approvals_without_signed_manifests(self):
        data = {"approvals": {"merge": "approved", "deploy": "approved"}, "tests": [{"id": area, "area": area, "priority": "P1", "status": "passed"} for area in ["RLS", "REST", "Storage", "Migration"]]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "results.json"; report = Path(directory) / "report.md"
            path.write_text(json.dumps(data), encoding="utf-8")
            result = subprocess.run([sys.executable, str(ANALYZER), str(path), "--out", str(report)], capture_output=True, text=True)
            payload = json.loads(result.stdout)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(payload["release_decision"], "BLOCKED")

    def test_analyzer_rejects_duplicate_manifest_identity(self):
        data = {"tests": [{"id": area, "area": area, "priority": "P1", "status": "passed"} for area in ["RLS", "REST", "Storage", "Migration"]]}
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory); path = directory / "results.json"; manifest_path = directory / "manifest.json"; report = directory / "report.md"; summary = directory / "summary.json"
            path.write_text(json.dumps(data), encoding="utf-8"); manifest_path.write_text("{}", encoding="utf-8")
            result = subprocess.run([sys.executable, str(ANALYZER), str(path), "--trusted-key", str(directory / "missing-key.pem"), "--manifest", str(manifest_path), "--manifest", str(manifest_path), "--out", str(report), "--summary", str(summary)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(summary.read_text(encoding="utf-8"))
            self.assertEqual(payload["provenance_gate"], "BLOCKED")
            self.assertTrue(any("duplicate manifest" in issue for issue in payload["provenance_issues"]))


class CiCommandRegressionTests(unittest.TestCase):
    def test_placeholder_commands_are_rejected(self):
        issues = validate_ci_commands({"RLS": "true", "REST": "npm run test:rest", "Storage": "npm run test:storage", "Migration": "npm run test:migration"})
        self.assertTrue(any("RLS" in issue for issue in issues))

    def test_domainless_commands_are_rejected(self):
        issues = validate_ci_commands({"RLS": "npm test", "REST": "npm run test:rest", "Storage": "npm run test:storage", "Migration": "npm run test:migration"})
        self.assertTrue(any("expected test domain" in issue for issue in issues))

    def test_missing_known_test_file_and_raw_cases_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            result = Path(directory) / "rls.json"
            result.write_text(json.dumps({"run_id": "r1", "source_revision": "sha", "tests": []}), encoding="utf-8")
            issues = verify_ci_test_evidence("RLS", [str(Path(directory) / "missing_rls_test.py")], str(result), 1)
            self.assertTrue(any("test file does not exist" in issue for issue in issues))
            self.assertTrue(any("below required minimum" in issue for issue in issues))

    def test_raw_results_must_bind_to_nonce_and_command(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory); test_file = directory / "rls_test.py"; result = directory / "rls.json"
            test_file.write_text("# test", encoding="utf-8")
            result.write_text(json.dumps({"run_id": "r1", "source_revision": "sha", "test_framework": "pytest", "run_nonce": "old", "command_sha256": "old", "tests": [{"id": "RLS-1", "area": "RLS", "status": "passed"}]}), encoding="utf-8")
            issues = verify_ci_test_evidence("RLS", [str(test_file)], str(result), 1, run_nonce="new", command="python -m pytest tests/rls_test.py")
            self.assertTrue(any("run_nonce" in issue for issue in issues))
            self.assertTrue(any("command_sha256" in issue for issue in issues))

    def test_non_passed_cases_are_not_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory); test_file = directory / "rls_test.py"; result = directory / "rls.json"
            test_file.write_text("# test", encoding="utf-8")
            for status in ("failed", "blocked", "error", "complete", "completed", "success", "ok"):
                result.write_text(json.dumps({"run_id": "r1", "source_revision": "sha", "test_framework": "pytest", "tests": [{"id": "RLS-1", "area": "RLS", "status": status}]}), encoding="utf-8")
                issues = verify_ci_test_evidence("RLS", [str(test_file)], str(result), 1)
                self.assertTrue(any("test case is not passed" in issue for issue in issues))

    def test_malformed_case_returns_validation_issue_not_attribute_error(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory); test_file = directory / "rls_test.py"; result = directory / "rls.json"
            test_file.write_text("# test", encoding="utf-8")
            result.write_text(json.dumps({"run_id": "r1", "source_revision": "sha", "test_framework": "pytest", "tests": [None]}), encoding="utf-8")
            issues = verify_ci_test_evidence("RLS", [str(test_file)], str(result), 1)
            self.assertTrue(any("malformed test cases" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
