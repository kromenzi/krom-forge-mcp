# KROM Forge v36 — Execution Policy & Approval Engine

## Added
- Action classification: AUTO_EXECUTE / REQUIRE_APPROVAL / BLOCKED.
- Risk-aware approval gates for production, destructive, irreversible, external-state, auth/secret and billing-impacting operations.
- Action-scoped approval requests and approval validation.
- Batch policy enforcement and audit.
- Execution-policy comparison.

## Safety contract
Silence is never approval. Missing, denied, expired or mismatched approval blocks consequential execution. Host capability is still required even after approval.
