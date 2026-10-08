# Follow-up implementation and validation — Issue #55

Repository: `kromenzi/krom-forge-mcp`; code changes are based on PR #54 source `afbdb5ecad8e8361d8913a115e561227ebf3c625`. The prior evidence-only checkpoint commit is `3eae252d7128649dd974c7a125dd2d6545226d5c`. Platform: Linux Sandbox; no Windows Codex host/operator was attached.

## Implemented

- Resume input is no longer trusted based only on `caseId` and caller booleans. `src/v80-host-resume.ts` requires versioned checkpoint metadata, exact source commit and full campaign digest, validates receipts against the campaign manifest, recomputes SHA-256 for each supplied artifact, and checks receipt artifact references before a case can be skipped.
- The runner builds the full campaign manifest before resume filtering, binds result checkpoints to the full campaign/source, and carries forward validated PASS receipts and their artifact bytes cumulatively between batches. Prior unversioned checkpoints are rejected rather than silently skipping work.
- Added five regression tests: valid exact binding; source mismatch; campaign mismatch; tampered artifact bytes; absent artifact bytes.
- Extended `scripts/smoke-http.mjs` to perform actual read-only MCP tools/call requests (`krom_get_capabilities`, `krom_search_capabilities`, `krom_describe_capability`, and `krom_dispatch_capability`) and assert an unknown tool is rejected.

These changes improve integrity and coverage but do **not** authenticate the operator: a trusted local writer can still fabricate an entire versioned checkpoint, and the mailbox has no signed host identity/remote attestation.

## Actual validation

- Unit tests: **347/347 PASS** (`unit-tests.log`).
- TypeScript: **PASS** (command rerun after resume changes; recorded earlier in parent `typecheck.log`).
- KROM v80 verification: **PASS** (`verify-v80.log`).
- Production build: **PASS** (`build.log`).
- Local production HTTP/MCP protocol: initialize negotiated `2025-06-18`; 15 public tools listed; four read-only `tools/call` success paths passed; unknown tool returned JSON-RPC error `-32602` (`mcp-smoke.log`, detailed response capture `mcp-tools-call.json`). No production deployment was performed.

The MCP manifest checker separately passed earlier with 5,333 registered tools and zero consistency gaps. Neither static registry coverage nor HTTP tool calls count as instruction-skill executions.

## Still BLOCKED / not claimed

- **Scenario data:** no authoritative scenario/input fixtures for the remaining 498 skills were supplied. `pending-498.json` continues to carry each exact candidate/hash with `scenario: null`; none was fabricated.
- **Similarity:** semantic/procedural measurements and specialization distinction remain unmeasured. The previous two historical audits disclosed placeholder values and are not treated as similarity evidence.
- **Host permissions:** tracked project scripts are `100644` and are invoked via Node/npm; this does not establish Windows ACLs. No Windows host, user SID, DACL, inheritance, or reparse-point behavior was inspected.
- **Live skills:** zero new skill executions in this session; two distinct historical receipts remain the only recorded live audits; 498 remain pending.
- **Residual independent-review findings:** host/operator authenticity and durable signed evidence are absent; CWD-dependent repository attribution and mailbox path/ACL race protections remain for further remediation. The production deployment PowerShell script was reviewed but not invoked or changed.

No skills were activated; no merge, deploy, production change, or promotion was performed. PR #54 remains Draft.
