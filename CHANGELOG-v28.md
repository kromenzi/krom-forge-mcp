# KROM Forge v28 — Coding & Patch Engine

## Added

- `krom_plan_code_change`
- `krom_prepare_patch`
- `krom_validate_change_scope`
- `krom_assess_patch_risk`
- `krom_generate_migration_plan`
- `krom_generate_test_plan`
- `krom_review_diff`
- `krom_verify_patch_evidence`

## Core model

KROM Forge remains host-authorized: it plans and reviews mutations, while ChatGPT, Codex, or another authorized host performs actual file edits and commands.

The v28 workflow is:

`INSPECT → RESEARCH → PLAN → PATCH CONTRACT → HOST APPLY → DIFF REVIEW → BUILD/TEST → EVIDENCE VERIFY → RELEASE`

## Safety properties

- explicit allowed/forbidden paths
- scope-creep detection
- database/auth/deployment impact classification
- migration and rollback planning
- proportional test gates
- evidence-backed post-change review
- no fabricated code-edit/build/test success claims
