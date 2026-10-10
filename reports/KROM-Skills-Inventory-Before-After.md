# KROM Skills Inventory — Before / After

## Scope and evidence

This report inventories the repository's active runtime catalog, its v4.3 source-verified shadow pack, and physical `SKILL.md` documents. It does **not** claim that a shadow skill is executable: v80 promotion governance requires benchmark evidence before activation.

| Layer | Before V81 guard | After V81 guard | Result |
| --- | --- | --- | --- |
| Active runtime catalog | 1,465 skills | 1,465 skills | Preserved; all active names remain in V75/V76 parity. |
| v4.3 instruction pack | 500 source-verified shadow skills | 500 source-verified shadow skills | Preserved as non-executable pending governed benchmark evidence. |
| Known registry inventory | 1,965 active + shadow identities | 1,965 active + shadow identities | Lifecycle is now explicitly audited. |
| Physical SKILL.md documents | 515 | 515 | 15 stable-documented and 500 shadow-documented. |
| Automatic merges/deletions | None | None | No capability was removed or silently merged. |

## Loader and routing state

- Active skills are still reachable by **all 11 agents** through the governed V75 fabric; preferred-agent fields are routing hints, not access restrictions.
- The 500 v4.3 files are verified against raw UTF-8 SHA-256 metadata and mapped to their v80 shadow identities, primary agents, and validators. They remain **discovery/evaluation only** until the existing promotion gate receives real benchmark evidence.
- The V81 MCP control-plane audit is dispatchable as `krom_v81_audit_catalog_integrity`; it reports active/shadow parity without performing a promotion, merge, deletion, or external action.

## Requested original Manus sources

| Skill | Source status | Registry state | Action |
| --- | --- | --- | --- |
| git-commit | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| secops-hunt | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| azure-role-selector | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| finishing-a-development-branch | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| git-workflow-and-versioning | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| supabase | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| push-to-github | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| workflow | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| ci-cd-and-automation | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| sql-queries | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| sql-optimization-patterns | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| mcp-cli | BLOCKED_SOURCE_NOT_AVAILABLE | UNREGISTERED | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| github-gem-seeker | ALREADY_REGISTERED_SOURCE_AVAILABLE | STABLE | Source is available and identity is already registered; preserved without creating a duplicate. |

> **Source boundary:** 12 requested sources are BLOCKED because their original `SKILL.md` files are absent from the available Manus source root. Their content was not recreated or substituted.

## Follow-up

- Pull request: https://github.com/kromenzi/krom-forge-mcp/pull/56
- Vercel Preview: READY; external health access is protected (HTTP 401) — https://krom-forge-o0oquk5si-kromenzis-projects.vercel.app
