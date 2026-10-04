# KROM Forge v78 Imported Skill Catalog

Imported skill catalog total: **153 skills**.

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
- v76 semantic skill index: 153 entries with routing metadata.
- v77 native runtime/directives: catalog size is derived from the shared v76 index; verifier requires 153.
- v78 governance/runtime: representative skills from all four packs are verified.
- Internal capability baseline remains **5333**. These are imported skills, not 100 additional public MCP tools.


## KSA-2026 remediation extension

- `ksa-2026-security-quality-remediation` — imported from the Manus remediation package; source SKILL.md SHA-256 `aa1e905dd1019b858be083fd43e7d1e3a95d2bccd647438d60bd38a8b17d67a4`.
- Routed across security, frontend/asset/print, QA and CI/release verification so logo/print regressions and vulnerability remediation share one evidence-bound workflow.
