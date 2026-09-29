# KROM Forge v26.0.0 — Real Project Inspector

## Added

- `krom_inspect_project`
- `krom_build_project_inventory`
- `krom_map_architecture`
- `krom_inventory_dependencies`
- `krom_detect_broken_routes`
- `krom_detect_duplicates`
- `krom_find_risks`
- `krom_compare_project_state`

## Design boundary

KROM Forge remains evidence-honest. v26 does not pretend the Vercel MCP server can read a user's local disk by itself. The host supplies a structured project snapshot gathered through its authorized file/repository/execution tools. KROM Forge then performs deterministic project analysis over that supplied evidence.

## Snapshot inputs

- file tree and optional content hashes
- package manifest/scripts/dependencies
- route inventory
- Git state
- diagnostics
- database/migration/RLS evidence
- auth evidence
- build/test evidence

## Outcome

v26 upgrades KROM Forge from planning-only project awareness to a reusable real-project inspection layer that can be driven by ChatGPT, Codex, or another MCP host.
