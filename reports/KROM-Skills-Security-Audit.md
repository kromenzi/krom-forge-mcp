# KROM Skills Security Audit

## Controls evaluated

| Control | Result |
| --- | --- |
| Raw UTF-8 hash contract for v4.3 pack | PASS — 500 shadow identities reconcile to the v4.3 manifest. |
| Duplicate active/shadow identity collision | PASS |
| Agent mapping validity | PASS |
| Secret-like literal scan | PASS — 0 redacted finding(s); no literal values are reported. |
| Source-import boundary | CONDITIONAL — unavailable sources are blocked rather than synthesized. |
| Automatic promotion, merge, deletion | DISABLED — V81 is audit-only and v80 shadow promotion remains evidence-gated. |

## Security rules preserved

- Every material source document remains bound to its raw SHA-256 and source path.
- A missing original Manus source is not treated as permission to recreate its content.
- Public MCP tool surface remains compact; access to the V81 audit uses the governed gateway.
- Existing host authorization and approval requirements continue to govern every consequential action.

