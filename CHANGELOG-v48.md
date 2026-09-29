# KROM Forge v48.0.0 - Assurance Control Plane

## Added
- v48 Assurance Verification Contract tools for required release gates, evidence replay and unsupported claim detection.
- MCP registry/version integrity tools for registration parity, capabilities parity, version drift and repair planning.
- GitHub CI assurance tools for trigger/check coverage, CI evidence manifests, failure triage and Vercel-independent build gates.
- Delivery handoff guard tools for branch/commit/PR/evidence packaging, reviewer checklists, claim gaps and no-merge enforcement.
- `scripts/verify-mcp-consistency.mjs` static check for registered tools, declared capabilities and package-derived version surfaces.
- `.github/workflows/ci.yml` with `npm ci`, `npm run verify:mcp`, `npm run typecheck` and `npm run build`.

## Changed
- Version bumped to `48.0.0`.
- `package.json` now exposes `verify:mcp`, `typecheck` and `ci` scripts.
- MCP capabilities boundary now includes v48 assurance controls.

## Boundary
- v48 does not claim CI, build, deployment, PR, merge or production success without host evidence.
- GitHub CI is a verification gate, not a deployment substitute.
- Vercel preview availability is no longer required for static registration/capabilities/version/type/build checks.

