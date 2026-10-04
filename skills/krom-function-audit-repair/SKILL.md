---
name: krom-function-audit-repair
version: 1.0.0
description: >
  Deeply inspect, trace, diagnose, safely repair, and verify broken or suspicious
  functions across TypeScript/JavaScript/React/Next.js/API/Supabase/PostgreSQL code.
  Evidence-first. Minimal patch. No success claim without verification.
compatibility: "KROM Forge v75"
category: "debugging-code-quality-function-repair"
languages:
  - ar
  - en
---

# KROM Function Audit & Repair

## 1. Mission

Use this skill to inspect application functions end-to-end, identify the true root cause of failures, apply the smallest safe repair, and verify the repair with evidence.

This skill is designed for existing projects where a function, handler, hook, API route, Server Action, database RPC, authorization helper, or related call chain is failing, behaving incorrectly, duplicated, unused, unsafe, or inconsistent with its callers.

The required operating model is:

**INSPECT → TRACE → CLASSIFY → ROOT CAUSE → PATCH → VERIFY → REGRESSION CHECK → REPORT**

Do not skip directly to editing.

---

## 2. Trigger Conditions

Activate this skill when the user asks to:

- افحص الدوال.
- أصلح الدوال.
- افحص functions / handlers / methods.
- تتبع سبب تعطل دالة.
- أصلح API function أو Server Action.
- افحص Supabase RPC أو PostgreSQL function.
- ابحث عن الدوال المكررة أو غير المستخدمة.
- افحص callback / hook / event handler.
- Fix broken functions.
- Find invalid function calls.
- Trace a runtime function error.
- Repair a function signature mismatch.
- Check function callers and dependencies.
- Audit functions after a refactor.

Also activate it when diagnostics indicate likely function-level failure, including:

- `is not a function`
- `undefined is not a function`
- `cannot read properties of undefined`
- `not defined`
- `ReferenceError`
- `TypeError`
- `Promise rejection`
- `405 Method Not Allowed`
- `401 Unauthorized`
- `403 Forbidden`
- `500 Internal Server Error`
- invalid JSON returned from an API
- RPC/function not found
- wrong argument count
- wrong parameter type
- stale closure
- invalid hook call
- recursive loop
- database function permission failure

---

## 3. Supported Targets

Inspect all relevant function-like units, including:

### Application code
- Named functions
- Anonymous functions
- Arrow functions
- Class methods
- Static methods
- Object methods
- Callbacks
- Event handlers
- Utility functions
- Service functions
- Repository/data-access functions
- Validation functions
- Formatting functions

### React / frontend
- React event handlers
- Hooks
- Hook callbacks
- `useEffect`
- `useMemo`
- `useCallback`
- state update callbacks
- form submit handlers
- mutation handlers
- async UI actions

### Next.js
- Route Handlers
- Server Actions
- Middleware helpers
- API handlers
- page/layout data functions
- server-only utilities
- client/server boundary functions

### Backend / API
- REST handlers
- RPC handlers
- service methods
- controller methods
- authorization helpers
- session helpers
- request parsers
- response serializers
- background task handlers

### Database / Supabase
- Supabase RPC calls
- PostgreSQL functions
- PostgreSQL procedures
- triggers and trigger functions
- Edge Functions
- RLS helper functions
- permission helper functions
- database access wrappers

---

## 4. Non-Negotiable Rules

### 4.1 Evidence before mutation
Never edit a function based only on its name or a guessed symptom.

At minimum identify:

- file path
- function name or symbol
- current signature
- export status
- call sites
- runtime/type/build evidence if available
- expected behavior
- actual behavior

### 4.2 Trace callers and callees
A function is not evaluated in isolation.

Inspect:

- who calls it
- what it calls
- parameters received
- return value expected
- async behavior
- side effects
- authentication context
- database context
- error handling

### 4.3 Minimal patch
Prefer the smallest change that resolves the verified root cause.

Do not perform unrelated refactors during repair.

### 4.4 Never hide a defect
Do not "fix" failures by using:

- `as any`
- `@ts-ignore`
- `@ts-nocheck`
- broad `eslint-disable`
- swallowed exceptions
- empty catch blocks
- fake fallback values
- disabled validation
- disabled authentication
- disabled authorization
- disabled RLS
- hard-coded admin bypasses

