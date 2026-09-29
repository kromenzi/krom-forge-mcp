# KROM Forge v27.0.0 — Research Engine

## Added

- `krom_classify_sources`
- `krom_extract_requirements`
- `krom_build_domain_model`
- `krom_detect_research_conflicts`
- `krom_assess_research_coverage`
- `krom_synthesize_research`

## Research Evidence Contract

KROM Forge still does not claim independent browsing. ChatGPT, Codex, or another authorized MCP host gathers current web/document evidence and passes structured source records into KROM Forge. v27 then classifies authority, preserves evidence classes, extracts explicit requirements, surfaces validation gaps, detects potential conflicts, builds a domain model, and decides whether the research is ready for synthesis.

## Evidence classes

- AUTHORITATIVE
- COMMON_PRACTICE
- BENCHMARK
- RECOMMENDATION
- ASSUMPTION

## Safety rule

A recommendation, benchmark, or assumption must never be promoted to a regulatory requirement without authoritative evidence.
