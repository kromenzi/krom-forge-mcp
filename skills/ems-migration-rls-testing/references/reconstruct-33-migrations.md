# Safe recovery of the 33 missing migrations

## Non-negotiable rule

Do not fabricate the original SQL or silently backdate reconstructed files. The original history remains `unknown` unless supported by Git/CI/deployment evidence. A current Production dump is evidence of current state, not proof of creation order.

## Phase A — Freeze and inventory

Create an immutable evidence bundle with UTC timestamps, repository commit SHAs, Git refs, CI run IDs, Supabase project ref, environment, and hashes. Inventory exactly 33 IDs and classify each as `present`, `missing`, `observed-only`, `inferred`, or `proven`. Record every later migration that depends on each missing item.

## Phase B — Recover evidence sources

Search, in order, without mutating Production:

1. Git objects, unreachable commits, reflogs, branches, tags, release archives, forks, and submodules.
2. CI artifacts, build caches, deployment bundles, Docker layers, package archives, and generated schema files.
3. Supabase migration history, deployment logs, database catalog metadata, DDL snapshots, backups, and audit records.
4. ORM schemas, seed files, RPC definitions, generated clients, API contracts, and application versions.
5. Team-owned backups or signed release bundles.

Hash each recovered artifact and preserve its source, timestamp, commit SHA, and retrieval method. Never overwrite the original evidence.

## Phase C — Build provenance and dependency graphs

For every missing migration, list the first known object appearance and all downstream consumers. Use `proven` only for direct evidence; `observed-only` for a current Production object; `inferred` for a dependency-based hypothesis; and `unknown` when neither order nor origin can be established. A hypothesis may guide reconstruction but cannot be presented as historical truth.

## Phase D — Create a reconstructed baseline

Create a new, clearly named baseline such as `reconstructed-baseline-<date>`. It must be separate from the historical migration directory and must contain an assumptions file. Make it idempotent, reviewed, and explicit about tables, columns, constraints, indexes, functions, triggers, views, grants, extensions, Storage policies, and RLS policies. Do not mark the 33 historical IDs as recovered unless their provenance is proven.

## Phase E — Prove empty-database parity

From a clean, disposable Supabase/PostgreSQL project:

1. Apply the reconstructed baseline.
2. Apply every available migration in order.
3. Run schema/catalog parity against the signed Production manifest.
4. Compare data invariants using synthetic fixtures, counts, checksums, foreign-key/orphan checks, and policy/function definitions.
5. Run RLS negative tests for tenant A/B, REST/RPC tests, Storage policy tests, Migration rollback/recovery tests, and E2E Smoke.
6. Capture host-attested signed receipts from CI or Supabase MCP for every required suite.

A passing diff proves compatibility with the observed state, not the original historical order.

## Phase F — Decision

- `NO-GO`: any cross-tenant access, missing/unknown RLS, unexplained parity difference, failed recovery, invalid signature, or `missing_count > 0` for the 33 lineage gate.
- `CONDITIONAL`: only if the owner explicitly accepts a reconstructed baseline as a new controlled starting point, with named owner, expiry, compensating controls, and no claim that history was recovered.
- `GO`: only after the 33-item lineage is complete/resolved according to the agreed Phase 7.4 acceptance criteria, signed evidence is verified with an out-of-band trusted key, parity and behavior gates pass, and merge/deploy approvals are separate and current.

## Required artifacts

`migration-lineage-inventory.csv`, `object-provenance-matrix.csv`, `reconstruction-assumptions.md`, `production-manifest.json`, `reconstructed-manifest.json`, `schema-parity.json`, raw RLS/REST/Storage/Migration/E2E results, signed execution receipts, and a reviewed Phase 7.4 decision report.
