---
name: git-pr-integrity-safety
description: Git branch, PR, diff integrity, and safe collaboration workflow for security-sensitive changes. Use to isolate, review, merge, and verify exact commits.
---

# Git Pr Integrity Safety

## Purpose
Make branch ancestry, diff contents, approvals, and CI status explicit. Prevent accidental main changes, secret commits, and stale-branch releases.

## When to use
Use for security fixes, migration PRs, release branches, branch cleanup, or commit/deployment provenance verification.

## When not to use
Do not use to bypass protected branches, rewrite shared history, or delete branches without explicit authorization.

## Prerequisites
Repository instructions; remote identity; branch policy; CI checks; required reviewers; clean worktree; secret scanning.

## Required inputs
Base/head refs, PR number, expected files, commit SHA, CI checks, deployment mapping, and merge/delete authorization.

## Inspection workflow
1. Confirm repository, branch, upstream, and clean status.
2. Review `git diff --check`, stat, full diff, ancestry, and changed sensitive files.
3. Verify PR checks and deployment commit identity.
4. Detect generated artifacts, secrets, unrelated changes, and branch drift.

## Remediation / implementation
Use an isolated branch and small commits. Update branch from base safely; preserve attribution; request review; merge only with required gates.

## Verification
After merge verify main SHA, CI, deployment SHA, PR state, and local refs. Confirm temporary branches/workflows are removed only when requested.

## Negative tests
Dirty worktree, unexpected diff, missing approval, stale base, failed check, secret match, or deployment SHA mismatch blocks release.

## Safety guardrails
Never log tokens. Never force-push or delete shared refs without approval. Do not commit generated secrets or local environment files.

## Production constraints
Deployment must map to the reviewed commit. Any production action requires explicit scope and evidence.

## Rollback / recovery
Revert the exact commit or use approved deployment rollback; preserve the PR and evidence trail.

## Evidence and provenance
Git status/diff, PR URL, review/check URLs, commit graph, deployment metadata, and branch cleanup result.

## PASS / FAIL criteria
PASS requires clean diff integrity, required review/checks, exact SHA provenance, and no unauthorized destructive Git operation.

## Expected output
PR safety checklist, provenance matrix, merge/cleanup record, and release handoff.

## Example commands
`git status --short --branch`; `git diff --check`; `gh pr view`; `gh run list`; `git show --stat`.

## KROM Forge integration
Map to release evidence, supply-chain, approval, and delivery-manifest capabilities; add a Git provenance adapter.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
