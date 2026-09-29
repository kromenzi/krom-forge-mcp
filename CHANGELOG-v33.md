# KROM Forge v33.0.0 — Evidence Engine

Adds a project-scoped Claim–Evidence Graph so engineering claims are evaluated against explicit verified artifacts instead of prose assertions.

## New tools
- krom_create_evidence_bundle
- krom_record_claim
- krom_record_evidence_artifact
- krom_link_claim_evidence
- krom_verify_claim
- krom_audit_evidence_graph
- krom_build_release_evidence
- krom_compare_evidence_snapshots

## Core rule
Claims such as BUILD_PASSED, FIXED, DEPLOYED, UI_VERIFIED and RELEASE_READY cannot become SUPPORTED unless the required verified evidence kinds are linked. Contradictory verified evidence produces CONTRADICTED rather than PASS.
