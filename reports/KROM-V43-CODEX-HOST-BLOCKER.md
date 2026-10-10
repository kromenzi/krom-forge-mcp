# KROM Forge v4.3 — Codex Host Blocker and Activation Runbook

**Status: BLOCKED — no skill execution, Canary, or production deployment was performed.** All 500 candidates remain in `SHADOW`.

## 1. Findings from the existing readiness audit

The readiness scan already read and checked all 500 v4.3 instruction files:

- Raw SHA-256 and v4.3 metadata: **500/500 pass**.
- Primary/validator agent IDs: **500/500 map to the 11-agent registry**.
- Exact duplicate instruction bodies: **0**; exact/normalized active-name collisions: **0**.
- No verified host-executed benchmark receipts exist: **0/500 candidates have execution evidence**.
- No candidate has been promoted; the catalog remains **1,465 Active / 500 Shadow**.
- The previous 500-agent semantic-review workflow returned no successful item reviews. Static lexical checks and the package's declared duplicate metrics are not a completed semantic review against all 1,465 active skills.

See `KROM-V43-Promotion-Readiness.md` and `.json` for the 500 individual static-check records. No registry values were changed by this audit.

## 2. Environment inspection and exact blocker

### Observed environment

- The only currently authorized execution device is `Manus Sandbox` (`sandbox:root:FrNhMzb1lVL0YAY0vw46e5`); no Desktop or Cloud Computer/host is available in the device list.
- `command -v codex` and `command -v codex-cli` return no executable. The checked paths `/usr/local/bin/codex`, `/usr/bin/codex`, and `/home/ubuntu/.local/bin/codex` do not exist.
- No Codex/host-related environment-variable names are configured in this task.
- Repository search found **no** `request.json`, `response.json`, benchmark `result.json`, scenario manifest, or prior host receipt.
- No MCP tool for Codex Host execution was found. The connected KROM MCP endpoint is V79 and returned `NOT_FOUND` for the V81 audit capability; branch-local V81 HTTP smoke does pass.

### Exact execution failure

The local bridge is a **filesystem request/response IPC**, not a Codex CLI launcher. `createCodexHostExecutorV80` writes a private `request.json`, then polls for a matching `response.json` every 50 ms. Its default timeout is **600,000 ms (10 minutes)** and it throws **`CODEX_HOST_TIMEOUT`** if no response is written. The unit test `tests/v80-codex-host-bridge.test.ts` explicitly verifies the terminal error `CODEX_HOST_TIMEOUT` when no host responds (using a shortened 30 ms test timeout).

Therefore, the concrete blocker is **missing Codex interactive host/response writer**, not a failed skill or bad skill hash. The 10-minute `CODEX_HOST_TIMEOUT` has not been induced against a live campaign: running without a responder would only create empty request folders, wait, and fail. No benchmark command was launched and no such empty run is represented as evidence.

The bridge's own source comment is explicit: it invokes no subprocess and no model API; a trusted operator must actually read/execute the request. Merely placing canned responses in `response.json` is not authorized and would not constitute real testing. Its transport note states that the local operator path is not signed remote attestation; trust depends on the authorized host/operator actually performing the work.

## 3. Scenario-bank status and what is needed

The V80 schema supports a real scenario bank, but the repo currently contains no scenario bank or per-case fixtures. `run-v80-codex-host.ts` accepts a JSON object shaped as `{benchmarkId, cases:[{caseId, skillName, scenarioId, scenarioRef, expectedEvidenceKinds, latencyBudgetMs}]}`. The `scenarioRef` must resolve to actual reproducible scenario instructions/fixtures for the trusted operator; the runner does not invent or retrieve those fixtures. A metadata-only URI or repeated templated record is not an executable benchmark.

Before host execution, each skill needs owner-reviewed, skill-specific cases with:

1. Concrete, versioned input/fixture data and a pinned source reference.
2. A task prompt and deterministic success/failure rubric grounded in that skill's purpose and required inputs.
3. Expected evidence artifact kinds, including validator and security evidence; negative/security boundary cases where applicable.
4. Independent reviewer identity/validator policy and latency budget.
5. A scenario catalog committed to Git **before** running the host, so `sourceCommit`, instruction hashes, and case digests bind to a clean, immutable tree.

Do not mark generated placeholders or hypothetical outputs as test results. The current audit's section checks (including headings for input/output, verification and safety) do not validate those contracts semantically.

