---
name: evidence-provenance-and-scoring
description: Production evidence collection, provenance metadata, security assessment scoring, and zero-blocker certification. Use to turn host results into auditable KROM Forge inputs.
---

# Evidence Provenance And Scoring

## Purpose
Separate facts, claims, plans, and unsupported assertions. Attach every consequential claim to a source, timestamp, commit, environment, and verification method.

## When to use
Use for KROM assessments, release reports, audit packages, certification, or cross-tool evidence reconciliation.

## When not to use
Do not use to manufacture evidence, convert a plan into an execution claim, or hide unavailable data.

## Prerequisites
Evidence schema; source inventory; exact release ID; timestamps; tool outputs; owner; retention location; privacy/redaction policy.

## Required inputs
CI/Vercel/GitHub/Supabase/KROM outputs, test results, deployment metadata, logs, approval, and known limitations.

## Inspection workflow
1. Normalize evidence into source, summary, verified, timestamp, SHA, environment, and URL.
2. Link claims to evidence refs.
3. Identify conflicts, stale results, missing controls, and unsupported claims.
4. Score only evidence-backed dimensions.

## Remediation / implementation
Collect missing proof, rerun stale gates, redact secrets, and record limitations. Convert unsupported PASS to PARTIAL/WARN/UNKNOWN until verified.

## Verification
Cross-check commit/deployment, workflow outcome, runtime state, test result, and security finding status. Recalculate score and hard stops.

## Negative tests
A PASS without evidence is rejected; stale/Preview evidence cannot prove Production; conflicting SHAs block certification; secret-bearing logs are invalid evidence.

## Safety guardrails
Do not include passwords, tokens, service keys, or personal data. Do not claim KROM independently executed host actions.

## Production constraints
Capture evidence during the approved window and preserve immutable links. Use UTC or explicit timezone.

## Rollback / recovery
If evidence is invalidated by rollback or redeploy, mark affected claims stale and re-collect them.

## Evidence and provenance
Structured evidence records, claim-to-source map, timestamps, commit/deployment IDs, redaction notes, KROM outputs, and report checksum.

## PASS / FAIL criteria
PASS/READY requires no unsupported consequential claim, no hard stop, and complete evidence for required dimensions.

## Expected output
Evidence manifest, scoring table, contradiction list, certification report, and KROM payloads.

## Example commands
KROM assessment/readiness/decision tools; `gh run view`; Vercel deployment/log APIs; SHA verification.

## KROM Forge integration
Directly supports `krom_create_delivery_manifest`, `krom_build_release_checklist`, `krom_evaluate_security_assessment`, and `krom_decide_release`.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
