# KROM Forge v78 Imported Skill Catalog

Imported skill catalog total: **165 skills**.

## Existing catalog
- Prior validated catalog: 52 skills
- Specialist agents: 11
- Internal capability baseline: 5333
- Existing host authorization boundaries remain unchanged.

## New repair packs
- Error Repair Skill Pack v1.0 — 10 skills — archive SHA-256 `7f3cc49fb9e2001d3e6100e05aea92dc392870ae40e130bed81ef11ff3f055b5`
- Error Repair Skill Pack v2.0 — 10 skills — archive SHA-256 `89b39a9333e787413bcfc1923a4cf10994161c1e031a99eca35e1b3103d0c384`
- Advanced Repair Skills Pack v3.0 — 30 skills — archive SHA-256 `0a45175f198b753bd308f07be32b90002b586da6ae9b16ce4b09b6f39128143a`
- Ultimate Engineering Repair Skills Pack v4.0 — 50 skills — archive SHA-256 `f9cfbed8dd77b7b72376b73d967a54006cdbfccb9376133f71ad675e032cc401`

The four user-provided archives contain **100 unique SKILL.md entries**. Runtime metadata preserves each original SKILL.md SHA-256 digest.

The numeric prefixes declared by v2/v3 skills (for example `11-krom-environment-config-repair` and `21-krom-routing-navigation-repair`) are preserved exactly rather than silently renamed.

## Runtime integration
- v75 agent fabric: all 11 agents retain `ALL_IMPORTED_SKILLS`.
- v76 semantic skill index: 165 entries with routing metadata.
- v77 native runtime/directives: catalog size is derived from the shared v76 index; verifier requires 165.
- v78 governance/runtime: representative skills from all four packs are verified.
- Internal capability baseline remains **5333**. These are imported skills, not 100 additional public MCP tools.


## KSA-2026 remediation extension

- `ksa-2026-security-quality-remediation` — imported from the Manus remediation package; source SKILL.md SHA-256 `aa1e905dd1019b858be083fd43e7d1e3a95d2bccd647438d60bd38a8b17d67a4`.
- Routed across security, frontend/asset/print, QA and CI/release verification so logo/print regressions and vulnerability remediation share one evidence-bound workflow.


## Manus reusable production security/release adapters

- Package: `ksa-2026-reusable-security-release-skills` v1.0.0.
- Source archive SHA-256: `ecee00f3abb4af35d44a694ae50e40811c2774c9bfea82114576f91353f9e193`.
- Manifest SHA-256: `98cf75ff4f1fb639ef6debf014e1ef49e9f7ae3394b4b8f6e89bb342246be160`.
- Mapping SHA-256: `1b66799b63a3d5205ba8a8066b96eaa39ee2ccfeeec4f503522e7cb75a0b43a9`.
- 12 validated production adapters were added without replacing generic KROM capabilities.
- `ksa-2026-security-quality-remediation` remains the high-level remediation orchestrator; these 12 modules provide composable security, database, runtime, recovery, quality, Git and evidence workflows.
- Every adapter preserves its original SKILL.md SHA-256 in the v76 metadata index.
- Production mutations, migrations, rollback/promote, restore, branch deletion and external publication remain host-authorized and approval-gated.

### Added skills
- `production-security-hardening` — SHA-256 `22f505d3b9c29d6a13e0f773b014159c34729259f6da5f3b09b8f7774d9489f0`
- `auth-abuse-and-rate-limiting` — SHA-256 `c3f386418ea18adb4f934326f58cd8553a5102dd9eb276c9e8a81ce345900b77`
- `supabase-security-boundaries` — SHA-256 `2266e7f622c5ed5f9399d5a521821eac76c18cf94cf8eda58563ffbe7a24803a`
- `migration-and-schema-safety` — SHA-256 `ceb64f16ae7fdcc1494d12c96bb0e5978f3125fd7cb0fa51ff7d6c3d2f08a8d9`
- `production-runtime-verification` — SHA-256 `0277b92559f26e3d4a56999a927ca75654c5c6664d1f4156f0834ff51f335d9d`
- `release-gate-and-readiness` — SHA-256 `bf448d0d82314b177cf5ddee9845ecc8db0cbbf552df0095b1a33c041e123daa`
- `safe-rollback-and-recovery` — SHA-256 `9cb23f2bc142036a97c7bdedd4761be9580161ecab44a9c5ef89568da50c589b`
- `ci-dependency-quality-remediation` — SHA-256 `26aca0ac6d0dc08d3ff4a6db2ef44c47c806996ff9eafe9a80a7f5847485ee72`
- `frontend-regression-repair` — SHA-256 `1fd273a1cc1b80be13d006b5e6a32c7c2d99e73c0b265cd8cd0228b63759f943`
- `git-pr-integrity-safety` — SHA-256 `d2d54f204867eea4c19a826343a686cdbbd32a44d300c124ca64cdb7bc6fb364`
- `evidence-provenance-and-scoring` — SHA-256 `707baabc016b3f4312fbfd8ef48319fddc49e6fcf68326747146927ba4a31351`
- `security-regression-prevention` — SHA-256 `b2ecae4542e30763a9455359b639373fe242fe437378a52fcb683d5808fbeb59`
