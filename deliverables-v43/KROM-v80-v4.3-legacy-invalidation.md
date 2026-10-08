# Legacy evidence invalidation

All benchmark manifests, receipts, evidence references, and promotion decisions bound to the old v4.2 `instructionHash` values are **INVALIDATED for v4.3**. They are not migrated, reinterpreted, or carried forward as PASS.

A v4.3 receipt must carry `instructionHashContract=krom-instruction-raw-utf8-v1` and bind to the v4.3 manifest hash. The receipt verifier rejects an absent or different contract with `LEGACY_HASH_CONTRACT_INVALIDATED`.

No prior host execution receipts were promoted by this task. No CANARY/STABLE state, repository catalog, deployment, or production state was changed.
