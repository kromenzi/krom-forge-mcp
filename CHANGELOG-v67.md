# KROM Forge v67 — Reliability & Recovery Plane

## Summary

v67 adds an evidence-bound reliability and recovery decision layer without claiming host execution or infrastructure mutation.

## Added

- Circuit-breaker planning from supplied health and evidence.
- Retry-budget calculation.
- Transitive service blast-radius assessment.
- Degraded-mode planning with criticality-aware blocking.
- Active-incident failure correlation.
- Recovery priority queue construction.
- Recovery-readiness evaluation.
- Consolidated reliability snapshot.

## Registry

- Previous target: 5,263 tools.
- v67 additions: 8 tools.
- New target: 5,271 tools.

## Boundaries

v67 is advisory. It does not execute retries, trip production breakers, mutate infrastructure, persist state or claim external recovery without host-authorized evidence and tools.

## v67.1 — Resilience Intelligence

- Added critical dependency path analysis.
- Added per-service recovery evidence scoring.
- Added aggregate recovery-confidence scoring.
- Added advisory failover sequencing.
- Added prioritized incident-containment planning.
- Hardened empty-evidence handling and recovery priority ordering.
- Registry target increased from 5,271 to 5,276 tools.
- Version bumped to 67.1.0.