## 4. Reproducible host setup contract

A suitable host must:

- Be an authorized, reachable device with the repository checkout and supported Node/npm installed.
- Have an actual interactive Codex host/operator able to watch the runner's request directory and write one response for each request only after actually executing the scenario with the supplied instruction and fixture. **This sandbox has neither the Codex executable nor that operator channel.**
- Preserve the source tree clean at a known 40-character Git commit. The runner fails fast with `CLEAN_SOURCE_COMMIT_REQUIRED` for a dirty tree.
- Use a fresh output directory (the script creates its leaf with `recursive:false`, mode `0700`). Keep request, response, result, and artifact files private.
- Verify each request's `protocol`, `requestId`, `requestDigest`, `sourceCommit`, and `instructionHash`; return matching values and `executor: "codex-interactive"` in `response.json`. Binding mismatch throws `HOST_RESPONSE_BINDING_MISMATCH`.
- Return a result containing `outcome`, `validatorPass`, `securityPass`, `unsupportedClaim`, `regressionDetected`, semantic/procedural similarity judgments, `specializationDistinct`, and nonempty evidence artifacts. Missing expected artifact kinds are rejected as `MISSING_EXECUTION_ARTIFACTS`.
- Preserve the exact `krom-instruction-raw-utf8-v1` bytes/hash. Receipts must validate as `HOST_EXECUTION`, `executionPerformed:true`, exact manifest-case digest, source/evidence refs, host execution ID, and the v4.3 hash contract. Fixture/self-asserted results do not count.

After an authorized host is available and scenario catalog has been reviewed and committed, the documented entry point is:

```bash
npm ci
npm run benchmark:v80:codex -- /absolute/path/to/scenarios.json /absolute/new/path/to/host-output --max-cases=100
```

`--max-cases` is limited to 1–100 per invocation. Run only after confirming that the response writer is active and can read the scenario catalog. The runner produces a receipt-bound `result.json`; verify it with the repository evidence pipeline before submitting any gate input. Resume only from a verified result bound to the exact commit, campaign and modified artifact bytes.

## 5. Gate workload and promotion sequencing

Current V80 code sets these gates:

| Gate | Per-skill evidence/metrics required |
| --- | --- |
| `SHADOW → CANARY` | ≥20 real host cases; score ≥0.90; pass ≥0.90; validator ≥0.95; evidence completeness ≥0.95; security pass 1.00; unsupported claims ≤0.02; regression ≤0.05; latency pass ≥0.90; fresh evidence; rollback ready/tested; primary and validator pass; high-risk judge where required; no open critical incident. |
| `CANARY → STABLE` | ≥60 canary cases; score ≥0.95; pass ≥0.95; validator ≥0.97; evidence completeness ≥0.98; security pass 1.00; unsupported claims ≤0.01; regression ≤0.03; latency pass ≥0.95; **≥5% canary exposure for ≥24 hours**; fresh evidence, rollback, review and incident gates. |

Canary cohort selection also caps a selection at **25 candidates** and **2 candidates per area** by default, so the 500 cannot be activated as one unchecked cohort. The campaign planner allows up to 100 skills / 2,000 planned cases per campaign; the host runner caps each run at 100 cases. Cases must be scheduled in governed cohorts and each selected skill must pass independently. The required observation period is real elapsed time; it cannot be prefilled or simulated.

## 6. Semantic overlap status

The reproducible audit found zero exact body/name collisions, and its conservative lexical comparison returned zero candidates at its chosen cutoff. Those are useful static signals, not proof that 500 procedures are semantically distinct from 1,465 active skills. The prior requested agent workflow did not yield usable item reviews. Before activating a candidate, compare its full purpose, required inputs, procedure, outputs, safety constraints, evidence model, tool/capability dependencies, and version behavior against plausible active neighbors, record pair-level evidence, and require a human decision for high overlap. Until then, retain it in `SHADOW`.

## 7. Current decision

- **Canary/Stable promotion:** none.
- **Active registry mutation:** none.
- **Production deployment:** none.
- **Missing prerequisites:** authorized Codex Host/response writer, a validated skill-specific scenario bank, and completed semantic/security review. Once these are supplied, continue from PR #56 and the existing V80 runner; do not rebuild the skill pack or fabricate receipts.
