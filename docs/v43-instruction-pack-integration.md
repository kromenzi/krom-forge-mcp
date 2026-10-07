# v4.3 instruction pack integration

500 exact original instruction files are integrated as SHADOW candidates using krom-instruction-raw-utf8-v1. The 15 existing baseline skill folders and the 1465 stable skill catalog remain preserved. No promotion is applied.

Run npm run verify:v80:v43 to check the candidate pack. The checker excludes only the explicit baseline folders, rejects unregistered candidate files, and reports missing files in its JSON result. Legacy hashes remain LEGACY_UNPROVEN; prior evidence cannot validate the new contract.

The host runner requires a caller-supplied real execution adapter. Integrity and unit tests are not host benchmark execution evidence. Status remains CONDITIONAL.

Source: supplied KROM-Forge-v80-v4.3-500-Skills (4).zip, SHA256 a6b4bc191aefe8975063afd43df4cd784ae7857220007d73d28be6b0c394328f. The original archive and Manus reports are retained under artifacts/skill-packs and deliverables-v43. Reported historical test results must not be mistaken for current integration validation.

## Integration validation

TypeScript and verify:v80 PASS. All 333 discovered tests PASS using node --import tsx --test (the tsx CLI IPC socket is blocked in this host). Next build --webpack PASS; default Turbopack cannot follow the host dependency symlink. Integrity verifier PASS: 500 hashes, UTF8 roundtrips and vectors.
