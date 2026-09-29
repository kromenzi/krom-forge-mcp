import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { routeRequest, researchDimensions, researchSourceHierarchy, acceptanceDimensions } from '../../src/knowledge';
import { auditProject, buildTaskGraph, createRunState, resumeRun, selectTools, verifyEvidence } from '../../src/orchestrator';
import { projectSnapshotSchema } from '../../src/project-schema';
import { buildProjectInventory, compareProjectState, detectBrokenRoutes, detectDuplicates, findProjectRisks, inspectProject, inventoryDependencies, mapArchitecture } from '../../src/project-inspector';
import { researchEvidenceSchema } from '../../src/research-schema';
import { assessResearchCoverage, buildDomainModel, classifyResearchSources, createResearchSynthesis, detectResearchConflicts, extractRequirements } from '../../src/research-engine';
import { patchRequestSchema, diffReviewSchema } from '../../src/patch-schema';
import { assessPatchRisk, generateMigrationPlan, generateTestPlan, planCodeChange, preparePatch, reviewDiff, validateChangeScope, verifyPatchEvidence } from '../../src/patch-engine';
import { agentHandoffSchema, agentRunSchema } from '../../src/multi-agent-schema';
import { buildHandoffSummary, coordinateAgents, createAgentRun, evaluateAgentRun, listAgents, routeAgent } from '../../src/multi-agent-engine';
import { projectMemorySchema, projectMemoryCreateSchema, memoryUpdateSchema, recordDecisionInputSchema, recordFailureInputSchema, recordEvidenceInputSchema, recordTestInputSchema, recordDeploymentInputSchema, recordTaskInputSchema, recordRiskInputSchema, recordSnapshotInputSchema, compareMemorySnapshotsSchema } from '../../src/project-memory-schema';
import { createProjectMemory, getProjectMemorySummary, updateProjectMemory, recordDecision, recordFailure, recordEvidence, recordTestResult, recordDeployment, recordTask, recordRisk, recordSnapshot, getProjectTimeline, compareProjectMemories, evaluateMemoryIntegrity } from '../../src/project-memory-engine';
import { uiAuditInputSchema, designSystemInputSchema, compareUiStatesSchema, uiFixPlanSchema } from '../../src/uiux-schema';
import { auditUi, auditResponsive, auditRtl, auditAccessibility, buildDesignSystem, reviewUiEvidence, compareUiStates, generateUiFixPlan } from '../../src/uiux-engine';
import { createDebugSessionSchema, addDebugEvidenceSchema, addHypothesisSchema, recordAttemptSchema, updateReproductionSchema, setRootCauseSchema, recordFixSchema, verifyFixSchema, debugSessionSchema } from '../../src/debugging-schema';
import { createDebugSession, classifyFailure, addEvidence, addHypothesis, recordAttempt, updateReproduction, setRootCause, recordFix, verifyFix, buildRootCauseGraph, antiLoopCheck, recommendNextDiagnostic, evaluateDebugClosure } from '../../src/debugging-engine';
import { createEvidenceBundleSchema, evidenceBundleSchema, recordClaimInputSchema, recordArtifactInputSchema, linkClaimEvidenceSchema, verifyClaimInputSchema, compareEvidenceBundlesSchema } from '../../src/evidence-schema';
import { createEvidenceBundle, recordClaim, recordArtifact, linkClaimEvidence, verifyClaim, auditEvidenceGraph, buildReleaseEvidence, compareEvidenceBundles } from '../../src/evidence-engine';
import { createAutonomousLoopSchema, autonomousLoopSchema, advanceLoopSchema, loopHostResultSchema } from '../../src/autonomous-loop-schema';
import { createAutonomousLoop, advanceAutonomousLoop, recordLoopHostResult, getNextAutonomousAction, auditAutonomousLoop, summarizeAutonomousLoop } from '../../src/autonomous-loop-engine';
import { hostCapabilitySnapshotSchema, assessCapabilityRequirementsSchema, compareHostSnapshotsSchema } from '../../src/host-capability-schema';
import { summarizeHostCapabilities, assessCapabilityRequirements, adaptLoopToHost, recommendHostStrategy, compareHostSnapshots, validateHostEvidence } from '../../src/host-capability-engine';
import { executionActionSchema, executionPolicySchema, approvalRecordSchema, classifyExecutionActionSchema, createApprovalRequestSchema, evaluateApprovalSchema, enforceExecutionPolicySchema, compareExecutionPoliciesSchema } from '../../src/execution-policy-schema';
import { defaultExecutionPolicy, classifyExecutionAction, createApprovalRequest, evaluateApproval, enforceExecutionPolicy, auditExecutionPolicy, compareExecutionPolicies } from '../../src/execution-policy-engine';
import { qualityGateInputSchema, planQualityInputSchema, deliveryQualityInputSchema, compareQualityGatesSchema } from '../../src/quality-gate-schema';
import { getDefaultQualityGate, evaluateQualityGate, evaluatePlanQuality, evaluateDeliveryQuality, selfCritique, compareQualityGates } from '../../src/quality-gate-engine';
import { restorePointSchema, recoveryImpactSchema, recoveryPlanSchema, recoveryExecutionSchema, recoveryVerificationSchema, compareRestorePointsSchema } from '../../src/recovery-rollback-schema';
import { createRestorePoint, assessRecoveryImpact, buildRecoveryPlan, validateRecoveryExecution, verifyRecovery, recommendRecoveryStrategy, compareRestorePoints } from '../../src/recovery-rollback-engine';
import { observabilitySnapshotSchema, serviceHealthInputSchema, anomalyInputSchema, incidentCorrelationSchema, sloInputSchema, compareObservabilitySnapshotsSchema } from '../../src/observability-schema';
import { normalizeRuntimeSignals, evaluateServiceHealth, detectRuntimeAnomalies, correlateRuntimeIncident, evaluateSlo, buildRuntimeEvidence, recommendRuntimeAction, compareObservabilitySnapshots } from '../../src/observability-engine';
import { productionReadinessInputSchema, releaseDecisionSchema, releaseExceptionSchema, postReleaseVerificationSchema, compareReadinessSchema } from '../../src/release-control-schema';
import { evaluateProductionReadiness, decideRelease, buildReleaseChecklist, evaluateReleaseException, verifyPostRelease, createReleaseControlSummary, compareProductionReadiness } from '../../src/release-control-engine';
import { securityAssessmentSchema, rlsAuditSchema, authzAuditSchema, secretsAuditSchema, dependencyAuditSchema, compareSecurityAssessmentsSchema } from '../../src/security-policy-schema';
import { evaluateSecurityAssessment, auditRls, auditAuthorization, auditSecrets, auditDependencies, buildSecurityControlMatrix, recommendSecurityRemediation, compareSecurityAssessments } from '../../src/security-policy-engine';
import { complianceAssessmentSchema, complianceExceptionSchema, governanceDecisionSchema, compareComplianceAssessmentsSchema } from '../../src/compliance-governance-schema';
import { evaluateComplianceAssessment, mapComplianceEvidence, buildControlCoverage, evaluateComplianceException, decideGovernance, recommendComplianceRemediation, compareComplianceAssessments } from '../../src/compliance-governance-engine';

import { databaseSnapshotSchema, schemaDriftSchema, migrationSafetySchema, queryAnalysisSchema, dataIntegritySchema, compareDatabaseSnapshotsSchema } from '../../src/data-intelligence-schema';
import { auditDatabaseArchitecture, detectSchemaDrift, assessMigrationSafety, analyzeQueryPerformance, evaluateDataIntegrity, verifyBackupReadiness, compareDatabaseSnapshots } from '../../src/data-intelligence-engine';
import { performanceSnapshotSchema, performanceBudgetSchema, costGuardrailSchema, comparePerformanceSnapshotsSchema } from '../../src/performance-cost-schema';
import { evaluatePerformanceBudgets, analyzeRuntimeCost, enforceCostGuardrail, detectPerformanceRegression, recommendPerformanceActions, comparePerformanceSnapshots } from '../../src/performance-cost-engine';
import { dependencySnapshotSchema, upgradePlanSchema, compareDependencySnapshotsSchema } from '../../src/supply-chain-schema';
import { auditSupplyChain, detectVersionDrift, evaluateLicenseRisk, buildDependencyUpgradePlan, compareDependencySnapshots } from '../../src/supply-chain-engine';
import { changeSetSchema, rolloutPlanSchema, releaseTrainSchema, compareChangeSetsSchema } from '../../src/change-release-schema';
import { assessChangeBlastRadius, buildRolloutPlan, buildReleaseTrain, evaluateChangeReadiness, compareChangeSets } from '../../src/change-release-engine';

export const runtime = 'nodejs';
export const maxDuration = 300;

function result(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>
  };
}


import { planningModelSchema, executionSelectionSchema, comparePlansSchema } from '../../src/planning-intelligence-schema';
import { buildExecutionGraph, evaluatePlanIntelligence, selectNextPlanAction, detectPlanConflicts, createPlanEvidenceMatrix, comparePlans } from '../../src/planning-intelligence-engine';
import { traceabilityModelSchema, compareTraceabilitySchema } from '../../src/requirements-traceability-schema';
import { buildTraceabilityMatrix, evaluateRequirementCoverage, detectOrphanRequirements, detectUnprovenRequirements, buildRequirementReleaseGate, compareTraceability } from '../../src/requirements-traceability-engine';
import { architectureModelSchema, architectureChangeSchema } from '../../src/architecture-intelligence-schema';
import { auditArchitectureModel, detectArchitectureCycles, evaluateArchitectureDecisions, assessArchitectureChangeImpact, buildArchitectureDecisionRegister, compareArchitectureModels } from '../../src/architecture-intelligence-engine';
import { testSuiteSchema, testSelectionSchema, compareTestSuitesSchema } from '../../src/test-intelligence-schema';
import { evaluateTestCoverage, selectRiskBasedTests, clusterTestFailures, detectFlakyTests, evaluateTestEvidence, buildRegressionPlan, compareTestSuites } from '../../src/test-intelligence-engine';
import { apiContractSchema, compareApiContractsSchema } from '../../src/api-contract-schema';
import { auditApiContracts, detectBreakingApiChanges, auditApiAuthorization, auditApiIdempotency, buildApiContractTestPlan, compareApiContracts } from '../../src/api-contract-engine';
import { knowledgeGraphSchema, graphQuerySchema, compareKnowledgeGraphsSchema } from '../../src/knowledge-graph-schema';
import { auditKnowledgeGraph, queryKnowledgeNeighborhood, findKnowledgeContradictions, evaluateKnowledgeEvidenceCoverage, buildImpactGraph, compareKnowledgeGraphs } from '../../src/knowledge-graph-engine';

