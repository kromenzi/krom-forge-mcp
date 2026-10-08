# KROM Forge v4.3 hashing contract

## Contract

- `hashContract`: `krom-instruction-raw-utf8-v1`
- `instructionHash`: lowercase SHA-256 of the complete original `SKILL.md` byte sequence as loaded from disk.
- No trimming, Unicode normalization, newline conversion, BOM removal, or text rewriting.
- UTF-8 is decoded with `TextDecoder('utf-8', { fatal: true, ignoreBOM: true })`; invalid sequences are rejected and a leading UTF-8 BOM is preserved as U+FEFF content.
- The execution string is re-encoded as UTF-8 and must reproduce the exact loaded bytes before execution.
- `rawFileHash` is equal to the v4.3 `instructionHash`; the old value is retained separately as `legacyInstructionHash`.

## Legacy policy

The v4.2 `instructionHash` values are preserved in every v4.3 manifest entry as `legacyInstructionHash`, with status `LEGACY_UNPROVEN` and source `KROM Forge v4.2 supplied manifest.json; retained without revalidation`. They are not used as proof and cannot validate host receipts.

## Reproducibility

The generator is `scripts/generate-v80-v43-instruction-pack.ts`. It reads the old manifest only for legacy retention, reads each original `SKILL.md` as bytes, applies the contract above, writes the v4.3 manifest and per-skill `metadata.v4.3.json`, and emits `artifacts/v80-v43-instruction-test-vectors.json`. An independent verifier uses a separate SHA-256 implementation path and verified `500/500`.

## Test vectors

The complete 500-vector file is included at `artifacts/v80-v43-instruction-test-vectors.json`. Each vector includes skill name, byte length, first 16 bytes, and expected SHA-256.