unless there is explicit, documented, evidence-backed justification.

### 4.5 No success claim without verification
Do not report "fixed", "working", "resolved", or "passed" unless supported by relevant evidence.

If verification was not possible, report:

**PATCHED — VERIFICATION INCOMPLETE**

not:

**FIXED**

### 4.6 Preserve security boundaries
Never weaken authentication, authorization, RLS, ownership checks, tenant isolation, or privilege boundaries just to make a function work.

### 4.7 Do not delete "unused" functions casually
Before deleting a function classified as unused, rule out:

- dynamic imports
- string-based references
- framework conventions
- route exports
- reflection
- plugin registration
- event registration
- external API consumption
- database references
- scheduled jobs
- tests
- generated code

---

## 5. KROM Forge v75 Tool Contract

### Required tools

Use these when applicable:

1. `krom_route_workflow`
2. `krom_inspect_project`
3. `krom_detect_broken_routes`
4. `krom_detect_duplicates`
5. `krom_find_risks`
6. `krom_audit_api_contracts`
7. `krom_audit_authorization`
8. `krom_audit_rls`
9. `krom_prepare_patch`
10. `krom_assess_patch_risk`
11. `krom_generate_test_plan`
12. `krom_review_diff`
13. `krom_verify_patch_evidence`
14. `krom_verify_debug_fix`
15. `krom_evaluate_test_coverage`
16. `krom_v73_build_patch_bundle`
17. `krom_v73_verify_patch_bundle`

### Optional orchestration tools

For complex cross-domain failures, use when available:

- `krom_build_task_graph`
- `krom_route_agent`
- `krom_agent_handoff`
- `krom_coordinate_agents`
- `krom_create_debug_session`
- `krom_classify_failure`
- `krom_next_debug_diagnostic`
- `krom_set_root_cause`
- `krom_evaluate_debug_closure`
- `krom_build_assurance_verification_contract`
- `krom_evaluate_production_readiness`

KROM planning/audit tools do not automatically prove that source files were changed. Actual mutation must be performed by an authorized host editing mechanism and verified afterward.

---

## 6. Phase A — Build the Function Inventory

Create a function inventory before repair.

For each discovered function record:

| Field | Required |
|---|---|
| ID | Yes |
| File path | Yes |
| Function name | Yes |
| Kind | Yes |
| Exported | Yes |
| Async | Yes |
| Parameters | Yes |
| Return type | Yes |
| Callers | Yes |
| Callees | Yes |
| Side effects | Yes |
| Auth dependency | If applicable |
| DB dependency | If applicable |
| Route/API dependency | If applicable |
| Test coverage | If known |
| Current status | Yes |

### Function kinds

Classify as one of:

- `FUNCTION`
- `ARROW_FUNCTION`
- `METHOD`
- `CALLBACK`
- `EVENT_HANDLER`
- `HOOK`
- `SERVER_ACTION`
- `ROUTE_HANDLER`
- `API_HANDLER`
- `DB_FUNCTION`
- `RPC`
- `TRIGGER_FUNCTION`
- `EDGE_FUNCTION`
- `AUTH_HELPER`
- `VALIDATOR`
- `SERIALIZER`
- `UTILITY`
- `UNKNOWN`

---

## 7. Phase B — Build the Call Graph

For every suspect function determine:

```text
ENTRY POINT
  ↓
CALLER
  ↓
TARGET FUNCTION
  ↓
DEPENDENCIES
  ↓
DATABASE / API / AUTH / FILESYSTEM / EXTERNAL SERVICE
  ↓
RETURN VALUE
  ↓
CALLER CONSUMPTION
```

Record:

- direct callers
- indirect callers when relevant
- argument mapping
- returned value usage
- thrown errors
- Promise behavior
- mutable state
- external side effects

Do not repair the target until the failing edge in the call chain is identified.

---

## 8. Phase C — Classify Findings

Use the following finding taxonomy.

### Compilation / Type

