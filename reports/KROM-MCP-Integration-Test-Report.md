# KROM MCP Integration Test Report

## Integration contract

The new control-plane operation is `krom_v81_audit_catalog_integrity`. It is not a new broad public endpoint: it is registered in the governed control directory and is callable through `krom_dispatch_capability` after trusted-profile schema validation.

| Check | Expected |
| --- | --- |
| V75 active fabric | 11 agents and 1,465 active skills; all agents retain active-catalog access. |
| V76 metadata parity | 1,465 V76 metadata entries match V75 active identities. |
| V80 v4.3 shadow pack | 500 source-verified shadow identities; not executable by default. |
| V81 integrity response | Active/shadow counts, mapping digest, raw-hash parity, no automatic promotion/merge/delete. |
| HTTP smoke | Initialize → tools/list → dispatch V75/V81 audit → validate structured response. |
| Production safety | No production deployment or automatic catalog mutation. |

## Deployment status

- Pull request: PENDING_PULL_REQUEST
- Vercel Preview: NOT_DEPLOYED_YET
- Preview URL: PENDING_VERCEL_PREVIEW
- Local HTTP smoke: PASS

> A READY Preview validates the new branch build only. It does not modify the current Production deployment.
