# KROM Forge v29 — Multi-Agent KROM

## New specialist-agent layer

v29 adds explicit coordination contracts for:

- Master Orchestrator
- System Architect
- Domain Researcher
- Backend Engineer
- Frontend Engineer
- UI/UX Director
- Database Architect
- Security Reviewer
- QA Engineer
- DevOps Engineer
- Release Auditor

## New MCP tools

- `krom_list_agents`
- `krom_route_agent`
- `krom_create_agent_run`
- `krom_agent_handoff`
- `krom_coordinate_agents`
- `krom_evaluate_agent_run`

## Handoff contract

Every specialist handoff uses:

- STATUS
- CHANGES
- EVIDENCE
- RISKS
- OPEN_ITEMS
- BLOCKERS
- NEXT_AGENT

A `PASS` handoff requires evidence and rejects unverified evidence. `BLOCKED` requires explicit blockers. Final multi-agent PASS can require an independent Release Auditor handoff.

## Safety boundary

KROM Forge coordinates agents and validates evidence. It does not claim that a specialist executed external tools unless the host supplied evidence. Browsing, file mutation, repository writes, database actions, execution, browser verification and deployment remain host-authorized capabilities.
