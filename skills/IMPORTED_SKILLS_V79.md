# KROM Forge v79 Imported Native Skill Packs

This import extends the skill catalog only. It does **not** add public MCP tools and does **not** change the 5,333 internal capability baseline.

## Imported packs
- **KROM-Forge-Native-Skills-Pack-v1.0.zip** — 100 skills — archive SHA-256 `ee2d2d4a2282d6d5f3b67db837cfe9dafe45498e8520ca993a3f2455c0f7122b`
- **KROM-Forge-Enterprise-Systems-Native-Skills-v2.0.zip** — 200 skills — archive SHA-256 `f15689ea217403367c430cb2241d005c5cd8b8c5bce4ab64e37faacff29ce6bd`

- Existing imported skills before this change: **165**
- New imported skills: **300**
- Total imported skill catalog after this change: **465**
- Specialist agents: **11**
- Internal capabilities: **5,333**
- Default public MCP tools: **15**

## Runtime integration
- All 11 agents retain `ALL_IMPORTED_SKILLS` access.
- v76 semantic routing indexes all 465 skills.
- v77 native directives and mission planning derive from the shared semantic index.
- v78 governance boundaries remain unchanged.
- Internal capability dispatch remains governed by v79 `search → describe → dispatch`.

## Pack intent
- KFG-001..KFG-100: engineering/runtime/reliability/security/testing/data/AI/product skill layer.
- ENT-001..ENT-200: enterprise-domain knowledge for systems such as ERP, HRMS/HCM, HSE/EHS, QMS, MES, CMMS/EAM, SCM/WMS, Finance, CRM, ITSM, GRC and sector workflows.

## Safety boundary
Skill presence does not prove runtime execution. Production mutations remain host-authorized, approval-gated where required, and evidence-bound.