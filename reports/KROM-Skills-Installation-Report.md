# KROM Skills Installation Report

## Result

| Metric | Count |
| --- | --- |
| Requested original source packages | 13 |
| Newly installed from original source | 0 |
| Available for review, not auto-installed | 0 |
| Already registered with original source available | 1 |
| Already registered but original source unavailable | 0 |
| Blocked: original source unavailable | 12 |
| Source-generated content invented | 0 |

| Requested skill | Status | Source path checked | Outcome |
| --- | --- | --- | --- |
| git-commit | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/git-commit/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| secops-hunt | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/secops-hunt/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| azure-role-selector | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/azure-role-selector/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| finishing-a-development-branch | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/finishing-a-development-branch/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| git-workflow-and-versioning | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/git-workflow-and-versioning/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| supabase | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/supabase/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| push-to-github | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/push-to-github/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| workflow | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/workflow/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| ci-cd-and-automation | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/ci-cd-and-automation/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| sql-queries | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/sql-queries/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| sql-optimization-patterns | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/sql-optimization-patterns/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| mcp-cli | BLOCKED_SOURCE_NOT_AVAILABLE | /home/ubuntu/skills/mcp-cli/SKILL.md | Do not synthesize or copy from another source; original SKILL.md is unavailable. |
| github-gem-seeker | ALREADY_REGISTERED_SOURCE_AVAILABLE | /home/ubuntu/skills/github-gem-seeker/SKILL.md | Source is available and identity is already registered; preserved without creating a duplicate. |

## Idempotency and upgrade policy

1. Re-running the audit only rechecks the same source paths and hashes; it does not duplicate a skill entry.
2. An available source remains `AVAILABLE_FOR_REVIEW` until identity, security, dependencies, overlap, agent mapping, and test evidence pass.
3. An already registered identity remains preserved; source absence does not trigger deletion.
4. Any future upgrade must retain a versioned SHA-256 provenance record and run the V81 audit before a controlled lifecycle change.
