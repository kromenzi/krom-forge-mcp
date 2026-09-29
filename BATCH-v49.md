# KROM Forge v49 - Release Integrity Mesh

KROM Forge v49 adds six integrated control layers that turn release evidence into an enforceable chain from source revision to merge decision.

## Layers

1. **Release provenance** binds claims, gates, artifacts, digests, branch, version and commit identity.
2. **Risk-adaptive verification** derives required gates from reversibility, visibility and affected engineering domains.
3. **MCP contract assurance** catalogs tool contracts, detects breaking changes and generates a deterministic contract-test matrix.
4. **CI run evidence** validates branch and commit binding before trusting a successful run.
5. **Recovery rehearsal** evaluates isolated failure scenarios, required capabilities, RTO/RPO and recovery evidence.
6. **Merge policy enforcement** binds required checks and approvals to the exact commit and detects bypasses.

## Delivery chain

```text
CHANGE
  -> RISK CLASSIFICATION
  -> REQUIRED VERIFICATION GATES
  -> TOOL CONTRACT TESTS
  -> COMMIT-BOUND CI EVIDENCE
  -> RELEASE ATTESTATION
  -> RECOVERY REHEARSAL
  -> MERGE POLICY DECISION
```

## Evidence boundary

KROM evaluates only supplied evidence. It does not compute artifact authenticity, execute recovery actions, approve merges, deploy releases, or convert missing evidence into a pass. Failure injection plans explicitly require an isolated environment and abort when production is targeted.

## Automated verification

The repository CI runs registry/capability/version verification, TypeScript, unit tests, production dependency audit and Next.js build. The machine-readable MCP verification report is uploaded as a GitHub Actions artifact.