- `COMPILE_FAIL`
- `TYPE_MISMATCH`
- `INVALID_SIGNATURE`
- `MISSING_IMPORT`
- `INVALID_EXPORT`
- `CIRCULAR_IMPORT`
- `WRONG_GENERIC`
- `NULL_UNSAFE`

### Runtime

- `RUNTIME_THROW`
- `UNDEFINED_CALL`
- `INVALID_OBJECT_ACCESS`
- `BAD_BRANCH`
- `INFINITE_RECURSION`
- `STACK_OVERFLOW`
- `RACE_CONDITION`
- `MUTATION_BUG`
- `ERROR_SWALLOWED`

### Async

- `MISSING_AWAIT`
- `UNHANDLED_REJECTION`
- `PROMISE_CONTRACT_MISMATCH`
- `ASYNC_RACE`
- `TIMEOUT_MISSING`
- `ABORT_NOT_HANDLED`

### React

- `HOOK_RULE_VIOLATION`
- `STALE_CLOSURE`
- `BAD_DEPENDENCY_ARRAY`
- `STATE_UPDATE_RACE`
- `RENDER_LOOP`
- `CLIENT_SERVER_BOUNDARY_ERROR`

### API / Route

- `BROKEN_ROUTE`
- `METHOD_MISMATCH`
- `API_CONTRACT_DRIFT`
- `INVALID_REQUEST_PARSE`
- `INVALID_RESPONSE_SHAPE`
- `NON_JSON_ERROR_RESPONSE`
- `STATUS_CODE_MISMATCH`

### Authentication / Authorization

- `AUTH_CONTEXT_MISSING`
- `AUTH_CHECK_MISSING`
- `AUTHORIZATION_GAP`
- `ROLE_CHECK_MISMATCH`
- `TENANT_SCOPE_MISSING`
- `PRIVILEGE_ESCALATION_RISK`

### Database / Supabase

- `RPC_SIGNATURE_MISMATCH`
- `DB_FUNCTION_NOT_FOUND`
- `DB_SCHEMA_MISMATCH`
- `RLS_MISMATCH`
- `DB_PERMISSION_ERROR`
- `WRONG_SCHEMA`
- `TRIGGER_FAILURE`
- `SECURITY_DEFINER_RISK`
- `TRANSACTION_BOUNDARY_ERROR`

### Code quality

- `DEAD_CODE`
- `UNREACHABLE_CODE`
- `DUPLICATE_LOGIC`
- `DUPLICATE_FUNCTION`
- `OVERLOADED_RESPONSIBILITY`
- `SIDE_EFFECT_LEAK`
- `MISSING_VALIDATION`
- `MISSING_ERROR_CONTEXT`

---

## 9. Severity

Assign severity using:

### P0 — Critical
- security bypass
- privilege escalation
- destructive data behavior
- production-wide outage
- corruption risk

### P1 — High
- major route/function broken
- login/auth failure
- save/update operation broken
- repeated 500s
- core workflow unusable

### P2 — Medium
- partial workflow broken
- incorrect edge-case behavior
- poor error handling
- duplicate logic causing drift

### P3 — Low
- unused function
- cleanup candidate
- maintainability issue
- naming/typing improvement with no current failure

---

## 10. Root-Cause Requirement

Before editing, write a root-cause statement using this exact structure:

```text
Symptom:
Observed evidence:
Affected function:
Caller:
Callee/dependency:
Expected contract:
Actual contract:
Root cause:
Why this root cause explains the symptom:
Repair target:
Regression risk:
```

If root cause is not yet proven, mark:

`ROOT_CAUSE_STATUS: HYPOTHESIS`

Do not proceed as if it is confirmed.

When evidence confirms it, mark:

`ROOT_CAUSE_STATUS: CONFIRMED`

---

## 11. Repair Decision Rules

### Type mismatch
Fix the actual contract.

Do not automatically cast to `any`.

Check:

- parameter type
- caller type
- return type
- nullable state
- generated types
- API schema
- DB schema

### Missing `await`
Verify whether the caller expects:

- a Promise
- resolved data
- fire-and-forget behavior

Add `await` only where contractually correct.

### 405 Method Not Allowed
Inspect:

- route file location
- exported HTTP method
- client request method
- framework route conventions
- middleware/proxy behavior

