#!/usr/bin/env bash
set -euo pipefail
: "${CI_REST_COMMAND:?Set CI_REST_COMMAND to the repository real REST test command}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to the real staging project}"
: "${CI_REST_TEST_PATHS:?Set CI_REST_TEST_PATHS to repository-relative REST test files}"
: "${CI_REST_RAW_RESULTS:?Set CI_REST_RAW_RESULTS to raw REST JSON results}"
CI_EVIDENCE_DIR="${CI_EVIDENCE_DIR:-evidence}"
export CI_TEST_RUN_NONCE="${CI_TEST_RUN_NONCE:-$(python3 -c 'import uuid; print(uuid.uuid4())')}"
python3 scripts/validate_ci_commands.py --area REST --command "$CI_REST_COMMAND"
CI_TEST_START_EPOCH="$(date +%s)"
echo "Running configured REST command"
bash -o pipefail -c "$CI_REST_COMMAND"
python3 scripts/verify_ci_test_evidence.py --area REST --test-paths "$CI_REST_TEST_PATHS" --raw-results "$CI_REST_RAW_RESULTS" --min-count "${CI_REST_MIN_COUNT:-1}" --started-at "$CI_TEST_START_EPOCH" --run-nonce "$CI_TEST_RUN_NONCE" --command "$CI_REST_COMMAND"
mkdir -p "$CI_EVIDENCE_DIR/ci-command-receipts"
python3 - "REST" "$CI_REST_COMMAND" "$CI_EVIDENCE_DIR/ci-command-receipts/rest.json" <<'PY'
import hashlib, json, os, sys
name, command, output = sys.argv[1:]
json.dump({"suite": name, "status": "passed", "project_ref": os.environ["SUPABASE_PROJECT_REF"], "github_run_id": os.environ.get("GITHUB_RUN_ID", ""), "github_sha": os.environ.get("GITHUB_SHA", ""), "command_sha256": hashlib.sha256(command.encode()).hexdigest()}, open(output, "w"), indent=2)
PY