const handler = createMcpHandler((server) => {
  server.registerTool(
    'krom_route_workflow',
    {
      title: 'Route KROM Forge workflow',
      description: 'Classify a substantial product/software request and return relevant KROM Forge skills, evidence sources, and deliverables.',
      inputSchema: z.object({ request: z.string().min(3) })
    },
    async ({ request }) => result(routeRequest(request))
  );

  server.registerTool(
    'krom_create_research_brief',
    {
      title: 'Create domain research brief',
      description: 'Create a rigorous research plan before product requirements or prompt synthesis. This plans research; it does not claim research was performed.',
      inputSchema: z.object({
        domain: z.string().min(2),
        productGoal: z.string().min(3),
        industry: z.string().optional(),
        jurisdiction: z.string().optional(),
        knownConstraints: z.array(z.string()).default([])
      })
    },
    async ({ domain, productGoal, industry, jurisdiction, knownConstraints }) => result({
      domain,
      productGoal,
      industry: industry ?? 'Not specified',
      jurisdiction: jurisdiction ?? 'Not specified — legal/regulatory items remain unresolved until researched',
      knownConstraints,
      researchDimensions,
      sourceHierarchy: researchSourceHierarchy,
      evidenceClasses: ['AUTHORITATIVE', 'COMMON_PRACTICE', 'BENCHMARK', 'RECOMMENDATION', 'ASSUMPTION'],
      requiredSynthesis: ['Actor/permission map', 'Workflow/state map', 'Entity/data map', 'Integration map', 'Reporting/KPI map', 'Compliance/control map', 'Edge-case catalog', 'Assumptions/configuration points']
    })
  );

  server.registerTool(
    'krom_create_master_prompt_blueprint',
    {
      title: 'Create master prompt blueprint',
      description: 'Create an implementation-grade coding-agent prompt structure from product objectives and researched findings.',
      inputSchema: z.object({
        product: z.string().min(2),
        objective: z.string().min(3),
        researchedFindings: z.array(z.string()).default([]),
        targetUsers: z.array(z.string()).default([]),
        constraints: z.array(z.string()).default([]),
        existingProject: z.boolean().default(false)
      })
    },
    async ({ product, objective, researchedFindings, targetUsers, constraints, existingProject }) => result({
      product, objective, researchedFindings, targetUsers, constraints,
      sections: [
        'Role and execution mandate', 'Product context, researched facts and assumptions', 'Objectives and non-goals',
        'Personas, permissions, tenancy and sensitive-data boundaries', 'Module/screen map', 'Critical workflows and state machines',
        'Data entities, relationships, invariants, history and audit', 'API contracts, integrations, retries and idempotency',
        'Authentication, authorization, security, privacy and secrets', 'UI architecture, tokens, responsive behavior, RTL/LTR and accessibility',
        'Loading/empty/error/offline/permission/destructive states', 'Observability, backup and recovery',
        'Non-functional requirements and performance budgets', 'Implementation phases and dependencies',
        'Verification matrix', 'Atomic acceptance criteria and definition of done', 'Assumptions/configuration points'
      ],
      executionRules: [
        existingProject ? 'Inspect the existing project, conventions, current state and diff before editing.' : 'Establish a coherent stack and architecture before implementation.',
        'Use the strongest available host tools for direct evidence; never fabricate tool use or success.',
        'Prefer the smallest coherent change and preserve unrelated user work.',
        'Research version-sensitive APIs and specialized/current domain claims before relying on them.',
        'Recover from ordinary build/test/runtime failures by diagnosing root cause; do not loop blindly.',
        'Do not declare completion without evidence proportional to scope.'
      ],
      acceptanceDimensions
    })
  );

  server.registerTool(
    'krom_create_uiux_blueprint',
    {
      title: 'Create high-fidelity UI/UX blueprint',
      description: 'Create a concrete UI/UX specification with hierarchy, tokens, interaction states, responsive reflow, RTL/LTR, accessibility and visual verification.',
      inputSchema: z.object({
        product: z.string().min(2),
        primaryUsers: z.array(z.string()).default([]),
        screens: z.array(z.string()).default([]),
        bilingualArabicEnglish: z.boolean().default(false),
        styleDirection: z.string().optional()
      })
    },
    async ({ product, primaryUsers, screens, bilingualArabicEnglish, styleDirection }) => result({
      product, primaryUsers, screens,
      styleDirection: styleDirection ?? 'Professional product UI driven by task hierarchy, clarity and data density rather than decorative effects',
      designSystem: ['Semantic color tokens', 'Typography roles/scale', 'Spacing rhythm/density', 'Radius/border/elevation hierarchy', 'Icon semantics', 'Grid/container/breakpoints', 'Focus/hover/pressed/selected/disabled/destructive states', 'Motion and reduced-motion behavior'],
      interactionStates: ['loading/skeleton', 'first-use/empty', 'zero-result', 'partial data', 'offline/retrying', 'permission denied', 'validation error', 'server error', 'success/recovery'],
      responsiveRules: ['Structural reflow, not only width reduction', 'Explicit mobile table strategy', 'Primary action remains discoverable', 'Drawer/sheet/navigation transformations', 'Overflow/text-zoom/localization resilience'],
      rtlLtr: bilingualArabicEnglish ? ['Use logical CSS properties', 'Verify direction-sensitive icons/breadcrumbs/tables/mixed text/charts/forms/drawers', 'Do not mirror numeric/data semantics incorrectly'] : [],
      accessibility: ['Semantic structure', 'Keyboard operation', 'Visible focus', 'Contrast', 'Labels', 'Non-color status', 'Reduced motion', 'Text zoom resilience'],
      visualVerification: ['desktop', 'narrow/mobile', 'dialogs/drawers', 'forms/validation', 'loading/empty/error states', 'console/runtime errors']
    })
  );

  server.registerTool(
    'krom_create_engineering_blueprint',
    {
      title: 'Create full-stack engineering blueprint',
      description: 'Create architecture guidance for data, APIs, auth, concurrency, integrations, observability, testing, performance, deployment and rollback.',
      inputSchema: z.object({
        product: z.string().min(2),
        stack: z.array(z.string()).default([]),
        realtime: z.boolean().default(false),
        uploads: z.boolean().default(false),
        multiTenant: z.boolean().default(false),
        externalIntegrations: z.array(z.string()).default([])
      })
    },
    async ({ product, stack, realtime, uploads, multiTenant, externalIntegrations }) => result({
      product,
      stack: stack.length ? stack : ['No stack supplied — choose from requirements and current primary documentation'],
      architecture: [
        'Client/server/data/external trust boundaries', 'Business invariants and state machines',
        'Database keys, constraints, indexes, migration and rollback', 'API input/output/error/pagination/idempotency contracts',
        'Authentication and server-side authorization', multiTenant ? 'Tenant isolation with negative cross-tenant tests' : 'Ownership/role boundaries',
        'Timeout/retry/concurrency policy', realtime ? 'Realtime auth/reconnect/ordering/stale-state/cleanup' : 'Realtime not requested',
        uploads ? 'Upload validation/storage/access/retrieval/deletion lifecycle' : 'Uploads not requested',
        'Caching/invalidation where justified', 'Logs/metrics/tracing/audit events', 'Secret/config separation',
        'Performance budgets and expensive-query controls', 'Unit/integration/E2E/negative-permission/regression tests',
        'Deployment, backup, migration safety and rollback/forward-fix path'
      ],
      externalIntegrations
    })
  );

  server.registerTool(
    'krom_create_debug_plan',
    {
      title: 'Create root-cause debug plan',
      description: 'Create an evidence-first debugging plan from a concrete error or broken behavior.',
      inputSchema: z.object({
        symptom: z.string().min(3),
        error: z.string().optional(),
        environment: z.string().optional(),
        recentChanges: z.array(z.string()).default([])
      })
    },
    async ({ symptom, error, environment, recentChanges }) => result({
      symptom,
      error: error ?? 'No exact error supplied — capture logs/status/stack/request first when possible',
      environment: environment ?? 'Unknown', recentChanges,
      steps: ['Reproduce with exact evidence', 'Identify earliest causal failure', 'Classify code/config/data/permission/environment/dependency/deployment/UI/integration', 'Inspect relevant contracts/state/versions/paths/auth/session/recent changes', 'Form one falsifiable hypothesis', 'Run smallest disproving diagnostic', 'Apply smallest coherent fix', 'Rerun focused check', 'Run proportional regression', 'After two similar failed fixes, gather new evidence and switch strategy']
    })
  );

  server.registerTool(
    'krom_evaluate_release_evidence',
    {
      title: 'Evaluate release evidence',
      description: 'Evaluate supplied release evidence without inventing missing passes.',
      inputSchema: z.object({
        gates: z.array(z.object({
          name: z.string(),
          applicable: z.boolean().default(true),
          status: z.enum(['PASS', 'FAIL', 'PASS_WITH_GAPS', 'NOT_AVAILABLE', 'NOT_APPLICABLE']),
          evidence: z.string().default('')
        })).min(1)
      })
    },
    async ({ gates }) => {
      const applicable = gates.filter(g => g.applicable && g.status !== 'NOT_APPLICABLE');
      const failures = applicable.filter(g => g.status === 'FAIL');
      const gaps = applicable.filter(g => g.status === 'PASS_WITH_GAPS' || g.status === 'NOT_AVAILABLE' || !g.evidence.trim());
      const overall = failures.length ? 'FAIL' : gaps.length ? 'PASS_WITH_GAPS' : 'PASS';
      return result({ overall, failures: failures.map(g => g.name), gaps: gaps.map(g => ({ name: g.name, status: g.status, evidence: g.evidence })), gates });
    }
  );

  server.registerTool(
    'krom_select_tools',
    {
      title: 'Select host tools and evidence sources',
      description: 'Determine the minimum sufficient host-authorized tools needed for a request. This does not call those tools; it creates an explicit evidence plan and reports unavailable capabilities when the host supplies an availability list.',
      inputSchema: z.object({
        request: z.string().min(3),
        availableTools: z.array(z.enum(['web', 'files', 'github', 'vercel', 'supabase', 'figma', 'browser', 'execution', 'none'])).default([])
      })
    },
    async ({ request, availableTools }) => result(selectTools(request, availableTools))
  );

  server.registerTool(
    'krom_build_task_graph',
    {
      title: 'Build engineering task graph',
      description: 'Convert an engineering objective into dependency-aware INSPECT → RESEARCH → PLAN → IMPLEMENT → VERIFY → RELEASE tasks with evidence and acceptance requirements.',
      inputSchema: z.object({
        objective: z.string().min(3),
        existingProject: z.boolean().default(true),
        implementationRequested: z.boolean().default(true)
      })
    },
    async ({ objective, existingProject, implementationRequested }) => result({
      objective,
      tasks: buildTaskGraph(objective, existingProject, implementationRequested)
    })
  );

  server.registerTool(
    'krom_plan_execution',
    {
      title: 'Create portable KROM run state',
      description: 'Create a stateless, portable engineering run state that a host can persist and return later for continuation. It tracks dependencies, current task, assumptions, blockers and evidence without pretending the server has durable memory.',
      inputSchema: z.object({
        objective: z.string().min(3),
        existingProject: z.boolean().default(true),
        implementationRequested: z.boolean().default(true),
        assumptions: z.array(z.string()).default([])
      })
    },
    async ({ objective, existingProject, implementationRequested, assumptions }) => {
      const routed = routeRequest(objective);
      const tasks = buildTaskGraph(objective, existingProject, implementationRequested);
      return result(createRunState(objective, routed.mode, tasks, assumptions));
    }
  );

  server.registerTool(
    'krom_resume_task',
    {
      title: 'Resume a portable KROM run',
      description: 'Update a previously returned KROM run state with completed/failed tasks, blockers and evidence; unlock dependency-ready tasks and return the next task.',
      inputSchema: z.object({
        state: z.any(),
        completedTaskIds: z.array(z.string()).default([]),
        failedTaskIds: z.array(z.string()).default([]),
        blockers: z.array(z.string()).default([]),
        evidence: z.array(z.object({
          taskId: z.string(),
          claim: z.string(),
          evidence: z.string(),
          sourceType: z.enum(['web', 'files', 'github', 'vercel', 'supabase', 'figma', 'browser', 'execution', 'none', 'user', 'unknown']).default('unknown'),
          verified: z.boolean().default(false)
        })).default([])
      })
    },
    async ({ state, completedTaskIds, failedTaskIds, blockers, evidence }) => result(
      resumeRun(state as any, { completedTaskIds, failedTaskIds, blockers, evidence: evidence as any })
    )
  );

  server.registerTool(
    'krom_verify_evidence',
    {
      title: 'Verify completion claims against supplied evidence',
      description: 'Evaluate whether engineering claims have sufficient supplied evidence. Missing evidence remains explicitly UNVERIFIED; this tool never invents a pass.',
      inputSchema: z.object({
        claims: z.array(z.object({
          claim: z.string().min(2),
          evidence: z.string().optional(),
          sourceType: z.string().optional()
        })).min(1)
      })
    },
    async ({ claims }) => result(verifyEvidence(claims))
  );

  server.registerTool(
    'krom_audit_project',
    {
      title: 'Audit supplied project inventory',
      description: 'Perform a conservative project audit from host-supplied inventory. It identifies evidence gaps and risks without claiming to have inspected files that were not supplied.',
      inputSchema: z.object({
        projectType: z.string().optional(),
        files: z.array(z.string()).default([]),
        scripts: z.array(z.string()).default([]),
        routes: z.array(z.string()).default([]),
        knownErrors: z.array(z.string()).default([]),
        hasTests: z.boolean().optional(),
        hasAuth: z.boolean().optional(),
        hasDatabase: z.boolean().optional()
      })
    },
    async (input) => result(auditProject(input))
  );

  server.registerTool(
    'krom_inspect_project',
    {
      title: 'Inspect real project snapshot',
      description: 'Analyze a host-supplied project snapshot and return inventory, architecture, dependencies, route risks, duplicate candidates and prioritized project risks. KROM Forge analyzes only supplied evidence and never pretends it directly read unsupplied files.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(inspectProject(snapshot))
  );

  server.registerTool(
    'krom_build_project_inventory',
    {
      title: 'Build project inventory',
      description: 'Normalize a host-supplied project snapshot into framework/language/file/route/dependency/script/Git evidence and report evidence completeness.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(buildProjectInventory(snapshot))
  );

  server.registerTool(
    'krom_map_architecture',
    {
      title: 'Map project architecture',
      description: 'Infer project modules and trust boundaries from supplied files and metadata while explicitly reporting architecture evidence gaps.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(mapArchitecture(snapshot))
  );

  server.registerTool(
    'krom_inventory_dependencies',
    {
      title: 'Inventory project dependencies',
      description: 'Classify supplied package dependencies into framework/UI/database/auth/testing/build/observability groups and flag overlapping dependency families for review.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(inventoryDependencies(snapshot))
  );

  server.registerTool(
    'krom_detect_broken_routes',
    {
      title: 'Detect broken or suspect routes',
      description: 'Correlate supplied route inventory, backing files and diagnostics to identify broken or suspect routes. Runtime success still requires browser or execution evidence.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(detectBrokenRoutes(snapshot))
  );

  server.registerTool(
    'krom_detect_duplicates',
    {
      title: 'Detect duplicate project artifacts',
      description: 'Identify exact duplicate files when host-supplied hashes exist and identify filename collisions that require human/host review. Name similarity alone is never treated as proof of duplication.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(detectDuplicates(snapshot))
  );

  server.registerTool(
    'krom_find_risks',
    {
      title: 'Find project risks',
      description: 'Prioritize build, test, Git-state, database, auth, RLS, diagnostics and evidence gaps from a supplied project snapshot.',
      inputSchema: projectSnapshotSchema
    },
    async (snapshot) => result(findProjectRisks(snapshot))
  );

  server.registerTool(
    'krom_compare_project_state',
    {
      title: 'Compare project state before and after changes',
      description: 'Compare two host-supplied project snapshots for added/removed/hashed-changed files, route/diagnostic counts, and build/test evidence without inventing unsupplied changes.',
      inputSchema: z.object({
        before: projectSnapshotSchema,
        after: projectSnapshotSchema
      })
    },
    async ({ before, after }) => result(compareProjectState(before, after))
  );

  server.registerTool(
    'krom_classify_sources',
    {
      title: 'Classify research sources',
      description: 'Classify host-supplied research evidence by authority and evidence class without claiming that KROM Forge independently browsed the source.',
      inputSchema: researchEvidenceSchema
    },
    async (input) => result(classifyResearchSources(input))
  );

  server.registerTool(
    'krom_extract_requirements',
    {
      title: 'Extract evidence-backed requirements',
      description: 'Extract explicit requirements from host-supplied source claims, preserving evidence class, confidence, source ID and unresolved validation needs.',
      inputSchema: researchEvidenceSchema
    },
    async (input) => result(extractRequirements(input))
  );

  server.registerTool(
    'krom_build_domain_model',
    {
      title: 'Build domain model from research',
      description: 'Synthesize actors, entities, workflows, controls and assumptions from host-supplied research evidence. This is synthesis, not independent browsing.',
      inputSchema: researchEvidenceSchema
    },
    async (input) => result(buildDomainModel(input))
  );

  server.registerTool(
    'krom_detect_research_conflicts',
    {
      title: 'Detect research conflicts',
      description: 'Heuristically identify potentially conflicting supplied claims that require source or human review before product synthesis.',
      inputSchema: researchEvidenceSchema
    },
    async (input) => result(detectResearchConflicts(input))
  );

  server.registerTool(
    'krom_assess_research_coverage',
    {
      title: 'Assess research coverage',
      description: 'Check whether supplied research evidence has sufficient authoritative coverage, explicit requirements and constraints for synthesis.',
      inputSchema: researchEvidenceSchema
    },
    async (input) => result(assessResearchCoverage(input))
  );

  server.registerTool(
    'krom_synthesize_research',
    {
      title: 'Synthesize research evidence',
      description: 'Produce a combined evidence classification, requirement set, domain model, conflict review and research-readiness decision from host-supplied evidence.',
      inputSchema: researchEvidenceSchema
    },
    async (input) => result(createResearchSynthesis(input))
  );

  server.registerTool(
    'krom_plan_code_change',
    {
      title: 'Plan a code change',
      description: 'Create a smallest-coherent-diff implementation plan from a host-supplied patch request, including impact, scope, preconditions and evidence requirements.',
      inputSchema: patchRequestSchema
    },
    async (input) => result(planCodeChange(input))
  );

  server.registerTool(
    'krom_prepare_patch',
    {
      title: 'Prepare host-executable patch contract',
      description: 'Create a patch contract for an authorized host to apply. KROM Forge does not claim to mutate files itself.',
      inputSchema: patchRequestSchema
    },
    async (input) => result(preparePatch(input))
  );

  server.registerTool(
    'krom_validate_change_scope',
    {
      title: 'Validate patch scope',
      description: 'Check proposed file changes against explicit allowed and forbidden path rules and block scope creep.',
      inputSchema: patchRequestSchema
    },
    async (input) => result(validateChangeScope(input))
  );

  server.registerTool(
    'krom_assess_patch_risk',
    {
      title: 'Assess patch risk',
      description: 'Assess change risk from touched files, deletions, database impact, auth impact, deployment impact and scope clarity.',
      inputSchema: patchRequestSchema
    },
    async (input) => result(assessPatchRisk(input))
  );

  server.registerTool(
    'krom_generate_migration_plan',
    {
      title: 'Generate database migration safety plan',
      description: 'Generate a conservative migration/rollback plan when a patch may change schema or data. UNKNOWN database impact remains a blocker.',
      inputSchema: patchRequestSchema
    },
    async (input) => result(generateMigrationPlan(input))
  );

  server.registerTool(
    'krom_generate_test_plan',
    {
      title: 'Generate proportional test plan',
      description: 'Generate required type/build/focused/UI/API/database/auth/regression gates from the declared patch scope and impacts.',
      inputSchema: patchRequestSchema
    },
    async (input) => result(generateTestPlan(input))
  );

  server.registerTool(
    'krom_review_diff',
    {
      title: 'Review host-applied diff',
      description: 'Review host-supplied changed files, diagnostics, build evidence and test evidence; report scope violations and verification gaps.',
      inputSchema: diffReviewSchema
    },
    async (input) => result(reviewDiff(input))
  );

  server.registerTool(
    'krom_verify_patch_evidence',
    {
      title: 'Verify patch evidence',
      description: 'Verify patch-level claims against supplied diff/build/test/diagnostic evidence without inventing a pass.',
      inputSchema: diffReviewSchema
    },
    async (input) => result(verifyPatchEvidence(input))
  );

  server.registerTool(
    'krom_list_agents',
    {
      title: 'List KROM specialist agents',
      description: 'Return the v29 specialist-agent contracts, ownership boundaries, required inputs, outputs, preferred host tools and release-blocking authority.',
      inputSchema: z.object({})
    },
    async () => result(listAgents())
  );

  server.registerTool(
    'krom_route_agent',
    {
      title: 'Route objective to specialist agents',
      description: 'Select a dependency-aware specialist-agent sequence for an objective without pretending any agent has executed work.',
      inputSchema: z.object({ objective: z.string().min(3) })
    },
    async ({ objective }) => result(routeAgent(objective))
  );

  server.registerTool(
    'krom_create_agent_run',
    {
      title: 'Create portable multi-agent run',
      description: 'Create a portable multi-agent coordination state with ordered specialist contracts, evidence requirements and dependencies.',
      inputSchema: agentRunSchema
    },
    async (input) => result(createAgentRun(input))
  );

  server.registerTool(
    'krom_agent_handoff',
    {
      title: 'Create and validate agent handoff',
      description: 'Normalize the STATUS / CHANGES / EVIDENCE / RISKS / OPEN_ITEMS / NEXT_AGENT contract and reject unsupported PASS claims.',
      inputSchema: agentHandoffSchema
    },
    async (input) => result(buildHandoffSummary(input))
  );

  server.registerTool(
    'krom_coordinate_agents',
    {
      title: 'Coordinate specialist handoffs',
      description: 'Evaluate a sequence of specialist handoffs, identify invalid contracts or blockers, and determine the next coordination action.',
      inputSchema: z.object({ objective: z.string().min(3), handoffs: z.array(agentHandoffSchema).default([]) })
    },
    async (input) => result(coordinateAgents(input))
  );

  server.registerTool(
    'krom_evaluate_agent_run',
    {
      title: 'Evaluate multi-agent run evidence',
      description: 'Evaluate handoff integrity, blockers, gaps, verified evidence and independent release-auditor presence without fabricating a green status.',
      inputSchema: z.object({ handoffs: z.array(agentHandoffSchema).default([]), requireReleaseAuditor: z.boolean().default(true) })
    },
    async (input) => result(evaluateAgentRun(input))
  );


  server.registerTool(
    'krom_create_project_memory',
    {
      title: 'Create project intelligence memory',
      description: 'Create an isolated project-memory object. PORTABLE mode is host-carried; EXTERNAL_PERSISTENCE is only a persistence contract until an authorized durable store is connected.',
      inputSchema: projectMemoryCreateSchema
    },
    async (input) => result(createProjectMemory(input))
  );

  server.registerTool(
    'krom_get_project_memory',
    {
      title: 'Summarize project intelligence memory',
      description: 'Summarize the current project memory, blockers, risks, failing tests and latest deployment without claiming durable persistence.',
      inputSchema: projectMemorySchema
    },
    async (memory) => result(getProjectMemorySummary(memory))
  );

  server.registerTool(
    'krom_update_project_memory',
    {
      title: 'Update project intelligence memory',
      description: 'Update version, commit, architecture summary or notes while preserving project scope and historical records.',
      inputSchema: memoryUpdateSchema
    },
    async (input) => result(updateProjectMemory(input))
  );

  server.registerTool('krom_record_decision',{title:'Record project decision',description:'Upsert an architecture/product/engineering decision into project-scoped memory with evidence references.',inputSchema:recordDecisionInputSchema},async ({memory,decision})=>result(recordDecision(memory,decision)));
  server.registerTool('krom_record_failure',{title:'Record project failure',description:'Record or update a concrete build/type/test/runtime/database/auth/deployment failure and its resolution state.',inputSchema:recordFailureInputSchema},async ({memory,failure})=>result(recordFailure(memory,failure)));
  server.registerTool('krom_record_evidence',{title:'Record project evidence',description:'Record evidence such as source, build, test, diff, runtime, deployment, security, database or browser evidence.',inputSchema:recordEvidenceInputSchema},async ({memory,evidence})=>result(recordEvidence(memory,evidence)));
  server.registerTool('krom_record_test_result',{title:'Record test result',description:'Record deterministic or browser test evidence without converting NOT_RUN or FAIL into a pass.',inputSchema:recordTestInputSchema},async ({memory,test})=>result(recordTestResult(memory,test)));
  server.registerTool('krom_record_deployment',{title:'Record deployment',description:'Record deployment identity, environment, URL, commit/version and evidence-backed status.',inputSchema:recordDeploymentInputSchema},async ({memory,deployment})=>result(recordDeployment(memory,deployment)));
  server.registerTool('krom_record_task',{title:'Record project task',description:'Record or update a project task, priority, owner, blockers and linked evidence.',inputSchema:recordTaskInputSchema},async ({memory,task})=>result(recordTask(memory,task)));
  server.registerTool('krom_record_risk',{title:'Record project risk',description:'Record or update a project risk, severity, mitigation and evidence references.',inputSchema:recordRiskInputSchema},async ({memory,risk})=>result(recordRisk(memory,risk)));
  server.registerTool('krom_record_project_snapshot',{title:'Record project snapshot',description:'Record a lightweight architecture/project-state snapshot for later comparison.',inputSchema:recordSnapshotInputSchema},async ({memory,snapshot})=>result(recordSnapshot(memory,snapshot)));

  server.registerTool(
    'krom_get_project_timeline',
    { title:'Get project intelligence timeline', description:'Build a chronological timeline strictly from records already present in project memory.', inputSchema:projectMemorySchema },
    async (memory)=>result(getProjectTimeline(memory))
  );

  server.registerTool(
    'krom_compare_project_memory',
    { title:'Compare project memory states', description:'Compare two memory states for the same project/scope and report record/version/architecture deltas.', inputSchema:compareMemorySnapshotsSchema },
    async ({before,after})=>result(compareProjectMemories(before,after))
  );

  server.registerTool(
    'krom_audit_project_memory',
    { title:'Audit project memory integrity', description:'Check duplicate IDs, dangling evidence references and whether durable-persistence claims are permitted by the supplied storage mode.', inputSchema:projectMemorySchema },
    async (memory)=>result(evaluateMemoryIntegrity(memory))
  );



  server.registerTool('krom_audit_ui',{title:'Audit UI/UX from host evidence',description:'Audit host-supplied rendered/UI observations for hierarchy, consistency, interaction states and high-severity usability defects without pretending KROM opened a browser.',inputSchema:uiAuditInputSchema},async (input)=>result(auditUi(input)));
  server.registerTool('krom_audit_responsive',{title:'Audit responsive behavior',description:'Evaluate host-supplied viewport evidence for structural reflow, navigation, tables, dialogs, drawers and mobile usability.',inputSchema:uiAuditInputSchema},async (input)=>result(auditResponsive(input)));
  server.registerTool('krom_audit_rtl',{title:'Audit RTL behavior',description:'Evaluate supplied RTL evidence for navigation, logical layout, mixed text, tables, forms and direction-sensitive controls.',inputSchema:uiAuditInputSchema},async (input)=>result(auditRtl(input)));
  server.registerTool('krom_audit_accessibility',{title:'Audit accessibility evidence',description:'Evaluate supplied accessibility-tree, keyboard and UI findings; absence of accessibility evidence is reported as a verification gap.',inputSchema:uiAuditInputSchema},async (input)=>result(auditAccessibility(input)));
  server.registerTool('krom_build_design_system',{title:'Build design-system contract',description:'Create a concrete token/component/state/RTL contract for implementation; does not claim the product already implements it.',inputSchema:designSystemInputSchema},async (input)=>result(buildDesignSystem(input)));
  server.registerTool('krom_review_ui_evidence',{title:'Review UI verification evidence',description:'Assess whether supplied browser/screenshot/DOM/accessibility observations are sufficient to support UI quality claims.',inputSchema:uiAuditInputSchema},async (input)=>result(reviewUiEvidence(input)));
  server.registerTool('krom_compare_ui_states',{title:'Compare UI evidence states',description:'Compare before/after UI observation snapshots to identify resolved findings, new findings and high-severity regressions.',inputSchema:compareUiStatesSchema},async (input)=>result(compareUiStates(input)));
  server.registerTool('krom_generate_ui_fix_plan',{title:'Generate evidence-backed UI fix plan',description:'Turn UI findings into route-scoped implementation and verification work while preserving explicit allowed paths.',inputSchema:uiFixPlanSchema},async (input)=>result(generateUiFixPlan(input)));



  server.registerTool('krom_create_debug_session',{title:'Create evidence-driven debug session',description:'Create a structured debugging session for one concrete symptom without claiming reproduction or root cause.',inputSchema:createDebugSessionSchema},async (input)=>result(createDebugSession(input)));
  server.registerTool('krom_classify_failure',{title:'Classify debugging failure',description:'Classify a debug session from supplied symptom/error/evidence into code, config, data, permission, environment, dependency, deployment, UI, integration, database, auth, network or performance categories.',inputSchema:debugSessionSchema},async (session)=>result(classifyFailure(session)));
  server.registerTool('krom_add_debug_evidence',{title:'Add debugging evidence',description:'Add or update a concrete evidence item in a debug session. Verified must only be true when the host actually observed the artifact.',inputSchema:addDebugEvidenceSchema},async ({session,evidence})=>result(addEvidence(session,evidence)));
  server.registerTool('krom_add_debug_hypothesis',{title:'Add falsifiable debug hypothesis',description:'Add a hypothesis linked to supporting/contradicting evidence and explicit predictions.',inputSchema:addHypothesisSchema},async ({session,hypothesis})=>result(addHypothesis(session,hypothesis)));
  server.registerTool('krom_record_debug_attempt',{title:'Record diagnostic or fix attempt',description:'Record one diagnostic/fix attempt and outcome so repeated failed strategies can be detected.',inputSchema:recordAttemptSchema},async ({session,attempt})=>result(recordAttempt(session,attempt)));
  server.registerTool('krom_update_reproduction',{title:'Update reproduction contract',description:'Record exact reproduction status, steps, expected vs actual behavior and evidence references.',inputSchema:updateReproductionSchema},async ({session,reproduction})=>result(updateReproduction(session,reproduction)));
  server.registerTool('krom_build_root_cause_graph',{title:'Build root-cause evidence graph',description:'Build a graph linking symptom, hypotheses, evidence and confirmed/probable root cause without inventing causality.',inputSchema:debugSessionSchema},async (session)=>result(buildRootCauseGraph(session)));
  server.registerTool('krom_check_debug_loop',{title:'Check anti-loop debugging policy',description:'Detect repeated failed/inconclusive strategies and require new evidence or a changed hypothesis after repeated attempts.',inputSchema:debugSessionSchema},async (session)=>result(antiLoopCheck(session)));
  server.registerTool('krom_next_debug_diagnostic',{title:'Recommend next debugging diagnostic',description:'Choose the next evidence-producing action: reproduce, collect evidence, disprove hypothesis, change strategy, plan smallest fix or verify.',inputSchema:debugSessionSchema},async (session)=>result(recommendNextDiagnostic(session)));
  server.registerTool('krom_set_root_cause',{title:'Set evidence-linked root cause',description:'Record UNKNOWN/PROBABLE/CONFIRMED root cause with explicit evidence references.',inputSchema:setRootCauseSchema},async ({session,rootCause})=>result(setRootCause(session,rootCause)));
  server.registerTool('krom_record_debug_fix',{title:'Record debugging fix',description:'Record the planned/applied/reverted smallest coherent fix, changed paths and evidence references.',inputSchema:recordFixSchema},async ({session,fix})=>result(recordFix(session,fix)));
  server.registerTool('krom_verify_debug_fix',{title:'Record focused and regression verification',description:'Record focused, regression, runtime and browser verification results with evidence references.',inputSchema:verifyFixSchema},async ({session,verification})=>result(verifyFix(session,verification)));
  server.registerTool('krom_evaluate_debug_closure',{title:'Evaluate debug closure evidence',description:'Prevent a false FIXED claim unless root cause, applied fix and verification are supported by verified evidence with no blockers.',inputSchema:debugSessionSchema},async (session)=>result(evaluateDebugClosure(session)));



  server.registerTool('krom_create_evidence_bundle',{title:'Create claim-evidence bundle',description:'Create a project-scoped claim/evidence graph for evidence-backed engineering assertions.',inputSchema:createEvidenceBundleSchema},async (input)=>result(createEvidenceBundle(input)));
  server.registerTool('krom_record_claim',{title:'Record evidence-backed claim',description:'Record or update a claim such as build passed, fixed, deployed, UI verified or a custom assertion without treating it as supported yet.',inputSchema:recordClaimInputSchema},async ({bundle,claim})=>result(recordClaim(bundle,claim as any)));
  server.registerTool('krom_record_evidence_artifact',{title:'Record evidence artifact',description:'Record host-supplied evidence with kind, source, summary and explicit verified flag.',inputSchema:recordArtifactInputSchema},async ({bundle,artifact})=>result(recordArtifact(bundle,artifact)));
  server.registerTool('krom_link_claim_evidence',{title:'Link claim to evidence',description:'Link an existing claim to existing evidence artifacts; unknown references are rejected.',inputSchema:linkClaimEvidenceSchema},async ({bundle,claimId,evidenceRefs})=>result(linkClaimEvidence(bundle,claimId,evidenceRefs)));
  server.registerTool('krom_verify_claim',{title:'Verify claim against evidence',description:'Evaluate one claim against verified linked evidence and return SUPPORTED, PARTIAL, UNSUPPORTED or CONTRADICTED.',inputSchema:verifyClaimInputSchema},async ({bundle,claimId})=>result(verifyClaim(bundle,claimId)));
  server.registerTool('krom_audit_evidence_graph',{title:'Audit evidence graph integrity',description:'Audit dangling references, unsupported claims, contradictions and unverified artifacts.',inputSchema:evidenceBundleSchema},async (bundle)=>result(auditEvidenceGraph(bundle)));
  server.registerTool('krom_build_release_evidence',{title:'Build release evidence gates',description:'Derive build/test/deployment release gates strictly from recorded evidence-backed claims.',inputSchema:evidenceBundleSchema},async (bundle)=>result(buildReleaseEvidence(bundle)));
  server.registerTool('krom_compare_evidence_snapshots',{title:'Compare evidence snapshots',description:'Compare two claim/evidence bundles from the same project scope and report status/evidence changes.',inputSchema:compareEvidenceBundlesSchema},async ({before,after})=>result(compareEvidenceBundles(before,after)));



  server.registerTool('krom_create_autonomous_loop',{
    title:'Create autonomous engineering loop',
    description:'Create a resumable engineering state machine that coordinates inspection, research, planning, specialist agents, patching, debugging, UI/UX verification, evidence and release without pretending the host executed unavailable tools.',
    inputSchema:createAutonomousLoopSchema
  },async (input)=>result(createAutonomousLoop(input)));

  server.registerTool('krom_get_next_autonomous_action',{
    title:'Get next autonomous engineering action',
    description:'Return the next step, required host-authorized tools and evidence needed for the current loop state.',
    inputSchema:autonomousLoopSchema
  },async (loop)=>result(getNextAutonomousAction(loop)));

  server.registerTool('krom_advance_autonomous_loop',{
    title:'Advance autonomous engineering loop',
    description:'Advance or retry a loop step using explicit completion/failure updates, blockers and evidence; retry budget prevents blind loops.',
    inputSchema:advanceLoopSchema
  },async (input)=>result(advanceAutonomousLoop(input)));

  server.registerTool('krom_record_loop_host_result',{
    title:'Record host execution result',
    description:'Record the result of an authorized host action, attach verified evidence and advance or block the current loop step accordingly.',
    inputSchema:loopHostResultSchema
  },async (input)=>result(recordLoopHostResult(input)));

  server.registerTool('krom_resume_autonomous_loop',{
    title:'Resume autonomous engineering loop',
    description:'Summarize a portable loop state and identify the exact next action after interruption or handoff.',
    inputSchema:autonomousLoopSchema
  },async (loop)=>result(summarizeAutonomousLoop(loop)));

  server.registerTool('krom_audit_autonomous_loop',{
    title:'Audit autonomous engineering loop',
    description:'Audit progress, retry exhaustion, blockers and evidence support; release cannot pass while consequential completed steps lack verified evidence.',
    inputSchema:autonomousLoopSchema
  },async (loop)=>result(auditAutonomousLoop(loop)));


  server.registerTool('krom_register_host_capabilities',{
    title:'Register host capability snapshot',
    description:'Normalize and summarize the capabilities the current ChatGPT/Codex/custom MCP host actually exposes. KROM does not discover tools by magic; the host supplies this evidence-backed snapshot.',
    inputSchema:hostCapabilitySnapshotSchema
  },async (snapshot)=>result(summarizeHostCapabilities(snapshot)));

  server.registerTool('krom_assess_host_requirements',{
    title:'Assess host capability requirements',
    description:'Check required operations/evidence against a supplied host capability snapshot and return EXECUTABLE, DEGRADED or BLOCKED without simulating missing tools.',
    inputSchema:assessCapabilityRequirementsSchema
  },async (input)=>result(assessCapabilityRequirements(input)));

  server.registerTool('krom_adapt_loop_to_host',{
    title:'Adapt autonomous loop to host',
    description:'Map an autonomous engineering loop onto the actual host capabilities. Steps with unavailable tools are explicitly blocked rather than fabricated.',
    inputSchema:z.object({snapshot:hostCapabilitySnapshotSchema,loop:autonomousLoopSchema})
  },async ({snapshot,loop})=>result(adaptLoopToHost(snapshot,loop)));

  server.registerTool('krom_recommend_host_strategy',{
    title:'Recommend host-aware execution strategy',
    description:'Map an objective to the capabilities available in the current host and explicitly report gaps.',
    inputSchema:z.object({snapshot:hostCapabilitySnapshotSchema,objective:z.string().min(3)})
  },async ({snapshot,objective})=>result(recommendHostStrategy(snapshot,objective)));

  server.registerTool('krom_validate_host_evidence',{
    title:'Validate host evidence capability',
    description:'Check whether the host can actually produce requested evidence kinds; unsupported evidence remains a gap.',
    inputSchema:z.object({snapshot:hostCapabilitySnapshotSchema,requestedEvidenceKinds:z.array(z.string()).min(1)})
  },async ({snapshot,requestedEvidenceKinds})=>result(validateHostEvidence(snapshot,requestedEvidenceKinds)));

  server.registerTool('krom_compare_host_capabilities',{
    title:'Compare host capability snapshots',
    description:'Compare two host snapshots to detect added, removed or changed tools/capabilities between ChatGPT/Codex/custom host sessions.',
    inputSchema:compareHostSnapshotsSchema
  },async ({before,after})=>result(compareHostSnapshots(before,after)));


  server.registerTool('krom_get_execution_policy',{
    title:'Get execution policy',
    description:'Return the default v36 execution/approval policy. Read-only analysis can be auto-executable; consequential mutations require explicit approval or remain blocked.',
    inputSchema:z.object({})
  },async ()=>result(defaultExecutionPolicy()));

  server.registerTool('krom_classify_execution_action',{
    title:'Classify execution action',
    description:'Classify a proposed action as AUTO_EXECUTE, REQUIRE_APPROVAL or BLOCKED using action impact, reversibility, environment and host capability evidence.',
    inputSchema:classifyExecutionActionSchema
  },async ({action,policy})=>result(classifyExecutionAction(action,policy)));

  server.registerTool('krom_create_approval_request',{
    title:'Create approval request',
    description:'Create an action-scoped approval request for a consequential operation. This does not grant approval.',
    inputSchema:createApprovalRequestSchema
  },async ({action,policy,reason})=>result(createApprovalRequest(action,policy,reason)));

  server.registerTool('krom_evaluate_approval',{
    title:'Evaluate execution approval',
    description:'Check whether a specific action is allowed to execute using the policy and an action-scoped approval record. Missing, denied or mismatched approval blocks execution.',
    inputSchema:evaluateApprovalSchema
  },async ({action,policy,approval})=>result(evaluateApproval(action,policy,approval)));

  server.registerTool('krom_enforce_execution_policy',{
    title:'Enforce execution policy',
    description:'Evaluate a batch of proposed actions and return only those currently allowed. Consequential actions remain pending until valid explicit approvals are supplied.',
    inputSchema:enforceExecutionPolicySchema
  },async ({actions,policy,approvals})=>result(enforceExecutionPolicy(actions,policy,approvals)));

  server.registerTool('krom_audit_execution_policy',{
    title:'Audit execution policy state',
    description:'Audit action classifications, approvals, high-risk pending actions and orphan approvals without treating silence as consent.',
    inputSchema:enforceExecutionPolicySchema
  },async ({actions,policy,approvals})=>result(auditExecutionPolicy(actions,policy,approvals)));

  server.registerTool('krom_compare_execution_policies',{
    title:'Compare execution policies',
    description:'Compare two execution policies to detect changes in auto-execute, approval and blocked action classes.',
    inputSchema:compareExecutionPoliciesSchema
  },async ({before,after})=>result(compareExecutionPolicies(before,after)));



  server.registerTool('krom_get_quality_gate_policy',{
    title:'Get quality gate policy',
    description:'Return the v37 quality gate dimensions and hard-stop rules used before DONE or RELEASE_READY may be claimed.',
    inputSchema:z.object({})
  },async ()=>result(getDefaultQualityGate()));

  server.registerTool('krom_evaluate_plan_quality',{
    title:'Evaluate engineering plan quality',
    description:'Evaluate dependency integrity, acceptance criteria, evidence requirements, assumptions and risk coverage before implementation begins.',
    inputSchema:planQualityInputSchema
  },async (input)=>result(evaluatePlanQuality(input)));

  server.registerTool('krom_evaluate_quality_gate',{
    title:'Evaluate project quality gate',
    description:'Evaluate weighted quality dimensions, blockers, unsupported claims and residual risks. Critical gaps prevent RELEASE_READY.',
    inputSchema:qualityGateInputSchema
  },async (input)=>result(evaluateQualityGate(input)));

  server.registerTool('krom_evaluate_delivery_quality',{
    title:'Evaluate final delivery quality',
    description:'Audit the final delivery summary, completed items, evidence references, known gaps and user-facing claims before handoff.',
    inputSchema:deliveryQualityInputSchema
  },async (input)=>result(evaluateDeliveryQuality(input)));

  server.registerTool('krom_self_critique',{
    title:'Run KROM self-critique',
    description:'Perform a conservative self-review over plan, execution, evidence, blockers and residual risks without converting missing proof into success.',
    inputSchema:z.object({objective:z.string().min(3),plan:z.unknown().optional(),execution:z.unknown().optional(),evidence:z.array(z.string()).default([]),blockers:z.array(z.string()).default([]),risks:z.array(z.string()).default([])})
  },async (input)=>result(selfCritique(input)));

  server.registerTool('krom_compare_quality_gates',{
    title:'Compare quality gate snapshots',
    description:'Compare before/after quality snapshots and quantify whether remediation actually improved the evidence-backed gate result.',
    inputSchema:compareQualityGatesSchema
  },async ({before,after})=>result(compareQualityGates(before,after)));



  server.registerTool('krom_create_restore_point',{
    title:'Create recovery restore point',
    description:'Normalize a host-supplied restore point and flag whether it is evidence-backed before any rollback plan relies on it.',
    inputSchema:restorePointSchema
  },async (input)=>result(createRestorePoint(input)));

  server.registerTool('krom_assess_recovery_impact',{
    title:'Assess recovery blast radius',
    description:'Assess production impact, data-loss risk, downtime risk, affected areas and irreversible steps before recovery actions are planned.',
    inputSchema:recoveryImpactSchema
  },async (input)=>result(assessRecoveryImpact(input)));

  server.registerTool('krom_build_recovery_plan',{
    title:'Build rollback or recovery plan',
    description:'Build and validate an evidence-aware recovery plan with approvals, preconditions, abort conditions and post-recovery checks.',
    inputSchema:recoveryPlanSchema
  },async (input)=>result(buildRecoveryPlan(input)));

  server.registerTool('krom_validate_recovery_execution',{
    title:'Validate recovery execution state',
    description:'Validate host-reported recovery step results, approvals and evidence. PASS without required evidence is rejected.',
    inputSchema:recoveryExecutionSchema
  },async (input)=>result(validateRecoveryExecution(input)));

  server.registerTool('krom_verify_recovery',{
    title:'Verify recovery result',
    description:'Verify target state, service health, data integrity and post-recovery checks before claiming rollback or recovery succeeded.',
    inputSchema:recoveryVerificationSchema
  },async (input)=>result(verifyRecovery(input)));

  server.registerTool('krom_recommend_recovery_strategy',{
    title:'Recommend recovery strategy',
    description:'Recommend roll-forward, code/deployment rollback, database restore or manual recovery review from supplied impact evidence.',
    inputSchema:recoveryImpactSchema
  },async (input)=>result(recommendRecoveryStrategy(input)));

  server.registerTool('krom_compare_restore_points',{
    title:'Compare restore points',
    description:'Compare two restore points to detect source, environment and evidence changes.',
    inputSchema:compareRestorePointsSchema
  },async ({before,after})=>result(compareRestorePoints(before,after)));


  server.registerTool('krom_normalize_runtime_signals',{title:'Normalize runtime signals',description:'Normalize host-supplied logs, metrics, traces, health checks and runtime events into a verified observability snapshot.',inputSchema:observabilitySnapshotSchema},async (input)=>result(normalizeRuntimeSignals(input)));
  server.registerTool('krom_evaluate_service_health',{title:'Evaluate service health',description:'Evaluate service health only from verified host-supplied telemetry and required checks. Missing evidence yields INSUFFICIENT_EVIDENCE rather than healthy.',inputSchema:serviceHealthInputSchema},async (input)=>result(evaluateServiceHealth(input)));
  server.registerTool('krom_detect_runtime_anomalies',{title:'Detect runtime anomalies',description:'Detect verified severity, threshold and baseline-deviation anomalies without treating heuristics as root-cause proof.',inputSchema:anomalyInputSchema},async (input)=>result(detectRuntimeAnomalies(input)));
  server.registerTool('krom_correlate_runtime_incident',{title:'Correlate runtime incident evidence',description:'Correlate verified runtime failures with deployment/change/debug references while explicitly avoiding unsupported causation claims.',inputSchema:incidentCorrelationSchema},async (input)=>result(correlateRuntimeIncident(input)));
  server.registerTool('krom_evaluate_slo',{title:'Evaluate SLO status',description:'Calculate observed service level and error-budget consumption from supplied event counts.',inputSchema:sloInputSchema},async (input)=>result(evaluateSlo(input)));
  server.registerTool('krom_build_runtime_evidence',{title:'Build runtime evidence artifacts',description:'Convert runtime signals into evidence artifacts consumable by debugging, recovery, evidence and quality-gate workflows.',inputSchema:observabilitySnapshotSchema},async (input)=>result(buildRuntimeEvidence(input)));
  server.registerTool('krom_recommend_runtime_action',{title:'Recommend runtime response',description:'Recommend evidence collection, debugging, recovery review or continued monitoring from verified runtime signals.',inputSchema:observabilitySnapshotSchema},async (input)=>result(recommendRuntimeAction(input)));
  server.registerTool('krom_compare_runtime_snapshots',{title:'Compare runtime snapshots',description:'Compare before/after verified runtime error and critical-signal counts to support recovery and release verification.',inputSchema:compareObservabilitySnapshotsSchema},async ({before,after})=>result(compareObservabilitySnapshots(before,after)));


  server.registerTool('krom_evaluate_production_readiness',{title:'Evaluate production readiness',description:'Aggregate quality, evidence, security, runtime, recovery, approval, deployment and data gates into an evidence-backed production-readiness assessment.',inputSchema:productionReadinessInputSchema},async (input)=>result(evaluateProductionReadiness(input)));
  server.registerTool('krom_decide_release',{title:'Decide release control state',description:'Return READY, CONDITIONAL or BLOCKED using hard stops, weighted readiness, approvals and explicit exception policy.',inputSchema:releaseDecisionSchema},async (input)=>result(decideRelease(input)));
  server.registerTool('krom_build_release_checklist',{title:'Build production release checklist',description:'Build a complete release checklist across build, tests, security, evidence, runtime, recovery, quality, approval, deployment and data.',inputSchema:productionReadinessInputSchema},async (input)=>result(buildReleaseChecklist(input)));
  server.registerTool('krom_evaluate_release_exception',{title:'Evaluate release exception',description:'Validate an explicit release exception record with approver, compensating controls and evidence without converting failed gates into PASS.',inputSchema:releaseExceptionSchema},async (input)=>result(evaluateReleaseException(input)));
  server.registerTool('krom_verify_post_release',{title:'Verify production release',description:'Verify deployment, healthy runtime, regression checks, incidents and evidence after release before closing the release.',inputSchema:postReleaseVerificationSchema},async (input)=>result(verifyPostRelease(input)));
  server.registerTool('krom_create_release_control_summary',{title:'Create release control summary',description:'Create one control-plane summary combining readiness assessment and operational release checklist.',inputSchema:productionReadinessInputSchema},async (input)=>result(createReleaseControlSummary(input)));
  server.registerTool('krom_compare_production_readiness',{title:'Compare production readiness',description:'Compare before/after production readiness scores, hard stops and warnings to show whether remediation improved release state.',inputSchema:compareReadinessSchema},async ({before,after})=>result(compareProductionReadiness(before,after)));


  server.registerTool('krom_evaluate_security_assessment',{title:'Evaluate security assessment',description:'Evaluate evidence-backed security findings and controls; critical gaps or missing controls block a secure release claim.',inputSchema:securityAssessmentSchema},async (input)=>result(evaluateSecurityAssessment(input)));
  server.registerTool('krom_audit_rls',{title:'Audit database RLS evidence',description:'Audit host-supplied RLS enablement, policies and negative access tests. Missing evidence is a gap, not a pass.',inputSchema:rlsAuditSchema},async (input)=>result(auditRls(input)));
  server.registerTool('krom_audit_authorization',{title:'Audit authorization evidence',description:'Audit server-side authorization and negative permission tests for protected resources.',inputSchema:authzAuditSchema},async (input)=>result(auditAuthorization(input)));
  server.registerTool('krom_audit_secrets',{title:'Audit secret exposure evidence',description:'Detect secret-like material reported in source, logs or client bundles without reproducing secret values.',inputSchema:secretsAuditSchema},async (input)=>result(auditSecrets(input)));
  server.registerTool('krom_audit_dependencies_security',{title:'Audit dependency security evidence',description:'Summarize host-supplied dependency advisory severities; unknown or high-risk findings remain explicit gaps.',inputSchema:dependencyAuditSchema},async (input)=>result(auditDependencies(input)));
  server.registerTool('krom_build_security_control_matrix',{title:'Build security control matrix',description:'Map security controls to verification status and evidence coverage for release control.',inputSchema:securityAssessmentSchema},async (input)=>result(buildSecurityControlMatrix(input)));
  server.registerTool('krom_recommend_security_remediation',{title:'Recommend security remediation order',description:'Prioritize open security findings by severity and define verification-oriented remediation steps.',inputSchema:securityAssessmentSchema},async (input)=>result(recommendSecurityRemediation(input)));
  server.registerTool('krom_compare_security_assessments',{title:'Compare security assessments',description:'Compare before/after open security findings and gate state to show verified remediation progress.',inputSchema:compareSecurityAssessmentsSchema},async ({before,after})=>result(compareSecurityAssessments(before,after)));


  server.registerTool('krom_evaluate_compliance_assessment',{title:'Evaluate compliance assessment',description:'Evaluate obligations with source authority, applicability, status and verified evidence. Mandatory requirements cannot be inferred from guidance, benchmarks or assumptions.',inputSchema:complianceAssessmentSchema},async (input)=>result(evaluateComplianceAssessment(input)));
  server.registerTool('krom_map_compliance_evidence',{title:'Map compliance evidence',description:'Map each requirement to linked and verified evidence artifacts and expose coverage gaps.',inputSchema:complianceAssessmentSchema},async (input)=>result(mapComplianceEvidence(input)));
  server.registerTool('krom_build_compliance_control_coverage',{title:'Build compliance control coverage',description:'Map controls to the requirements they satisfy and highlight incomplete coverage.',inputSchema:complianceAssessmentSchema},async (input)=>result(buildControlCoverage(input)));
  server.registerTool('krom_evaluate_compliance_exception',{title:'Evaluate compliance exception',description:'Validate a time-bounded governance exception with approver, compensating controls and evidence without rewriting compliance status.',inputSchema:complianceExceptionSchema},async (input)=>result(evaluateComplianceException(input)));
  server.registerTool('krom_decide_governance',{title:'Decide governance state',description:'Combine compliance assessment and valid exceptions into APPROVED, CONDITIONAL or BLOCKED governance state.',inputSchema:governanceDecisionSchema},async (input)=>result(decideGovernance(input)));
  server.registerTool('krom_recommend_compliance_remediation',{title:'Recommend compliance remediation',description:'Prioritize mandatory non-compliance, unknown obligations, source-authority gaps and missing evidence.',inputSchema:complianceAssessmentSchema},async (input)=>result(recommendComplianceRemediation(input)));
  server.registerTool('krom_compare_compliance_assessments',{title:'Compare compliance assessments',description:'Compare before/after requirement status and governance gate changes.',inputSchema:compareComplianceAssessmentsSchema},async ({before,after})=>result(compareComplianceAssessments(before,after)));



  // v43 Enterprise Mega Pack — Data / Performance / Supply Chain / Release Train
  server.registerTool('krom_audit_database_architecture',{title:'Audit database architecture',description:'Audit host-supplied schema structure, tenant boundaries, sensitive fields, indexes and RLS evidence without inferring safety from missing evidence.',inputSchema:databaseSnapshotSchema},async (input)=>result(auditDatabaseArchitecture(input)));
  server.registerTool('krom_detect_schema_drift',{title:'Detect database schema drift',description:'Compare expected and actual database snapshots and identify missing, unexpected and changed entities.',inputSchema:schemaDriftSchema},async (input)=>result(detectSchemaDrift(input)));
  server.registerTool('krom_assess_migration_safety',{title:'Assess migration safety',description:'Evaluate destructive/reversible migration characteristics, backup evidence, rollback readiness and downtime risk.',inputSchema:migrationSafetySchema},async (input)=>result(assessMigrationSafety(input)));
  server.registerTool('krom_analyze_query_performance',{title:'Analyze query performance',description:'Evaluate host-supplied query latency, rows scanned and index-use evidence against explicit budgets.',inputSchema:queryAnalysisSchema},async (input)=>result(analyzeQueryPerformance(input)));
  server.registerTool('krom_evaluate_data_integrity',{title:'Evaluate data integrity evidence',description:'Evaluate explicit integrity checks and preserve UNKNOWN when evidence is absent.',inputSchema:dataIntegritySchema},async (input)=>result(evaluateDataIntegrity(input)));
  server.registerTool('krom_verify_backup_readiness',{title:'Verify backup readiness evidence',description:'Report whether backup readiness is evidenced; never claims restorable backups from configuration alone.',inputSchema:databaseSnapshotSchema},async (input)=>result(verifyBackupReadiness(input)));
  server.registerTool('krom_compare_database_snapshots',{title:'Compare database snapshots',description:'Compare before/after database state to expose schema drift.',inputSchema:compareDatabaseSnapshotsSchema},async ({before,after})=>result(compareDatabaseSnapshots(before,after)));

  server.registerTool('krom_evaluate_performance_budgets',{title:'Evaluate performance budgets',description:'Check supplied runtime metrics against explicit performance budgets and preserve unknowns.',inputSchema:performanceBudgetSchema},async (input)=>result(evaluatePerformanceBudgets(input)));
  server.registerTool('krom_analyze_runtime_cost',{title:'Analyze runtime cost',description:'Aggregate only supplied resource-cost estimates and expose unknown-cost resources.',inputSchema:performanceSnapshotSchema},async (input)=>result(analyzeRuntimeCost(input)));
  server.registerTool('krom_enforce_cost_guardrail',{title:'Enforce cost guardrail',description:'Compare evidence-backed estimated cost to an explicit budget and return WITHIN_BUDGET, WARNING or BLOCKED.',inputSchema:costGuardrailSchema},async (input)=>result(enforceCostGuardrail(input)));
  server.registerTool('krom_detect_performance_regression',{title:'Detect performance regression',description:'Compare before/after performance metrics and flag values that regressed.',inputSchema:comparePerformanceSnapshotsSchema},async ({before,after})=>result(detectPerformanceRegression(before,after)));
  server.registerTool('krom_recommend_performance_actions',{title:'Recommend performance actions',description:'Generate evidence-linked optimization actions only for supplied budget violations.',inputSchema:performanceSnapshotSchema},async (input)=>result(recommendPerformanceActions(input)));
  server.registerTool('krom_compare_performance_snapshots',{title:'Compare performance snapshots',description:'Compare performance snapshots using the same regression logic.',inputSchema:comparePerformanceSnapshotsSchema},async ({before,after})=>result(comparePerformanceSnapshots(before,after)));

  server.registerTool('krom_audit_supply_chain',{title:'Audit software supply chain',description:'Audit dependency deprecation, security severity and verification-evidence gaps from host-supplied dependency data.',inputSchema:dependencySnapshotSchema},async (input)=>result(auditSupplyChain(input)));
  server.registerTool('krom_detect_dependency_version_drift',{title:'Detect dependency version drift',description:'Identify dependencies whose current versions differ from supplied latest-known versions.',inputSchema:dependencySnapshotSchema},async (input)=>result(detectVersionDrift(input)));
  server.registerTool('krom_evaluate_license_risk',{title:'Evaluate dependency license evidence',description:'Expose dependencies with unknown license evidence without making legal compatibility conclusions.',inputSchema:dependencySnapshotSchema},async (input)=>result(evaluateLicenseRisk(input)));
  server.registerTool('krom_build_dependency_upgrade_plan',{title:'Build dependency upgrade plan',description:'Create an ordered upgrade-and-verification plan with mandatory compatibility research for major upgrades.',inputSchema:upgradePlanSchema},async (input)=>result(buildDependencyUpgradePlan(input)));
  server.registerTool('krom_compare_dependency_snapshots',{title:'Compare dependency snapshots',description:'Compare added, removed and version-changed dependencies.',inputSchema:compareDependencySnapshotsSchema},async ({before,after})=>result(compareDependencySnapshots(before,after)));

  server.registerTool('krom_assess_change_blast_radius',{title:'Assess change blast radius',description:'Score change impact using database, auth, API-contract, user-facing, reversibility and multi-service drivers.',inputSchema:changeSetSchema},async (input)=>result(assessChangeBlastRadius(input)));
  server.registerTool('krom_build_rollout_plan',{title:'Build safe rollout plan',description:'Choose direct or progressive rollout strategy from change risk and define health checks and rollback triggers.',inputSchema:rolloutPlanSchema},async (input)=>result(buildRolloutPlan(input)));
  server.registerTool('krom_build_release_train',{title:'Build release train',description:'Topologically order dependent changes and block invalid dependencies or cycles.',inputSchema:releaseTrainSchema},async (input)=>result(buildReleaseTrain(input)));
  server.registerTool('krom_evaluate_change_readiness',{title:'Evaluate change readiness',description:'Evaluate evidence and recovery gaps for a concrete change set before release.',inputSchema:changeSetSchema},async (input)=>result(evaluateChangeReadiness(input)));
  server.registerTool('krom_compare_change_sets',{title:'Compare change sets',description:'Compare file/service scope and blast-radius changes before and after refinement.',inputSchema:compareChangeSetsSchema},async ({before,after})=>result(compareChangeSets(before,after)));


  // v44 Intelligence Mega Pack — Planning Intelligence
  server.registerTool('krom_build_execution_graph',{title:'Build execution graph',description:'Build a dependency-aware execution order and block dangling dependencies or cycles.',inputSchema:planningModelSchema},async (input)=>result(buildExecutionGraph(input)));
  server.registerTool('krom_evaluate_plan_intelligence',{title:'Evaluate engineering plan intelligence',description:'Evaluate plan structure, acceptance criteria, evidence requirements, assumptions and dependency validity.',inputSchema:planningModelSchema},async (input)=>result(evaluatePlanIntelligence(input)));
  server.registerTool('krom_select_next_plan_action',{title:'Select next plan action',description:'Select the highest-priority executable work item from completed/failed dependency state without skipping unmet prerequisites.',inputSchema:executionSelectionSchema},async (input)=>result(selectNextPlanAction(input)));
  server.registerTool('krom_detect_plan_conflicts',{title:'Detect plan conflicts',description:'Detect explicit planning conflicts such as self-dependencies and invalid execution structure.',inputSchema:planningModelSchema},async (input)=>result(detectPlanConflicts(input)));
  server.registerTool('krom_create_plan_evidence_matrix',{title:'Create plan evidence matrix',description:'Map plan items to acceptance criteria and required evidence before implementation begins.',inputSchema:planningModelSchema},async (input)=>result(createPlanEvidenceMatrix(input)));
  server.registerTool('krom_compare_plans',{title:'Compare engineering plans',description:'Compare before/after plan quality, added work and removed work.',inputSchema:comparePlansSchema},async ({before,after})=>result(comparePlans(before,after)));

  // v44 Requirements Traceability
  server.registerTool('krom_build_traceability_matrix',{title:'Build requirements traceability matrix',description:'Map each requirement through design, code, tests, evidence and release references.',inputSchema:traceabilityModelSchema},async (input)=>result(buildTraceabilityMatrix(input)));
  server.registerTool('krom_evaluate_requirement_coverage',{title:'Evaluate requirement coverage',description:'Detect requirements missing acceptance criteria, implementation links, tests or verification evidence.',inputSchema:traceabilityModelSchema},async (input)=>result(evaluateRequirementCoverage(input)));
  server.registerTool('krom_detect_orphan_requirements',{title:'Detect orphan requirements',description:'Find requirements with no design, code, test or evidence trace links.',inputSchema:traceabilityModelSchema},async (input)=>result(detectOrphanRequirements(input)));
  server.registerTool('krom_detect_unproven_requirements',{title:'Detect unproven requirements',description:'Reject VERIFIED requirement claims that have no linked evidence.',inputSchema:traceabilityModelSchema},async (input)=>result(detectUnprovenRequirements(input)));
  server.registerTool('krom_build_requirement_release_gate',{title:'Build requirement release gate',description:'Block release when MUST requirements are not verified with evidence.',inputSchema:traceabilityModelSchema},async (input)=>result(buildRequirementReleaseGate(input)));
  server.registerTool('krom_compare_traceability',{title:'Compare requirement traceability',description:'Compare requirement coverage before and after implementation.',inputSchema:compareTraceabilitySchema},async ({before,after})=>result(compareTraceability(before,after)));

  // v44 Architecture Decision Intelligence
  server.registerTool('krom_audit_architecture_model',{title:'Audit architecture model',description:'Audit component dependencies, trust-boundary coverage and recorded architecture decisions.',inputSchema:architectureModelSchema},async (input)=>result(auditArchitectureModel(input)));
  server.registerTool('krom_detect_architecture_cycles',{title:'Detect architecture cycles',description:'Detect cyclic component dependencies from the supplied architecture model.',inputSchema:architectureModelSchema},async (input)=>result(detectArchitectureCycles(input)));
  server.registerTool('krom_evaluate_architecture_decisions',{title:'Evaluate architecture decisions',description:'Audit accepted ADR evidence and supersession references without inventing design justification.',inputSchema:architectureModelSchema},async (input)=>result(evaluateArchitectureDecisions(input)));
  server.registerTool('krom_assess_architecture_change_impact',{title:'Assess architecture change impact',description:'Compare architecture models and estimate structural impact from added, removed and changed components.',inputSchema:architectureChangeSchema},async ({before,after})=>result(assessArchitectureChangeImpact(before,after)));
  server.registerTool('krom_build_architecture_decision_register',{title:'Build architecture decision register',description:'Create an auditable ADR register with status, supersession and evidence coverage.',inputSchema:architectureModelSchema},async (input)=>result(buildArchitectureDecisionRegister(input)));
  server.registerTool('krom_compare_architecture_models',{title:'Compare architecture models',description:'Compare architecture health and structural impact before and after changes.',inputSchema:architectureChangeSchema},async ({before,after})=>result(compareArchitectureModels(before,after)));

  // v44 Test Intelligence
  server.registerTool('krom_evaluate_test_coverage',{title:'Evaluate risk-based test coverage',description:'Measure changed-area and critical-area test coverage without equating test count with meaningful coverage.',inputSchema:testSuiteSchema},async (input)=>result(evaluateTestCoverage(input)));
  server.registerTool('krom_select_risk_based_tests',{title:'Select risk-based tests',description:'Select the highest-value tests using changed-area, critical-area and risk evidence.',inputSchema:testSelectionSchema},async (input)=>result(selectRiskBasedTests(input)));
  server.registerTool('krom_cluster_test_failures',{title:'Cluster test failures',description:'Group failed and flaky tests by supplied failure signature to reduce duplicate debugging.',inputSchema:testSuiteSchema},async (input)=>result(clusterTestFailures(input)));
  server.registerTool('krom_detect_flaky_tests',{title:'Detect flaky tests',description:'Identify explicitly reported flaky tests and preserve their evidence state.',inputSchema:testSuiteSchema},async (input)=>result(detectFlakyTests(input)));
  server.registerTool('krom_evaluate_test_evidence',{title:'Evaluate test evidence',description:'Treat PASS results without evidence as unsupported rather than release proof.',inputSchema:testSuiteSchema},async (input)=>result(evaluateTestEvidence(input)));
  server.registerTool('krom_build_regression_plan',{title:'Build regression test plan',description:'Build a risk-based regression plan from changed and critical areas.',inputSchema:testSuiteSchema},async (input)=>result(buildRegressionPlan(input)));
  server.registerTool('krom_compare_test_suites',{title:'Compare test suites',description:'Compare before/after test evidence, new failures and resolved failures.',inputSchema:compareTestSuitesSchema},async ({before,after})=>result(compareTestSuites(before,after)));

  // v44 API Contract Intelligence
  server.registerTool('krom_audit_api_contracts',{title:'Audit API contracts',description:'Audit endpoint auth, errors and evidence coverage from explicit API contracts.',inputSchema:apiContractSchema},async (input)=>result(auditApiContracts(input)));
  server.registerTool('krom_detect_breaking_api_changes',{title:'Detect breaking API changes',description:'Detect removed endpoints, required response changes, new required request fields and auth-model changes.',inputSchema:compareApiContractsSchema},async ({before,after})=>result(detectBreakingApiChanges(before,after)));
  server.registerTool('krom_audit_api_authorization',{title:'Audit API authorization evidence',description:'Expose protected API endpoints lacking authorization verification evidence.',inputSchema:apiContractSchema},async (input)=>result(auditApiAuthorization(input)));
  server.registerTool('krom_audit_api_idempotency',{title:'Audit API idempotency',description:'Identify mutation endpoints that require explicit idempotency review.',inputSchema:apiContractSchema},async (input)=>result(auditApiIdempotency(input)));
  server.registerTool('krom_build_api_contract_test_plan',{title:'Build API contract test plan',description:'Generate happy-path, auth-negative, validation, idempotency and pagination contract test requirements.',inputSchema:apiContractSchema},async (input)=>result(buildApiContractTestPlan(input)));
  server.registerTool('krom_compare_api_contracts',{title:'Compare API contracts',description:'Compare API compatibility and contract-audit state before and after a change.',inputSchema:compareApiContractsSchema},async ({before,after})=>result(compareApiContracts(before,after)));

  // v44 Engineering Knowledge Graph
  server.registerTool('krom_audit_knowledge_graph',{title:'Audit engineering knowledge graph',description:'Detect dangling edges, duplicate node IDs and orphan engineering knowledge.',inputSchema:knowledgeGraphSchema},async (input)=>result(auditKnowledgeGraph(input)));
  server.registerTool('krom_query_knowledge_neighborhood',{title:'Query knowledge neighborhood',description:'Traverse related requirements, components, APIs, tests, evidence, risks and deployments around a node.',inputSchema:graphQuerySchema},async (input)=>result(queryKnowledgeNeighborhood(input)));
  server.registerTool('krom_find_knowledge_contradictions',{title:'Find knowledge contradictions',description:'Surface explicit CONTRADICTS or CONFLICTS_WITH graph relations.',inputSchema:knowledgeGraphSchema},async (input)=>result(findKnowledgeContradictions(input)));
  server.registerTool('krom_evaluate_knowledge_evidence_coverage',{title:'Evaluate knowledge evidence coverage',description:'Check decision, risk and control nodes for evidence-connected support.',inputSchema:knowledgeGraphSchema},async (input)=>result(evaluateKnowledgeEvidenceCoverage(input)));
  server.registerTool('krom_build_impact_graph',{title:'Build change impact graph',description:'Traverse up to three hops around a node to expose related engineering impact before a change.',inputSchema:graphQuerySchema},async ({graph,nodeId})=>result(buildImpactGraph(graph,nodeId)));
  server.registerTool('krom_compare_knowledge_graphs',{title:'Compare engineering knowledge graphs',description:'Compare graph nodes, edges and integrity before and after engineering changes.',inputSchema:compareKnowledgeGraphsSchema},async ({before,after})=>result(compareKnowledgeGraphs(before,after)));

  server.registerTool(
    'krom_get_capabilities',
    {
      title: 'Get KROM Forge capabilities',
      description: 'List the MCP tools and the boundaries of this server.',
      inputSchema: z.object({})
    },
    async () => result({
      version: '44.0.0',
      transport: 'Streamable HTTP',
      protocol: 'MCP 2026-07-28 with 2025 stateless compatibility',
      endpoint: '/mcp',
      tools: ['krom_route_workflow', 'krom_create_research_brief', 'krom_create_master_prompt_blueprint', 'krom_create_uiux_blueprint', 'krom_create_engineering_blueprint', 'krom_create_debug_plan', 'krom_evaluate_release_evidence', 'krom_select_tools', 'krom_build_task_graph', 'krom_plan_execution', 'krom_resume_task', 'krom_verify_evidence', 'krom_audit_project', 'krom_inspect_project', 'krom_build_project_inventory', 'krom_map_architecture', 'krom_inventory_dependencies', 'krom_detect_broken_routes', 'krom_detect_duplicates', 'krom_find_risks', 'krom_compare_project_state', 'krom_classify_sources', 'krom_extract_requirements', 'krom_build_domain_model', 'krom_detect_research_conflicts', 'krom_assess_research_coverage', 'krom_synthesize_research', 'krom_plan_code_change', 'krom_prepare_patch', 'krom_validate_change_scope', 'krom_assess_patch_risk', 'krom_generate_migration_plan', 'krom_generate_test_plan', 'krom_review_diff', 'krom_verify_patch_evidence', 'krom_list_agents', 'krom_route_agent', 'krom_create_agent_run', 'krom_agent_handoff', 'krom_coordinate_agents', 'krom_evaluate_agent_run', 'krom_create_project_memory', 'krom_get_project_memory', 'krom_update_project_memory', 'krom_record_decision', 'krom_record_failure', 'krom_record_evidence', 'krom_record_test_result', 'krom_record_deployment', 'krom_record_task', 'krom_record_risk', 'krom_record_project_snapshot', 'krom_get_project_timeline', 'krom_compare_project_memory', 'krom_audit_project_memory', 'krom_audit_ui', 'krom_audit_responsive', 'krom_audit_rtl', 'krom_audit_accessibility', 'krom_build_design_system', 'krom_review_ui_evidence', 'krom_compare_ui_states', 'krom_generate_ui_fix_plan', 'krom_create_debug_session', 'krom_classify_failure', 'krom_add_debug_evidence', 'krom_add_debug_hypothesis', 'krom_record_debug_attempt', 'krom_update_reproduction', 'krom_build_root_cause_graph', 'krom_check_debug_loop', 'krom_next_debug_diagnostic', 'krom_set_root_cause', 'krom_record_debug_fix', 'krom_verify_debug_fix', 'krom_evaluate_debug_closure', 'krom_create_evidence_bundle', 'krom_record_claim', 'krom_record_evidence_artifact', 'krom_link_claim_evidence', 'krom_verify_claim', 'krom_audit_evidence_graph', 'krom_build_release_evidence', 'krom_compare_evidence_snapshots', 'krom_create_autonomous_loop', 'krom_get_next_autonomous_action', 'krom_advance_autonomous_loop', 'krom_record_loop_host_result', 'krom_resume_autonomous_loop', 'krom_audit_autonomous_loop', 'krom_register_host_capabilities', 'krom_assess_host_requirements', 'krom_adapt_loop_to_host', 'krom_recommend_host_strategy', 'krom_validate_host_evidence', 'krom_compare_host_capabilities', 'krom_get_execution_policy', 'krom_classify_execution_action', 'krom_create_approval_request', 'krom_evaluate_approval', 'krom_enforce_execution_policy', 'krom_audit_execution_policy', 'krom_compare_execution_policies', 'krom_get_quality_gate_policy', 'krom_evaluate_plan_quality', 'krom_evaluate_quality_gate', 'krom_evaluate_delivery_quality', 'krom_self_critique', 'krom_compare_quality_gates', 'krom_create_restore_point', 'krom_assess_recovery_impact', 'krom_build_recovery_plan', 'krom_validate_recovery_execution', 'krom_verify_recovery', 'krom_recommend_recovery_strategy', 'krom_compare_restore_points', 'krom_normalize_runtime_signals', 'krom_evaluate_service_health', 'krom_detect_runtime_anomalies', 'krom_correlate_runtime_incident', 'krom_evaluate_slo', 'krom_build_runtime_evidence', 'krom_recommend_runtime_action', 'krom_compare_runtime_snapshots', 'krom_evaluate_production_readiness', 'krom_decide_release', 'krom_build_release_checklist', 'krom_evaluate_release_exception', 'krom_verify_post_release', 'krom_create_release_control_summary', 'krom_compare_production_readiness', 'krom_evaluate_security_assessment', 'krom_audit_rls', 'krom_audit_authorization', 'krom_audit_secrets', 'krom_audit_dependencies_security', 'krom_build_security_control_matrix', 'krom_recommend_security_remediation', 'krom_compare_security_assessments', 'krom_evaluate_compliance_assessment', 'krom_map_compliance_evidence', 'krom_build_compliance_control_coverage', 'krom_evaluate_compliance_exception', 'krom_decide_governance', 'krom_recommend_compliance_remediation', 'krom_compare_compliance_assessments', 'krom_audit_database_architecture', 'krom_detect_schema_drift', 'krom_assess_migration_safety', 'krom_analyze_query_performance', 'krom_evaluate_data_integrity', 'krom_verify_backup_readiness', 'krom_compare_database_snapshots', 'krom_evaluate_performance_budgets', 'krom_analyze_runtime_cost', 'krom_enforce_cost_guardrail', 'krom_detect_performance_regression', 'krom_recommend_performance_actions', 'krom_compare_performance_snapshots', 'krom_audit_supply_chain', 'krom_detect_dependency_version_drift', 'krom_evaluate_license_risk', 'krom_build_dependency_upgrade_plan', 'krom_compare_dependency_snapshots', 'krom_assess_change_blast_radius', 'krom_build_rollout_plan', 'krom_build_release_train', 'krom_evaluate_change_readiness', 'krom_compare_change_sets', 'krom_build_execution_graph', 'krom_evaluate_plan_intelligence', 'krom_select_next_plan_action', 'krom_detect_plan_conflicts', 'krom_create_plan_evidence_matrix', 'krom_compare_plans', 'krom_build_traceability_matrix', 'krom_evaluate_requirement_coverage', 'krom_detect_orphan_requirements', 'krom_detect_unproven_requirements', 'krom_build_requirement_release_gate', 'krom_compare_traceability', 'krom_audit_architecture_model', 'krom_detect_architecture_cycles', 'krom_evaluate_architecture_decisions', 'krom_assess_architecture_change_impact', 'krom_build_architecture_decision_register', 'krom_compare_architecture_models', 'krom_evaluate_test_coverage', 'krom_select_risk_based_tests', 'krom_cluster_test_failures', 'krom_detect_flaky_tests', 'krom_evaluate_test_evidence', 'krom_build_regression_plan', 'krom_compare_test_suites', 'krom_audit_api_contracts', 'krom_detect_breaking_api_changes', 'krom_audit_api_authorization', 'krom_audit_api_idempotency', 'krom_build_api_contract_test_plan', 'krom_compare_api_contracts', 'krom_audit_knowledge_graph', 'krom_query_knowledge_neighborhood', 'krom_find_knowledge_contradictions', 'krom_evaluate_knowledge_evidence_coverage', 'krom_build_impact_graph', 'krom_compare_knowledge_graphs', 'krom_get_capabilities'],
      boundary: 'Autonomous engineering orchestration, evidence-based project inspection, research synthesis, patch planning/review, multi-agent coordination, project-scoped intelligence memory, UI/UX intelligence, evidence-driven debugging, claim-to-evidence verification, execution-policy/approval enforcement, self-evaluation quality gates, and recovery/rollback intelligence, observability/runtime intelligence, and production-readiness/release control, security/policy intelligence, compliance/governance intelligence, database/data intelligence, performance/cost intelligence, software-supply-chain intelligence, change/release-train intelligence, planning intelligence, requirements traceability, architecture-decision intelligence, test intelligence, API-contract intelligence, and engineering knowledge-graph intelligence over host-supplied evidence. Project memory defaults to PORTABLE host-carried state; durable persistence requires a separately authorized external store. Specialist agents coordinate and validate handoffs but external browsing, file mutation, repository, execution, database and deployment actions still require host-authorized tools; KROM Forge never fabricates agent execution, edits, tests, persistence, or deployment success.'
    })
  );
}, {
  serverInfo: { name: 'krom-forge', version: '44.0.0' }
});

export { handler as GET, handler as POST };
