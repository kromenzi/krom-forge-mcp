---
name: auth-abuse-and-rate-limiting
description: Production-grade authentication abuse protection covering distributed rate limits, lockout windows, Retry-After, leaked-password checks, and safe login probes. Use for login/password-reset abuse controls.
---

# Auth Abuse And Rate Limiting

## Purpose
Protect authentication endpoints against brute force and abuse while preserving usable, observable responses. Keep account, IP, route, and distributed dimensions explicit.

## When to use
Use for login, password reset, password-check, OTP, session refresh, or any credential-bearing endpoint with abuse risk.

## When not to use
Do not use to invent limits without product requirements, or to test real users, real passwords, or destructive account lockouts.

## Prerequisites
Auth endpoint contract; test account; rate-limit policy; trusted proxy/IP model; distributed store/RPC; observability; approval for production probes.

## Required inputs
Route/action, identity key policy, IP extraction rules, thresholds, window, retry duration, response schema, and test credentials held only by CI secrets.

## Inspection workflow
1. Trace every auth route and action to the rate-limit helper.
2. Confirm limits are atomic and distributed, not process-local.
3. Verify fail-open/fail-closed behavior for limiter errors.
4. Check lockout, Retry-After, constant-time responses, password feedback, and audit redaction.

## Remediation / implementation
Use an atomic server-side RPC or equivalent with bounded counters and a clear key strategy. Return HTTP 429 plus numeric `Retry-After` and stable `AUTH_RATE_LIMITED`; avoid password or token logging.

## Verification
Use a dedicated test account for successful smoke tests. Use a side-effect-free auth action for threshold tests. Confirm allowed requests, then 429, Retry-After, stable code, recovery after the window, and no secret leakage.

## Negative tests
Wrong password is rejected without account enumeration; repeated attempts trigger 429; a limiter outage follows the approved fail-open/closed policy; another IP/key is isolated; Retry-After is valid.

## Safety guardrails
Never brute-force a real account. Never log credentials. Never reset counters by deleting production data. Never bypass the distributed store in production.

## Production constraints
Use CI secrets and a dedicated test identity. Keep probes bounded and stop at the first expected 429. Do not run concurrent high-volume traffic.

## Rollback / recovery
Disable/revert only the rate-limit code or configuration through the approved deployment mechanism; do not roll back unrelated migrations unless separately approved.

## Evidence and provenance
Policy, route list, RPC/migration reference, redacted request/response status, Retry-After, test-account workflow URL, and runtime logs.

## PASS / FAIL criteria
PASS requires real Production 429 behavior, Retry-After, stable error code, successful recovery, and no runtime/RPC errors.

## Expected output
Auth-abuse test matrix, threshold results, lockout/retry contract, residual risk, and KROM Forge security evidence.

## Example commands
`curl -i -X POST "$BASE/api/auth/login?action=password-check"`; `gh run watch <run-id> --exit-status`.

## KROM Forge integration
Extend KROM identity/access hardening (`krom_v53_identity_access_harden` when available) and cite `krom_evaluate_security_assessment`; do not duplicate generic identity capabilities.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
