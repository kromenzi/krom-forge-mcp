# KROM Skills Duplication Audit

## Method

The audit checks exact SHA-256 body groups, duplicate IDs, normalized registry collisions, v4.3 manifest/shadow parity, and conservative purpose/workflow lexical candidates. The classifier is intentionally **review-only**: it never converts similarity into an automatic merge, deletion, or retirement.

| Check | Result | Decision |
| --- | --- | --- |
| Exact duplicate document bodies | 0 | Any nonzero result requires human evidence before a merge. |
| Near-duplicate candidates | 0 | Boundary review; no merge performed. |
| Complementary-overlap candidates retained | 129 | Keep distinct unless owners prove replacement. |
| Duplicate active registry IDs | 0 | Must remain zero. |
| Duplicate shadow IDs | 0 | Must remain zero. |
| Active/shadow name collisions | 0 | Must remain zero. |
| v4.3 hash-to-shadow mismatches | 0 | Must remain zero. |

## Review candidates

| Class | Left | Right | Name similarity | Purpose similarity | Workflow similarity | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| C_COMPLEMENTARY | kfg-v4-0481-security-control-evidence | kfg-v4-0484-security-incident-playbook | 0.25 | 0.9167 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0191-sbom-component-provenance | kfg-v4-0195-unknown-component-quarantine | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0314-safety-control-coverage | kfg-v4-0315-safety-incident-replay | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0321-model-capability-router | kfg-v4-0324-model-version-compatibility | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0431-asset-register-reconciliation | kfg-v4-0434-asset-depreciation-evidence | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0432-asset-ownership-transfer | kfg-v4-0434-asset-depreciation-evidence | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0433-asset-criticality-model | kfg-v4-0434-asset-depreciation-evidence | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0434-asset-depreciation-evidence | kfg-v4-0435-asset-location-integrity | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0453-project-baseline-change | kfg-v4-0455-project-closeout-evidence | 0.25 | 0.88 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0457-construction-progress-evidence | kfg-v4-0459-construction-safety-permit | 0.25 | 0.875 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0456-rfisubmittal-traceability | kfg-v4-0457-construction-progress-evidence | 0.125 | 0.875 | 0.7619 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0457-construction-progress-evidence | kfg-v4-0460-asbuilt-document-control | 0.1111 | 0.875 | 0.7273 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0176-repair-scope-bounding | kfg-v4-0178-repair-plan-simulator | 0.25 | 0.8462 | 0.85 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0461-twin-entity-identity | kfg-v4-0462-twin-state-freshness | 0.25 | 0.8462 | 0.85 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0461-twin-entity-identity | kfg-v4-0464-twin-event-replay | 0.25 | 0.8462 | 0.85 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0466-device-identity-provisioning | kfg-v4-0469-device-command-idempotency | 0.25 | 0.8462 | 0.85 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0251-metric-semantic-layer | kfg-v4-0254-metric-reconciliation-pack | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0281-embedding-model-drift | kfg-v4-0282-multilingual-embedding-benchmark | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0281-embedding-model-drift | kfg-v4-0283-embedding-pii-redaction | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0281-embedding-model-drift | kfg-v4-0284-batch-embedding-backfill | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0281-embedding-model-drift | kfg-v4-0285-embedding-cache-integrity | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0282-multilingual-embedding-benchmark | kfg-v4-0283-embedding-pii-redaction | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0282-multilingual-embedding-benchmark | kfg-v4-0284-batch-embedding-backfill | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0282-multilingual-embedding-benchmark | kfg-v4-0285-embedding-cache-integrity | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0283-embedding-pii-redaction | kfg-v4-0284-batch-embedding-backfill | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0283-embedding-pii-redaction | kfg-v4-0285-embedding-cache-integrity | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0284-batch-embedding-backfill | kfg-v4-0285-embedding-cache-integrity | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0288-agent-loop-termination | kfg-v4-0289-agent-memory-provenance | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0316-llm-trace-attribution | kfg-v4-0318-retrieval-trace-completeness | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0336-document-classification-confidence | kfg-v4-0337-document-field-lineage | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0336-document-classification-confidence | kfg-v4-0338-document-duplicate-detection | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0336-document-classification-confidence | kfg-v4-0340-document-review-queue | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0337-document-field-lineage | kfg-v4-0338-document-duplicate-detection | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0337-document-field-lineage | kfg-v4-0340-document-review-queue | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0338-document-duplicate-detection | kfg-v4-0340-document-review-queue | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0351-spreadsheet-formula-lineage | kfg-v4-0354-spreadsheet-protected-range | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0356-image-metadata-privacy | kfg-v4-0357-image-transform-quality | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0356-image-metadata-privacy | kfg-v4-0358-responsive-image-budget | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0357-image-transform-quality | kfg-v4-0358-responsive-image-budget | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |
| C_COMPLEMENTARY | kfg-v4-0421-supplier-onboarding-controls | kfg-v4-0425-supplier-risk-score | 0.25 | 0.8462 | 0.8095 | KEEP_DISTINCT |

## Conflict treatment

- **Tool dependencies:** tool references are retained as evidence, not merged across skills.
- **Procedures and permissions:** differing primary/validator roles are treated as complementary controls unless an exact duplicate body is proven.
- **Versions:** v4.3 raw SHA-256 and metadata must agree; legacy v4.2 hashes remain historical provenance only.
- **Capabilities:** no new public MCP tool was added; V81 is a controlled audit capability accessed through the existing gateway.