Do not mask with a generic catch-all method.

### 401 / 403
Inspect:

- session presence
- token propagation
- server-side authorization
- role mapping
- tenant ownership
- RLS policy
- RPC grants

Do not bypass the permission check.

### 500 with invalid JSON
Inspect whether the client expects JSON but receives:

- framework HTML error page
- proxy page
- plain text
- empty response

Repair server response behavior and root server error, not just the JSON parser.

### Supabase RPC mismatch
Check:

- schema
- function name
- parameter names
- parameter order
- parameter types
- return type
- grants
- RLS interaction
- SECURITY DEFINER behavior

### React stale closure
Inspect:

- captured variables
- hook dependencies
- functional state updates
- memoization
- rerender behavior

### Duplicate function
Do not consolidate solely by name similarity.

Prove:

- behavior equivalence
- compatible signatures
- same side effects
- same security assumptions
- compatible callers

### Dead function
Delete only after proving no valid runtime/reference path exists.

---

## 12. Patch Planning

Before changing code, produce a patch plan:

```text
PATCH PLAN

Objective:
Files allowed to change:
Files forbidden to change:
Functions to modify:
Functions to create:
Functions to remove:
API impact:
Database impact:
Auth impact:
UI impact:
Migration impact:
Rollback method:
Verification gates:
```

Run:

- `krom_prepare_patch`
- `krom_assess_patch_risk`
- `krom_generate_test_plan`

when available and applicable.

---

## 13. Patch Execution Rules

During repair:

1. Change only necessary files.
2. Preserve existing public interfaces unless contract change is intentional.
3. Preserve backward compatibility where required.
4. Do not rename exported functions without tracing consumers.
5. Do not change database function signatures without checking every caller.
6. Do not modify auth/RLS logic without explicit security verification.
7. Add explicit error context where useful.
8. Keep error responses deterministic.
9. Avoid broad refactors during incident repair.
10. Record every changed function and why.

---

## 14. Verification Matrix

Run only applicable gates, but never omit an applicable critical gate.

| Function type | Required verification |
|---|---|
| Pure utility | typecheck + unit test |
| Shared service | typecheck + unit/integration |
| React handler | typecheck + UI/runtime behavior |
| Hook | typecheck + render/runtime test |
| API handler | request/response contract + status codes |
| Route Handler | route method + response + auth |
| Server Action | invocation + validation + auth |
| Auth helper | positive + negative authorization tests |
| Supabase RPC | RPC call + signature + permissions |
| DB function | execution + transaction + permission behavior |
| RLS helper | positive + negative access tests |
| Edge Function | invocation + error path + auth |
| Critical workflow | targeted E2E/regression test |

### Standard engineering gates

When the project supports them, run:

- typecheck
- lint
- unit tests
- integration tests
- focused regression tests
- build
- runtime/API verification
- browser verification where UI behavior is affected

---

## 15. Debug Closure Rules

A function repair can be marked `VERIFIED_FIXED` only if:

- root cause is confirmed
- the patch addresses the root cause
- changed function compiles/types correctly
- relevant tests pass
- build passes when applicable
- runtime path passes when applicable
- API/DB contract passes when applicable
- auth/RLS negative checks pass when applicable
- no new critical diagnostics are introduced
- diff stays within approved scope

Otherwise use one of:

- `PATCHED_NOT_VERIFIED`
- `PARTIALLY_VERIFIED`
- `BLOCKED_BY_MISSING_EVIDENCE`
- `BLOCKED_BY_EXTERNAL_DEPENDENCY`
- `ROOT_CAUSE_NOT_CONFIRMED`

---

## 16. Regression Check

After repair, inspect adjacent behavior:

- callers of changed function
- other functions using same type/interface
- sibling API methods
- shared validators
- shared DB RPC wrappers
- related authorization paths
- related UI actions
- tests affected by signature changes

Use:

- `krom_review_diff`
- `krom_verify_patch_evidence`
- `krom_verify_debug_fix`
- `krom_evaluate_test_coverage`
- `krom_v73_build_patch_bundle`
- `krom_v73_verify_patch_bundle`

when applicable.

---

## 17. Security Guardrails

