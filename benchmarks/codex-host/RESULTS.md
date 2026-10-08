# Codex host integration result

Implementation source: `e1774d5ef8eefc8063d60c4012e674d6083a95f0`, based on PR #54 head `3aa2e099a94e20fde84988ad0d13d81b7da0a9fe`.

The interactive Codex executor is connected to the runner through a private local request/response channel. A clean source commit, original instruction bytes/hash, fresh request nonce and digest bind each accepted result. Real execution requires the active Codex operator to service requests; this is not an autonomous remote model service.

Two live skill audits completed: repair-claim-evidence-auditor and mcp-tool-timeout-policy. Codex read each live request, inspected source, ran fresh checks, authored the audit, and obtained independent QA/security review before responding. Both receipts verified. Ten artifact hashes independently verified. The audit PASS verdicts apply to the expressly bounded local controls, not production health or the remaining 498 skills.

Validation: all 341 discovered tests passed. The new listener regression had a TypeScript import issue, fixed and retested (6/6); final Webpack production build, including TypeScript, passed. v80 gate and all 500 pack hashes/UTF-8 vectors passed. Full test counts include fixtures; fixtures do not count as live skill executions.

Run a new sample from a clean checkout:

```sh
npm run benchmark:v80:codex -- benchmarks/codex-host/sample.json /absolute/new/output-directory
```

An active Codex session must read each `requests/case-*/request.json`, execute the stated scenario using the exact instruction, have the audit independently reviewed, then publish a schema-valid response by atomic rename. Protocol and scenarios are in `scenarios.md`; concrete sample messages and results are in `evidence-20261007/live/`. Do not replay these responses: nonces and bindings change every run.

Limitations: trusted local writers can fabricate responses; no signed remote attestation. Instruction loading precedes the executor deadline. Abort stops waiting but cannot forcibly terminate an uncooperative third-party callback. Similarity was not measured (conservative 1/1/false placeholders); this sample cannot justify promotion. Remaining 498 skills were not executed. All candidates remain SHADOW. No merge, deployment or promotion performed.

At evidence capture time, KROM review transmission and GitHub push were rejected by automatic approval review. The user subsequently authorized upload to PR #54 without merge or production deployment. Git CLI lacked credentials, so the authenticated GitHub connector was used. The uploaded source commit is `fc6de48b9c32091ff317678975a5b94e540386e7`; its tree exactly matches local execution commit `e1774d5ef8eefc8063d60c4012e674d6083a95f0`. See `evidence-20261007/upload-provenance.json` for the tree hash and original commit object. Historical evidence and receipts remain unchanged. No KROM review of this new work is claimed.
