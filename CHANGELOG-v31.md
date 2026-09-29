# KROM Forge v31.0.0 — UI/UX Intelligence Engine

## Added
- `krom_audit_ui`
- `krom_audit_responsive`
- `krom_audit_rtl`
- `krom_audit_accessibility`
- `krom_build_design_system`
- `krom_review_ui_evidence`
- `krom_compare_ui_states`
- `krom_generate_ui_fix_plan`

## Design rules
- UI claims require host-supplied rendered/browser/DOM/accessibility evidence.
- Screenshot/browser verification is never fabricated.
- Mobile, RTL and accessibility absence is surfaced as an evidence gap.
- Before/after comparisons report newly introduced high-severity findings as regressions.
- Fix plans remain route- and path-scoped and require host-applied code plus verification evidence.
