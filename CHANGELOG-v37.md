# KROM Forge v37.0.0 — Self-Evaluation & Quality Gate Engine

## Added
- `krom_get_quality_gate_policy`
- `krom_evaluate_plan_quality`
- `krom_evaluate_quality_gate`
- `krom_evaluate_delivery_quality`
- `krom_self_critique`
- `krom_compare_quality_gates`

## Quality gate dimensions
Plan, implementation, build, tests, security, UI/UX, evidence, and release readiness can be scored independently and combined using explicit weights.

## Hard stops
KROM must not claim `RELEASE_READY` when there are unmitigated CRITICAL risks, failed applicable dimensions, open blockers, or unsupported consequential claims.

## Principle
Self-evaluation is conservative. Missing evidence remains missing evidence; a self-review never upgrades absence of proof into success.
