# KROM Forge v41.0.0 — Security & Policy Intelligence Engine

Adds evidence-driven security evaluation and security-to-release controls.

## New MCP tools
- krom_evaluate_security_assessment
- krom_audit_rls
- krom_audit_authorization
- krom_audit_secrets
- krom_audit_dependencies_security
- krom_build_security_control_matrix
- krom_recommend_security_remediation
- krom_compare_security_assessments

## Core rules
- No `SECURE`/PASS claim without evidence.
- Missing RLS or server authorization evidence is a gap; failed negative access tests are hard failures.
- Secret values are never reproduced by the engine; only exposure location/type and evidence refs are returned.
- Critical open security findings or missing mandatory controls block release readiness.