Immediately flag as P0/P1 if a proposed repair:

- disables RLS
- removes authorization
- makes an authenticated route public
- hardcodes admin access
- exposes service-role credentials
- exposes secrets in client code
- changes `SECURITY INVOKER` / `SECURITY DEFINER` semantics unsafely
- trusts client-provided role/tenant IDs without server verification
- weakens input validation on privileged functions

Do not approve the repair until the security regression is removed.

---

## 18. Function Audit Output Format

Always return a concise audit table.

```text
FUNCTION AUDIT

Total functions inspected:
Healthy:
Broken:
Suspect:
Duplicate:
Unused:
Security-sensitive:
Repaired:
Verified:
Blocked:
```

Then report each finding:

```text
[FUNCTION FINDING]

ID:
Severity:
Status:
File:
Function:
Kind:
Caller:
Failure class:
Evidence:
Root cause:
Repair:
Verification:
Regression risk:
Remaining issue:
```

---

## 19. Final Repair Report

Use this structure:

```text
KROM FUNCTION REPAIR REPORT

Scope:
Functions inspected:
Functions changed:
Files changed:

Critical findings:
High findings:
Medium findings:
Low findings:

Confirmed root causes:

Repairs applied:

Verification evidence:
- Typecheck:
- Lint:
- Tests:
- Build:
- API:
- Runtime/UI:
- Database:
- Auth/RLS:

Regression checks:

Unverified items:

Final status:
VERIFIED_FIXED | PARTIALLY_VERIFIED | PATCHED_NOT_VERIFIED | BLOCKED

Next recommended action:
```

If the user writes in Arabic, produce the human-facing report in Arabic while keeping code symbols, function names, tool names, routes, errors, and technical identifiers unchanged.

---

## 20. Autonomous Workflow

When the user says:

- "افحص وصلح"
- "ابدأ"
- "كمل"
- "صلح الدوال كلها"

do not repeatedly ask for confirmation.

Proceed with the safest available evidence-driven workflow:

1. inspect available project evidence
2. inventory functions
3. rank failures
4. start with P0/P1
5. trace root cause
6. prepare minimal patch
7. apply authorized changes
8. verify
9. continue to next broken function
10. stop only at a real blocker, destructive boundary, missing authorization, or missing required evidence

Never claim work was performed if the environment did not actually provide file/runtime access.

---

## 21. Quality Bar

The skill succeeds only when it can answer:

1. Which function is broken?
2. Where is it defined?
3. Who calls it?
4. What does it call?
5. What contract is violated?
6. What evidence proves the failure?
7. What is the confirmed root cause?
8. What exact minimal change fixes it?
9. What could regress?
10. What evidence proves the repair works?

If any answer is unknown, state it explicitly.

---

## 22. Example User Commands

Arabic:

```text
استخدم مهارة krom-function-audit-repair وافحص جميع الدوال في المشروع.
ابدأ بالدوال المكسورة ثم تتبع الاستدعاءات وأصلح السبب الجذري.
لا تحذف أي دالة غير مستخدمة حتى تتأكد من جميع call sites.
بعد كل إصلاح شغل typecheck والاختبارات والبناء، وافحص API وSupabase إذا كانت الدالة مرتبطة بها.
لا تعتبر الإصلاح ناجحاً بدون دليل تحقق.
```

English:

```text
Use krom-function-audit-repair to inspect every function in the project.
Prioritize broken and security-sensitive functions, trace callers/callees,
confirm root cause, apply the smallest safe patch, and verify with typecheck,
tests, build, API/runtime evidence, and DB/auth checks where applicable.
Do not claim success without evidence.
```

---

## 23. Acceptance Criteria

The skill is acceptable when:

- function inventory exists
- broken functions are evidence-backed
- call paths are traced
- root causes are classified
- security boundaries remain intact
- patch scope is minimal
- affected contracts are checked
- applicable test/build/runtime gates are run
- diff is reviewed
- regressions are checked
- final status reflects actual evidence

---

## 24. Core Principle

**A function is not fixed when the error disappears.  
A function is fixed when its contract, callers, dependencies, security boundaries, and runtime behavior are verified to be correct.**