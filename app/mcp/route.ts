import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import pkg from '../../package.json';
import { V54_TOOL_SPECS, V54_TOOL_NAMES, v54AutomationSchema, executeV54Tool } from '../../src/v54-registry';
import { v55RuntimeSchema } from '../../src/v55-schema';
import {
 routeAdaptiveIntent, loadDomainSkillPacks, rankToolQuality, compressCapabilities, buildAdaptiveTaskGraph, planParallelExecution,
 buildAgentCommandCenter, detectAgentContradictions, scoreEvidenceTrust, buildAutomaticReverification, simulateExecutionDryRun,
 evaluateMutationRisk, createMissionCheckpointV55, resumeMissionCheckpointV55, assessChangeImpactV2, simulateReleaseTwinV2,
 buildIncidentCommander, evaluateIncidentAction, governExecutionCost, selectAdaptiveDepth, detectDecisionContradictions,
 reconcileDecisionContradictions, selectExecutionProvider, buildPluginAdapterPlan, buildMissionConsoleSnapshot, learnFromOutcome,
 buildOnDemandToolSet, evaluateRoutingEfficiency
} from '../../src/v55-engine';
import { v56RuntimeSchema } from '../../src/v56-schema';
import {
  buildSemanticMissionMemory, compactMissionMemory, replayMissionDeterministically, compareMissionReplays,
  classifyFailureForReplan, buildSelfHealingReplan, enforceRetryBudget, detectRetryLoop,
  updateProviderCircuitBreaker, selectFailoverProvider, buildToolShadowEvaluation, evaluateToolCanary,
  detectSemanticToolOverlap, recommendToolDeprecations, buildAgentQuorum, evaluateAgentQuorum,
  compileRuntimePolicy, diffRuntimePolicies, propagateEvidenceInvalidation, buildCausalExecutionTrace,
  evaluateRecoveryConfidence, buildRuntimeObservabilitySnapshot, detectRuntimeControlAnomalies, buildSelfHealingCommandSnapshot
} from '../../src/v56-engine';
import { V53_TOOL_SPECS, V53_TOOL_NAMES, v53UniversalSchema, executeV53Tool } from '../../src/v53-registry';
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


import { createMissionSchema, missionContextPackSchema, executionManifestSchema, engineeringMissionSchema, hostResultSchema, blockerArbitrationSchema, crossEngineGateSchema, deliveryManifestSchema, postDeployWatchSchema, compareMissionsSchema } from '../../src/control-plane-schema';
import { createEngineeringMission, buildMissionContextPack, compileMissionExecutionManifest, evaluateMissionGate, selectMissionNextAction, recordMissionHostResult, resumeEngineeringMission, arbitrateMissionBlockers, buildCrossEngineGate, createDeliveryManifest, verifyDeliveryClosure, buildPostDeployWatchPlan, generateOperatorBrief, auditControlPlane, compareMissions } from '../../src/control-plane-engine';
import {
  semanticRouteSchema, freshnessModelSchema, changeImpactModelSchema, workflowModelSchema,
  auditPackageSchema, releaseTrainModelSchema, projectHealthModelSchema, autonomyModelSchema,
  normalizeIntent, routeSemanticIntent, buildToolChain, detectRoutingAmbiguity, validateRouteEvidence, compareRoutes,
  auditEvidenceFreshness, invalidateEvidence, buildReverificationPlan, detectStaleClaims, computeEvidenceDependencies, compareFreshness,
  buildUnifiedChangeImpactGraph, traceChangeToTests, traceChangeToRuntime, buildReverificationSet, detectUncoveredImpact, compareChangeImpacts,
  createWorkflowTemplate, instantiateWorkflow, validateWorkflow, selectWorkflowTemplate, advanceWorkflowState, compareWorkflows,
  buildEnterpriseAuditPackage, validateAuditPackage, buildEvidenceIndex, buildApprovalLedger, buildExceptionRegister, compareAuditPackages,
  buildEnterpriseReleaseTrain, detectReleaseTrainConflicts, evaluateTrainReadiness, buildCanarySequence, buildRollbackMatrix, compareReleaseTrains,
  buildProjectHealthSnapshot, evaluateProjectHealthGate, detectHealthContradictions, buildHealthActionQueue, buildExecutiveHealthBrief, compareHealthSnapshots,
  classifyNextAuthorizedAction, buildAuthorizationQueue, validateActionPreconditions, enforceEvidenceBeforeAction, buildAutonomyRunbook, compareAutonomyStates
} from '../../src/mega-v47';
import {
  assuranceVerificationSchema, toolRegistryIntegritySchema, ciPipelineAssuranceSchema, deliveryHandoffSchema,
  buildAssuranceVerificationContract, evaluateAssuranceEvidence, detectUnsupportedReleaseClaims, buildEvidenceReplayPlan, compareAssuranceRuns,
  auditToolRegistry, evaluateVersionConsistency, buildRegistryRepairPlan, buildCapabilityDeltaReport, compareRegistrySnapshots,
  auditCiPipeline, detectCiGateGaps, enforceCiIndependence, buildCiEvidenceManifest, buildCiFailureTriagePlan, compareCiPipelines,
  buildDeliveryHandoff, validateDeliveryHandoff, buildReviewerChecklist, detectDeliveryClaimGaps, buildNoMergeGuard, compareDeliveryHandoffs
} from '../../src/mega-v48';
import {
  releaseProvenanceSchema, adaptiveVerificationSchema, toolContractCatalogSchema, ciRunEvidenceSchema, recoveryRehearsalSchema, mergePolicySchema,
  buildReleaseProvenance, auditProvenanceBindings, detectProvenanceDrift, evaluateArtifactIntegrity, buildReleaseAttestation, compareReleaseProvenance,
  classifyAdaptiveChangeRisk, deriveAdaptiveVerificationPlan, evaluateAdaptiveVerificationCoverage, detectVerificationShortcuts, prioritizeVerificationGaps, compareAdaptiveVerificationPlans,
  buildToolContractCatalog, auditToolContractCoverage, detectToolContractCompatibilityRisk, generateToolContractTestPlan, evaluateToolContractResults, compareToolContractCatalogs,
  auditCiRunBinding, buildCiEvidenceBundle, detectCiEvidenceGaps, evaluateCiRunTrust, buildCiFailureTriage, compareCiRunEvidence,
  buildRecoveryRehearsalPlan, auditRecoveryDependencies, buildFailureInjectionMatrix, evaluateRecoveryObjectives, evaluateRecoveryRehearsal, compareRecoveryRehearsals,
  compileMergePolicy, deriveRequiredApprovers, buildApprovalEvidenceMatrix, detectMergeBypassRisk, evaluateMergePolicy, compareMergePolicyDecisions
} from '../../src/mega-v49';
import {
  policyAsCodeSchema, evidenceLineageSchema, verificationPortfolioSchema, confidenceCalibrationSchema,
  incidentCommandSchema, compatibilityLifecycleSchema, agentReliabilitySchema, continuousImprovementSchema
} from '../../src/v50-schema';
import {
  compilePolicySet, evaluatePolicySet, detectPolicyConflicts, auditPolicyExceptions, buildPolicyDecisionTrace, comparePolicyEvaluations,
  buildEvidenceLineage, detectEvidenceCycles, detectOrphanEvidence, findEvidenceContradictions, evaluateLineageIntegrity, compareEvidenceLineage,
  optimizeVerificationPortfolio, evaluateVerificationBudget, detectDroppedVerificationRisk, buildVerificationCriticalPath, evaluateVerificationPortfolioResults, compareVerificationPortfolios,
  calculateReleaseConfidence, detectConfidenceInflation, calibrateConfidenceThresholds, buildConfidenceBreakdown, decideConfidenceGate, compareConfidenceModels,
  classifyIncidentSeverity, buildIncidentCommandPlan, buildIncidentTimeline, detectIncidentOwnershipGaps, evaluateIncidentObjectives, evaluateIncidentClosure, compareIncidentStates,
  detectBreakingCompatibilityChanges, assessCompatibilityConsumerImpact, buildDeprecationPlan, evaluateSunsetReadiness, buildCompatibilityMigrationWaves, compareCompatibilityLifecycles,
  detectUnsupportedAgentClaims, evaluateAgentReliability, detectAgentHandoffDrift, buildAgentTrustPolicy, routeTaskByReliability, buildAgentQualityDriftReport, compareAgentReliability,
  clusterImprovementObservations, detectSystemicImprovementPatterns, measureControlEffectiveness, prioritizeImprovementInvestments, buildContinuousImprovementBacklog, evaluateImprovementEconomics, compareImprovementPrograms
} from '../../src/v50-engine';
import {
  missionRuntimeSchema, causalDecisionSchema, scenarioLabSchema, riskCapitalSchema,
  capabilityMarketSchema, knowledgeMemorySchema, safetyCaseSchema, releaseTwinSchema,
  toolEcosystemSchema, driftForecastSchema, humanOversightSchema, outcomeLearningSchema
} from '../../src/v51-schema';
import {
  createMissionRuntime, evaluateMissionTransition, selectMissionCheckpoint, detectMissionDeadlock, buildMissionRecoveryRoute, compareMissionRuns,
  buildCausalDecisionGraph, scoreDecisionOptions, detectDecisionAssumptionDrift, evaluateDecisionReversibility, traceDecisionOutcomes, compareDecisionPaths,
  simulateDeliveryScenarios, rankCounterfactualStrategies, detectScenarioFragility, buildScenarioSensitivityMap, selectResilientStrategy, compareScenarioSets,
  calculateRiskBudget, allocateChangeRiskCapital, detectRiskConcentration, evaluateRiskPortfolio, buildRiskRebalancingPlan, compareRiskPortfolios,
  publishCapabilityOffers, matchCapabilityDemand, evaluateDelegationContracts, detectCapabilityBottlenecks, buildDelegationPlan, compareCapabilityMarkets,
  evaluateKnowledgeFreshness, detectKnowledgeContradictions, consolidateProjectKnowledge, buildKnowledgeRefreshPlan, scoreKnowledgeCoverage, compareKnowledgeSnapshots,
  buildEngineeringSafetyCase, evaluateSafetyArguments, detectAssuranceGaps, traceHazardControls, buildReleaseAssuranceCase, compareSafetyCases,
  buildReleaseDigitalTwin, simulateReleaseTransition, injectReleaseFailures, evaluateTwinFidelity, buildReleasePrediction, compareReleaseTwins,
  buildToolEcosystemGraph, findToolCompositionPaths, detectToolDependencyCycles, evaluateToolChainResilience, optimizeToolChain, compareToolEcosystems,
  forecastEngineeringDrift, detectLeadingRiskIndicators, evaluateDriftThresholds, buildDriftResponsePlan, calibrateDriftForecast, compareDriftForecasts,
  buildOversightPolicy, classifyHumanReviewNeed, auditHumanApprovalChain, detectOversightGaps, buildEscalationLadder, compareOversightModels,
  linkActionsToOutcomes, measureInterventionEffect, calibrateOutcomePredictions, detectLearningBias, buildLearningFeedbackLoop, compareLearningPrograms
} from '../../src/v51-engine';
import {
  engineeringConstitutionSchema, constraintSolverSchema, trustGraphSchema, changeSimulationSchema,
  recoveryStrategySchema, verificationEconomicsSchema, multiProjectCoordinationSchema, operatorCockpitSchema
} from '../../src/v52-schema';
import {
  compileEngineeringConstitution, evaluateConstitutionCompliance, detectConstitutionConflicts, compareEngineeringConstitutions,
  solveEngineeringConstraints, extractUnsatCore, buildConstraintRelaxationPlan, compareConstraintSolutions,
  buildEngineeringTrustGraph, evaluateTransitiveTrust, detectTrustWeakLinks, compareTrustGraphs,
  simulateChangeBlastRadius, detectChangeCascades, buildChangeSafeguardPlan, compareChangeSimulations,
  scoreRecoveryStrategies, buildRecoveryDecisionTree, evaluateRecoveryStrategyReadiness, compareRecoveryStrategies,
  optimizeVerificationSpend, detectVerificationUnderinvestment, evaluateVerificationValue, compareVerificationEconomics,
  buildProgramDependencyNetwork, detectProgramCollisions, allocateSharedProgramCapacity, compareProgramCoordination,
  buildOperatorDecisionCockpit, evaluateOperatorActionReadiness, selectNextSafeOperatorAction, compareOperatorCockpits
} from '../../src/v52-engine';
import { portfolioModelSchema, portfolioScenarioSchema, comparePortfoliosSchema, pipelineModelSchema, pipelineHistorySchema, comparePipelinesSchema, failurePreventionModelSchema, changePremortemSchema, compareFailureModelsSchema, engineeringDecisionSchema, decisionCommandModelSchema, compareDecisionModelsSchema, enterpriseCommandSnapshotSchema, compareEnterpriseSnapshotsSchema, auditPortfolio, buildPortfolioDependencyGraph, detectPortfolioBottlenecks, prioritizePortfolio, assessPortfolioScenario, buildPortfolioCommandBrief, comparePortfolios, auditPipeline, evaluatePipelineGate, detectWeakPipelineGates, analyzePipelineFailurePatterns, buildPipelineHardeningPlan, buildPipelineEvidenceManifest, comparePipelines, runEngineeringPremortem, detectSinglePointsOfFailure, auditPreventiveControls, buildFailureDetectionMatrix, evaluateResilienceReadiness, buildFailurePreventionPlan, compareFailureModels, auditEngineeringDecisions, evaluateDecision, detectDecisionConflicts, buildDecisionRiskCommandCenter, buildDecisionEvidenceMatrix, buildExecutiveEngineeringBrief, compareDecisionModels, buildEnterpriseCommandSnapshot, evaluateEnterpriseCommandGate, selectEnterpriseIntervention, compareEnterpriseCommandSnapshots } from '../../src/enterprise-v46';

export const runtime = 'nodejs';
export const maxDuration = 300;

function result(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>
  };
}

const V50_TOOL_NAMES = [
  'krom_compile_policy_set', 'krom_evaluate_policy_set', 'krom_detect_policy_conflicts', 'krom_audit_policy_exceptions', 'krom_build_policy_decision_trace', 'krom_compare_policy_evaluations',
  'krom_build_evidence_lineage', 'krom_detect_evidence_cycles', 'krom_detect_orphan_evidence', 'krom_find_evidence_contradictions', 'krom_evaluate_lineage_integrity', 'krom_compare_evidence_lineage',
  'krom_optimize_verification_portfolio', 'krom_evaluate_verification_budget', 'krom_detect_dropped_verification_risk', 'krom_build_verification_critical_path', 'krom_evaluate_verification_portfolio_results', 'krom_compare_verification_portfolios',
  'krom_calculate_release_confidence', 'krom_detect_confidence_inflation', 'krom_calibrate_confidence_thresholds', 'krom_build_confidence_breakdown', 'krom_decide_confidence_gate', 'krom_compare_confidence_models',
  'krom_classify_incident_severity', 'krom_build_incident_command_plan', 'krom_build_incident_timeline', 'krom_detect_incident_ownership_gaps', 'krom_evaluate_incident_objectives', 'krom_evaluate_incident_closure', 'krom_compare_incident_states',
  'krom_detect_breaking_compatibility_changes', 'krom_assess_compatibility_consumer_impact', 'krom_build_deprecation_plan', 'krom_evaluate_sunset_readiness', 'krom_build_compatibility_migration_waves', 'krom_compare_compatibility_lifecycles',
  'krom_detect_unsupported_agent_claims', 'krom_evaluate_agent_reliability', 'krom_detect_agent_handoff_drift', 'krom_build_agent_trust_policy', 'krom_route_task_by_reliability', 'krom_build_agent_quality_drift_report', 'krom_compare_agent_reliability',
  'krom_cluster_improvement_observations', 'krom_detect_systemic_improvement_patterns', 'krom_measure_control_effectiveness', 'krom_prioritize_improvement_investments', 'krom_build_continuous_improvement_backlog', 'krom_evaluate_improvement_economics', 'krom_compare_improvement_programs'
] as const;

const V51_TOOL_NAMES = [
  'krom_create_mission_runtime', 'krom_evaluate_mission_transition', 'krom_select_mission_checkpoint', 'krom_detect_mission_deadlock', 'krom_build_mission_recovery_route', 'krom_compare_mission_runs',
  'krom_build_causal_decision_graph', 'krom_score_decision_options', 'krom_detect_decision_assumption_drift', 'krom_evaluate_decision_reversibility', 'krom_trace_decision_outcomes', 'krom_compare_decision_paths',
  'krom_simulate_delivery_scenarios', 'krom_rank_counterfactual_strategies', 'krom_detect_scenario_fragility', 'krom_build_scenario_sensitivity_map', 'krom_select_resilient_strategy', 'krom_compare_scenario_sets',
  'krom_calculate_risk_budget', 'krom_allocate_change_risk_capital', 'krom_detect_risk_concentration', 'krom_evaluate_risk_portfolio', 'krom_build_risk_rebalancing_plan', 'krom_compare_risk_portfolios',
  'krom_publish_capability_offers', 'krom_match_capability_demand', 'krom_evaluate_delegation_contracts', 'krom_detect_capability_bottlenecks', 'krom_build_delegation_plan', 'krom_compare_capability_markets',
  'krom_evaluate_knowledge_freshness', 'krom_detect_knowledge_contradictions', 'krom_consolidate_project_knowledge', 'krom_build_knowledge_refresh_plan', 'krom_score_knowledge_coverage', 'krom_compare_project_knowledge_snapshots',
  'krom_build_engineering_safety_case', 'krom_evaluate_safety_arguments', 'krom_detect_safety_assurance_gaps', 'krom_trace_hazard_controls', 'krom_build_release_assurance_case', 'krom_compare_safety_cases',
  'krom_build_release_digital_twin', 'krom_simulate_release_transition', 'krom_inject_release_failures', 'krom_evaluate_twin_fidelity', 'krom_build_release_prediction', 'krom_compare_release_twins',
  'krom_build_tool_ecosystem_graph', 'krom_find_tool_composition_paths', 'krom_detect_tool_dependency_cycles', 'krom_evaluate_tool_chain_resilience', 'krom_optimize_tool_chain', 'krom_compare_tool_ecosystems',
  'krom_forecast_engineering_drift', 'krom_detect_leading_risk_indicators', 'krom_evaluate_drift_thresholds', 'krom_build_drift_response_plan', 'krom_calibrate_drift_forecast', 'krom_compare_drift_forecasts',
  'krom_build_oversight_policy', 'krom_classify_human_review_need', 'krom_audit_human_approval_chain', 'krom_detect_oversight_gaps', 'krom_build_escalation_ladder', 'krom_compare_oversight_models',
  'krom_link_actions_to_outcomes', 'krom_measure_intervention_effect', 'krom_calibrate_outcome_predictions', 'krom_detect_learning_bias', 'krom_build_learning_feedback_loop', 'krom_compare_learning_programs'
] as const;

const V52_TOOL_NAMES = [
  'krom_compile_engineering_constitution', 'krom_evaluate_constitution_compliance', 'krom_detect_constitution_conflicts', 'krom_compare_engineering_constitutions', 'krom_solve_engineering_constraints', 'krom_extract_constraint_unsat_core', 'krom_build_constraint_relaxation_plan', 'krom_compare_constraint_solutions', 'krom_build_engineering_trust_graph', 'krom_evaluate_transitive_trust', 'krom_detect_trust_weak_links', 'krom_compare_trust_graphs', 'krom_simulate_change_blast_radius', 'krom_detect_change_cascades', 'krom_build_change_safeguard_plan', 'krom_compare_change_simulations', 'krom_score_recovery_strategies', 'krom_build_recovery_decision_tree', 'krom_evaluate_recovery_strategy_readiness', 'krom_compare_recovery_strategies', 'krom_optimize_verification_spend', 'krom_detect_verification_underinvestment', 'krom_evaluate_verification_value', 'krom_compare_verification_economics', 'krom_build_program_dependency_network', 'krom_detect_program_collisions', 'krom_allocate_shared_program_capacity', 'krom_compare_program_coordination', 'krom_build_operator_decision_cockpit', 'krom_evaluate_operator_action_readiness', 'krom_select_next_safe_operator_action', 'krom_compare_operator_cockpits'
] as const;


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



  // v45 Unified Engineering Control Plane
  server.registerTool('krom_create_engineering_mission',{title:'Create engineering mission',description:'Create a portable project-scoped engineering mission with explicit capabilities, evidence requirements and blockers.',inputSchema:createMissionSchema},async (input)=>result(createEngineeringMission(input)));
  server.registerTool('krom_build_mission_context_pack',{title:'Build mission context pack',description:'Assemble verified project, architecture, requirement, risk, decision and evidence context for a mission without turning unknowns into facts.',inputSchema:missionContextPackSchema},async (input)=>result(buildMissionContextPack(input)));
  server.registerTool('krom_compile_mission_execution_manifest',{title:'Compile mission execution manifest',description:'Validate mission actions, dependencies, approvals, rollback requirements and evidence contracts before execution.',inputSchema:executionManifestSchema},async (input)=>result(compileMissionExecutionManifest(input)));
  server.registerTool('krom_evaluate_mission_gate',{title:'Evaluate mission gate',description:'Evaluate mandatory cross-engine gates and reject unsupported pass claims that lack evidence.',inputSchema:crossEngineGateSchema},async (input)=>result(evaluateMissionGate(input)));
  server.registerTool('krom_select_mission_next_action',{title:'Select next mission action',description:'Select the next dependency-ready mission action from portable mission state.',inputSchema:engineeringMissionSchema},async (input)=>result(selectMissionNextAction(input)));
  server.registerTool('krom_record_mission_host_result',{title:'Record mission host result',description:'Record an authorized host execution result and require evidence when the action contract says evidence is required.',inputSchema:hostResultSchema},async (input)=>result(recordMissionHostResult(input)));
  server.registerTool('krom_resume_engineering_mission',{title:'Resume engineering mission',description:'Resume a portable mission state and return completion, failure, blocker and next-action status.',inputSchema:engineeringMissionSchema},async (input)=>result(resumeEngineeringMission(input)));
  server.registerTool('krom_arbitrate_mission_blockers',{title:'Arbitrate mission blockers',description:'Rank mission blockers by severity and reversibility and identify hard-stop conditions.',inputSchema:blockerArbitrationSchema},async (input)=>result(arbitrateMissionBlockers(input)));
  server.registerTool('krom_build_cross_engine_gate',{title:'Build cross-engine gate',description:'Aggregate security, compliance, data, API, test, performance, evidence, recovery, runtime and release gates into one mission view.',inputSchema:crossEngineGateSchema},async (input)=>result(buildCrossEngineGate(input)));
  server.registerTool('krom_create_delivery_manifest',{title:'Create delivery manifest',description:'Build an evidence-aware delivery manifest covering changed artifacts, tests, release evidence, deployment and runtime evidence.',inputSchema:deliveryManifestSchema},async (input)=>result(createDeliveryManifest(input)));
  server.registerTool('krom_verify_delivery_closure',{title:'Verify delivery closure',description:'Verify that implementation, release and runtime evidence are sufficient to close delivery rather than merely finish coding.',inputSchema:deliveryManifestSchema},async (input)=>result(verifyDeliveryClosure(input)));
  server.registerTool('krom_build_post_deploy_watch_plan',{title:'Build post-deploy watch plan',description:'Create evidence-backed production observation checks, blocking checks and rollback triggers for a deployment.',inputSchema:postDeployWatchSchema},async (input)=>result(buildPostDeployWatchPlan(input)));
  server.registerTool('krom_generate_operator_brief',{title:'Generate operator brief',description:'Summarize mission objective, state, blockers, risks, next action, evidence and deployment references for the operator.',inputSchema:engineeringMissionSchema},async (input)=>result(generateOperatorBrief(input)));
  server.registerTool('krom_audit_control_plane',{title:'Audit control plane',description:'Audit mission action IDs, dependency integrity and unsupported mandatory gate passes.',inputSchema:engineeringMissionSchema},async (input)=>result(auditControlPlane(input)));
  server.registerTool('krom_compare_missions',{title:'Compare engineering missions',description:'Compare before/after mission stage, status, blockers, evidence, artifacts and deployments.',inputSchema:compareMissionsSchema},async (input)=>result(compareMissions(input)));


  // v46 Enterprise Command Intelligence
  server.registerTool('krom_audit_portfolio',{title:'Audit engineering portfolio',description:'Audit portfolio integrity, dependency references and unsupported completion claims.',inputSchema:portfolioModelSchema},async (input)=>result(auditPortfolio(input)));
  server.registerTool('krom_build_portfolio_dependency_graph',{title:'Build portfolio dependency graph',description:'Build explicit project/program dependency nodes and edges.',inputSchema:portfolioModelSchema},async (input)=>result(buildPortfolioDependencyGraph(input)));
  server.registerTool('krom_detect_portfolio_bottlenecks',{title:'Detect portfolio bottlenecks',description:'Detect shared-capability contention, dependency fan-out and blocked items.',inputSchema:portfolioModelSchema},async (input)=>result(detectPortfolioBottlenecks(input)));
  server.registerTool('krom_prioritize_portfolio_attention',{title:'Prioritize portfolio attention',description:'Order engineering attention using explicit priority, risk, dependency impact and evidence gaps.',inputSchema:portfolioModelSchema},async (input)=>result(prioritizePortfolio(input)));
  server.registerTool('krom_assess_portfolio_scenario',{title:'Assess portfolio scenario',description:'Propagate changes and unavailable capabilities through portfolio dependencies.',inputSchema:portfolioScenarioSchema},async (input)=>result(assessPortfolioScenario(input)));
  server.registerTool('krom_build_portfolio_command_brief',{title:'Build portfolio command brief',description:'Build evidence-backed portfolio health, blocker and bottleneck brief.',inputSchema:portfolioModelSchema},async (input)=>result(buildPortfolioCommandBrief(input)));
  server.registerTool('krom_compare_portfolios',{title:'Compare engineering portfolios',description:'Compare portfolio state, blockers and evidence.',inputSchema:comparePortfoliosSchema},async ({before,after})=>result(comparePortfolios(before,after)));

  server.registerTool('krom_audit_pipeline',{title:'Audit CI/CD pipeline',description:'Audit pipeline dependencies, unsupported passes and unsafe production settings.',inputSchema:pipelineModelSchema},async (input)=>result(auditPipeline(input)));
  server.registerTool('krom_evaluate_pipeline_gate',{title:'Evaluate pipeline gate',description:'Block failed, unknown or unsupported mandatory pipeline stages.',inputSchema:pipelineModelSchema},async (input)=>result(evaluatePipelineGate(input)));
  server.registerTool('krom_detect_weak_pipeline_gates',{title:'Detect weak pipeline gates',description:'Detect missing test, security and runtime-verification gates.',inputSchema:pipelineModelSchema},async (input)=>result(detectWeakPipelineGates(input)));
  server.registerTool('krom_analyze_pipeline_failure_patterns',{title:'Analyze pipeline failure patterns',description:'Analyze supplied run history for recurring failed stages.',inputSchema:pipelineHistorySchema},async (input)=>result(analyzePipelineFailurePatterns(input)));
  server.registerTool('krom_build_pipeline_hardening_plan',{title:'Build pipeline hardening plan',description:'Create evidence-first CI/CD hardening actions.',inputSchema:pipelineModelSchema},async (input)=>result(buildPipelineHardeningPlan(input)));
  server.registerTool('krom_build_pipeline_evidence_manifest',{title:'Build pipeline evidence manifest',description:'Build an auditable stage/evidence manifest tied to commit and environment.',inputSchema:pipelineModelSchema},async (input)=>result(buildPipelineEvidenceManifest(input)));
  server.registerTool('krom_compare_pipelines',{title:'Compare CI/CD pipelines',description:'Compare gates, rollback and artifact-integrity posture.',inputSchema:comparePipelinesSchema},async ({before,after})=>result(comparePipelines(before,after)));

  server.registerTool('krom_run_engineering_premortem',{title:'Run engineering pre-mortem',description:'Generate evidence-grounded failure hypotheses for a proposed change.',inputSchema:changePremortemSchema},async (input)=>result(runEngineeringPremortem(input)));
  server.registerTool('krom_detect_single_points_of_failure',{title:'Detect single points of failure',description:'Surface declared SPOFs and uncovered critical assets.',inputSchema:failurePreventionModelSchema},async (input)=>result(detectSinglePointsOfFailure(input)));
  server.registerTool('krom_audit_preventive_controls',{title:'Audit preventive controls',description:'Detect missing controls, control evidence and recovery evidence.',inputSchema:failurePreventionModelSchema},async (input)=>result(auditPreventiveControls(input)));
  server.registerTool('krom_build_failure_detection_matrix',{title:'Build failure detection matrix',description:'Map failure modes to signals, control evidence and recovery evidence.',inputSchema:failurePreventionModelSchema},async (input)=>result(buildFailureDetectionMatrix(input)));
  server.registerTool('krom_evaluate_resilience_readiness',{title:'Evaluate resilience readiness',description:'Block on open critical failures and unverified high-severity recovery gaps.',inputSchema:failurePreventionModelSchema},async (input)=>result(evaluateResilienceReadiness(input)));
  server.registerTool('krom_build_failure_prevention_plan',{title:'Build failure prevention plan',description:'Build severity-ordered prevention, detection and recovery actions.',inputSchema:failurePreventionModelSchema},async (input)=>result(buildFailurePreventionPlan(input)));
  server.registerTool('krom_compare_failure_models',{title:'Compare failure prevention models',description:'Compare failure scenarios and resilience readiness.',inputSchema:compareFailureModelsSchema},async ({before,after})=>result(compareFailureModels(before,after)));

  server.registerTool('krom_audit_engineering_decisions',{title:'Audit engineering decisions',description:'Audit selected options, approvals, evidence and constraint violations.',inputSchema:decisionCommandModelSchema},async (input)=>result(auditEngineeringDecisions(input)));
  server.registerTool('krom_evaluate_engineering_decision',{title:'Evaluate engineering decision',description:'Expose option trade-offs and evidence without silently selecting an option.',inputSchema:engineeringDecisionSchema},async (input)=>result(evaluateDecision(input)));
  server.registerTool('krom_detect_decision_conflicts',{title:'Detect decision conflicts',description:'Detect supersession conflicts and duplicate decision topics.',inputSchema:decisionCommandModelSchema},async (input)=>result(detectDecisionConflicts(input)));
  server.registerTool('krom_build_decision_risk_command_center',{title:'Build decision/risk command center',description:'Unify release, runtime, security, compliance, blockers and evidence freshness.',inputSchema:decisionCommandModelSchema},async (input)=>result(buildDecisionRiskCommandCenter(input)));
  server.registerTool('krom_build_decision_evidence_matrix',{title:'Build decision evidence matrix',description:'Map approvals and selected options to evidence.',inputSchema:decisionCommandModelSchema},async (input)=>result(buildDecisionEvidenceMatrix(input)));
  server.registerTool('krom_build_executive_engineering_brief',{title:'Build executive engineering brief',description:'Summarize engineering command state without hiding blockers.',inputSchema:decisionCommandModelSchema},async (input)=>result(buildExecutiveEngineeringBrief(input)));
  server.registerTool('krom_compare_decision_models',{title:'Compare decision command models',description:'Compare approvals, blockers and command-state changes.',inputSchema:compareDecisionModelsSchema},async ({before,after})=>result(compareDecisionModels(before,after)));

  server.registerTool('krom_build_enterprise_command_snapshot',{title:'Build enterprise command snapshot',description:'Aggregate mission, portfolio, pipeline, resilience and decision state.',inputSchema:enterpriseCommandSnapshotSchema},async (input)=>result(buildEnterpriseCommandSnapshot(input)));
  server.registerTool('krom_evaluate_enterprise_command_gate',{title:'Evaluate enterprise command gate',description:'Enforce cross-domain readiness so local success cannot hide enterprise blockers.',inputSchema:enterpriseCommandSnapshotSchema},async (input)=>result(evaluateEnterpriseCommandGate(input)));
  server.registerTool('krom_select_enterprise_intervention',{title:'Select enterprise intervention',description:'Select next evidence-based intervention from explicit critical blockers and hardening gaps.',inputSchema:enterpriseCommandSnapshotSchema},async (input)=>result(selectEnterpriseIntervention(input)));
  server.registerTool('krom_compare_enterprise_command_snapshots',{title:'Compare enterprise command snapshots',description:'Compare enterprise gate, blockers and mission evidence.',inputSchema:compareEnterpriseSnapshotsSchema},async ({before,after})=>result(compareEnterpriseCommandSnapshots(before,after)));


  // v47 Mega Control Plane — Semantic Routing
  server.registerTool('krom_normalize_engineering_intent',{title:'Normalize engineering intent',description:'Normalize a user engineering request into explicit goals, constraints, evidence needs and action class.',inputSchema:semanticRouteSchema},async (input)=>result(normalizeIntent(input)));
  server.registerTool('krom_route_semantic_intent',{title:'Route semantic engineering intent',description:'Route normalized intent to KROM capability domains without claiming execution.',inputSchema:semanticRouteSchema},async (input)=>result(routeSemanticIntent(input)));
  server.registerTool('krom_build_semantic_tool_chain',{title:'Build semantic tool chain',description:'Build an ordered, dependency-aware KROM tool chain from supplied intent and available tools.',inputSchema:semanticRouteSchema},async (input)=>result(buildToolChain(input)));
  server.registerTool('krom_detect_routing_ambiguity',{title:'Detect routing ambiguity',description:'Detect conflicting or underspecified routing signals before orchestration.',inputSchema:semanticRouteSchema},async (input)=>result(detectRoutingAmbiguity(input)));
  server.registerTool('krom_validate_route_evidence',{title:'Validate route evidence needs',description:'Validate that consequential routing decisions declare required evidence and authorization boundaries.',inputSchema:semanticRouteSchema},async (input)=>result(validateRouteEvidence(input)));
  server.registerTool('krom_compare_semantic_routes',{title:'Compare semantic routes',description:'Compare two semantic routing states and their tool-chain implications.',inputSchema:semanticRouteSchema},async (input)=>result(compareRoutes(input)));

  // v47 Evidence Freshness / Invalidation
  server.registerTool('krom_audit_evidence_freshness',{title:'Audit evidence freshness',description:'Audit evidence age, dependency changes and freshness requirements.',inputSchema:freshnessModelSchema},async (input)=>result(auditEvidenceFreshness(input)));
  server.registerTool('krom_invalidate_stale_evidence',{title:'Invalidate stale evidence',description:'Mark evidence stale when its dependency fingerprint or freshness window is no longer valid.',inputSchema:freshnessModelSchema},async (input)=>result(invalidateEvidence(input)));
  server.registerTool('krom_build_reverification_plan',{title:'Build reverification plan',description:'Build evidence-specific reverification actions after change or staleness.',inputSchema:freshnessModelSchema},async (input)=>result(buildReverificationPlan(input)));
  server.registerTool('krom_detect_stale_claims',{title:'Detect stale claims',description:'Detect claims still marked supported by stale or invalidated evidence.',inputSchema:freshnessModelSchema},async (input)=>result(detectStaleClaims(input)));
  server.registerTool('krom_compute_evidence_dependencies',{title:'Compute evidence dependencies',description:'Map evidence artifacts to the components, tests, deployments and claims they depend on.',inputSchema:freshnessModelSchema},async (input)=>result(computeEvidenceDependencies(input)));
  server.registerTool('krom_compare_evidence_freshness',{title:'Compare evidence freshness',description:'Compare freshness state before and after changes.',inputSchema:freshnessModelSchema},async (input)=>result(compareFreshness(input)));

  // v47 Change Impact / Reverification Graph
  server.registerTool('krom_build_unified_change_impact_graph',{title:'Build unified change impact graph',description:'Build a cross-domain graph from changed nodes to requirements, APIs, tests, deployments and runtime checks.',inputSchema:changeImpactModelSchema},async (input)=>result(buildUnifiedChangeImpactGraph(input)));
  server.registerTool('krom_trace_change_to_tests',{title:'Trace change to tests',description:'Trace changed nodes to directly and transitively affected tests.',inputSchema:changeImpactModelSchema},async (input)=>result(traceChangeToTests(input)));
  server.registerTool('krom_trace_change_to_runtime',{title:'Trace change to runtime checks',description:'Trace changed nodes to deployment and runtime verification obligations.',inputSchema:changeImpactModelSchema},async (input)=>result(traceChangeToRuntime(input)));
  server.registerTool('krom_build_change_reverification_set',{title:'Build change reverification set',description:'Build the minimal evidence/test/runtime reverification set justified by the impact graph.',inputSchema:changeImpactModelSchema},async (input)=>result(buildReverificationSet(input)));
  server.registerTool('krom_detect_uncovered_change_impact',{title:'Detect uncovered change impact',description:'Detect impacted nodes lacking tests, evidence or runtime verification.',inputSchema:changeImpactModelSchema},async (input)=>result(detectUncoveredImpact(input)));
  server.registerTool('krom_compare_change_impacts',{title:'Compare change impact states',description:'Compare impacted nodes and reverification obligations across two change snapshots.',inputSchema:changeImpactModelSchema},async (input)=>result(compareChangeImpacts(input)));

  // v47 Workflow Template Engine
  server.registerTool('krom_create_workflow_template',{title:'Create engineering workflow template',description:'Create a reusable evidence-first workflow template from explicit phases, gates and authorization requirements.',inputSchema:workflowModelSchema},async (input)=>result(createWorkflowTemplate(input)));
  server.registerTool('krom_instantiate_workflow',{title:'Instantiate engineering workflow',description:'Instantiate a workflow template for a concrete engineering request without executing external actions.',inputSchema:workflowModelSchema},async (input)=>result(instantiateWorkflow(input)));
  server.registerTool('krom_validate_workflow',{title:'Validate engineering workflow',description:'Validate phase ordering, gate coverage, evidence obligations and authorization requirements.',inputSchema:workflowModelSchema},async (input)=>result(validateWorkflow(input)));
  server.registerTool('krom_select_workflow_template',{title:'Select workflow template',description:'Select the best matching workflow template from explicit intent tags and constraints.',inputSchema:workflowModelSchema},async (input)=>result(selectWorkflowTemplate(input)));
  server.registerTool('krom_advance_workflow_state',{title:'Advance workflow state',description:'Advance only when declared gate conditions and evidence requirements are satisfied.',inputSchema:workflowModelSchema},async (input)=>result(advanceWorkflowState(input)));
  server.registerTool('krom_compare_workflows',{title:'Compare engineering workflows',description:'Compare workflow phases, gates, evidence obligations and current state.',inputSchema:workflowModelSchema},async (input)=>result(compareWorkflows(input)));

  // v47 Enterprise Audit Package
  server.registerTool('krom_build_enterprise_audit_package',{title:'Build enterprise audit package',description:'Build an audit-ready package of evidence, approvals, exceptions, release and runtime records.',inputSchema:auditPackageSchema},async (input)=>result(buildEnterpriseAuditPackage(input)));
  server.registerTool('krom_validate_audit_package',{title:'Validate enterprise audit package',description:'Validate traceability, missing evidence, approvals and exception expiry.',inputSchema:auditPackageSchema},async (input)=>result(validateAuditPackage(input)));
  server.registerTool('krom_build_evidence_index',{title:'Build audit evidence index',description:'Build a searchable evidence index by domain, claim and source reference.',inputSchema:auditPackageSchema},async (input)=>result(buildEvidenceIndex(input)));
  server.registerTool('krom_build_approval_ledger',{title:'Build approval ledger',description:'Build an immutable-style approval ledger from supplied approval records without inventing signatures.',inputSchema:auditPackageSchema},async (input)=>result(buildApprovalLedger(input)));
  server.registerTool('krom_build_exception_register',{title:'Build exception register',description:'Build active, expired and unresolved exception records with compensating controls.',inputSchema:auditPackageSchema},async (input)=>result(buildExceptionRegister(input)));
  server.registerTool('krom_compare_audit_packages',{title:'Compare enterprise audit packages',description:'Compare evidence, approvals, exceptions and release records across audit snapshots.',inputSchema:auditPackageSchema},async (input)=>result(compareAuditPackages(input)));

  // v47 Release Train Orchestration
  server.registerTool('krom_build_enterprise_release_train',{title:'Build enterprise release train',description:'Build dependency-aware release waves across services/projects from supplied constraints.',inputSchema:releaseTrainModelSchema},async (input)=>result(buildEnterpriseReleaseTrain(input)));
  server.registerTool('krom_detect_release_train_conflicts',{title:'Detect release train conflicts',description:'Detect dependency, timing, ownership and environment conflicts across release units.',inputSchema:releaseTrainModelSchema},async (input)=>result(detectReleaseTrainConflicts(input)));
  server.registerTool('krom_evaluate_release_train_readiness',{title:'Evaluate release train readiness',description:'Evaluate per-unit and train-level readiness without allowing one ready unit to hide another blocked unit.',inputSchema:releaseTrainModelSchema},async (input)=>result(evaluateTrainReadiness(input)));
  server.registerTool('krom_build_canary_sequence',{title:'Build canary release sequence',description:'Build a risk-ordered canary/progressive rollout sequence from supplied release units.',inputSchema:releaseTrainModelSchema},async (input)=>result(buildCanarySequence(input)));
  server.registerTool('krom_build_rollback_matrix',{title:'Build release rollback matrix',description:'Map release units to rollback paths, dependencies and rollback evidence requirements.',inputSchema:releaseTrainModelSchema},async (input)=>result(buildRollbackMatrix(input)));
  server.registerTool('krom_compare_release_trains',{title:'Compare enterprise release trains',description:'Compare wave order, blockers and rollback coverage across release-train snapshots.',inputSchema:releaseTrainModelSchema},async (input)=>result(compareReleaseTrains(input)));

  // v47 Project Health / Control Plane
  server.registerTool('krom_build_project_health_snapshot',{title:'Build project health snapshot',description:'Aggregate engineering health domains into one evidence-backed snapshot.',inputSchema:projectHealthModelSchema},async (input)=>result(buildProjectHealthSnapshot(input)));
  server.registerTool('krom_evaluate_project_health_gate',{title:'Evaluate project health gate',description:'Evaluate project health with hard-stop contradictions and insufficient-evidence states.',inputSchema:projectHealthModelSchema},async (input)=>result(evaluateProjectHealthGate(input)));
  server.registerTool('krom_detect_health_contradictions',{title:'Detect project health contradictions',description:'Detect incompatible states such as release-ready with blocked security or active incident.',inputSchema:projectHealthModelSchema},async (input)=>result(detectHealthContradictions(input)));
  server.registerTool('krom_build_health_action_queue',{title:'Build project health action queue',description:'Build severity-ordered engineering actions from explicit health blockers and evidence gaps.',inputSchema:projectHealthModelSchema},async (input)=>result(buildHealthActionQueue(input)));
  server.registerTool('krom_build_executive_health_brief',{title:'Build executive project health brief',description:'Summarize evidence-backed engineering health without hiding unknowns or blockers.',inputSchema:projectHealthModelSchema},async (input)=>result(buildExecutiveHealthBrief(input)));
  server.registerTool('krom_compare_project_health',{title:'Compare project health snapshots',description:'Compare domain states, blockers, evidence gaps and readiness.',inputSchema:projectHealthModelSchema},async (input)=>result(compareHealthSnapshots(input)));

  // v47 Authorized Autonomy Layer
  server.registerTool('krom_classify_next_authorized_action',{title:'Classify next authorized action',description:'Classify the next engineering action as auto-executable, approval-required or blocked from supplied policy and host capabilities.',inputSchema:autonomyModelSchema},async (input)=>result(classifyNextAuthorizedAction(input)));
  server.registerTool('krom_build_authorization_queue',{title:'Build authorization queue',description:'Build a queue of pending engineering actions grouped by authorization requirement and blocker severity.',inputSchema:autonomyModelSchema},async (input)=>result(buildAuthorizationQueue(input)));
  server.registerTool('krom_validate_action_preconditions',{title:'Validate action preconditions',description:'Validate evidence, capability, approval and dependency preconditions before action execution.',inputSchema:autonomyModelSchema},async (input)=>result(validateActionPreconditions(input)));
  server.registerTool('krom_enforce_evidence_before_action',{title:'Enforce evidence before action',description:'Block consequential actions when required evidence is missing, stale or contradicted.',inputSchema:autonomyModelSchema},async (input)=>result(enforceEvidenceBeforeAction(input)));
  server.registerTool('krom_build_autonomy_runbook',{title:'Build authorized autonomy runbook',description:'Build a host-executable runbook separating read-only, reversible, approval-required and blocked actions.',inputSchema:autonomyModelSchema},async (input)=>result(buildAutonomyRunbook(input)));
  server.registerTool('krom_compare_autonomy_states',{title:'Compare autonomy states',description:'Compare action authorization, capability and evidence states across snapshots.',inputSchema:autonomyModelSchema},async (input)=>result(compareAutonomyStates(input)));

  // v48 Assurance Control Plane
  server.registerTool('krom_build_assurance_verification_contract',{title:'Build assurance verification contract',description:'Build the release verification contract for required gates, evidence and missing proof.',inputSchema:assuranceVerificationSchema},async (input)=>result(buildAssuranceVerificationContract(input)));
  server.registerTool('krom_evaluate_assurance_evidence',{title:'Evaluate assurance evidence',description:'Evaluate release gates strictly from verified evidence and block unsupported passes.',inputSchema:assuranceVerificationSchema},async (input)=>result(evaluateAssuranceEvidence(input)));
  server.registerTool('krom_detect_unsupported_release_claims',{title:'Detect unsupported release claims',description:'Detect release or build claims that lack verified linked evidence.',inputSchema:assuranceVerificationSchema},async (input)=>result(detectUnsupportedReleaseClaims(input)));
  server.registerTool('krom_build_evidence_replay_plan',{title:'Build evidence replay plan',description:'Build the minimal commands and evidence actions needed to replay missing verification.',inputSchema:assuranceVerificationSchema},async (input)=>result(buildEvidenceReplayPlan(input)));
  server.registerTool('krom_compare_assurance_runs',{title:'Compare assurance runs',description:'Compare current assurance gate state against a prior snapshot.',inputSchema:assuranceVerificationSchema},async (input)=>result(compareAssuranceRuns(input)));

  // v48 Registry / Version Integrity
  server.registerTool('krom_audit_tool_registry',{title:'Audit MCP tool registry',description:'Audit registered tools against declared capabilities, duplicates and naming invariants.',inputSchema:toolRegistryIntegritySchema},async (input)=>result(auditToolRegistry(input)));
  server.registerTool('krom_evaluate_version_consistency',{title:'Evaluate version consistency',description:'Evaluate package, serverInfo, health, homepage and lockfile version consistency.',inputSchema:toolRegistryIntegritySchema},async (input)=>result(evaluateVersionConsistency(input)));
  server.registerTool('krom_build_registry_repair_plan',{title:'Build registry repair plan',description:'Produce concrete repair actions for registry, capability and version drift.',inputSchema:toolRegistryIntegritySchema},async (input)=>result(buildRegistryRepairPlan(input)));
  server.registerTool('krom_build_capability_delta_report',{title:'Build capability delta report',description:'Report parity deltas between tool registration and capability exposure.',inputSchema:toolRegistryIntegritySchema},async (input)=>result(buildCapabilityDeltaReport(input)));
  server.registerTool('krom_compare_registry_snapshots',{title:'Compare registry snapshots',description:'Compare registry and version integrity against a prior snapshot.',inputSchema:toolRegistryIntegritySchema},async (input)=>result(compareRegistrySnapshots(input)));

  // v48 GitHub CI Assurance
  server.registerTool('krom_audit_ci_pipeline',{title:'Audit CI pipeline',description:'Audit GitHub CI triggers, required checks and evidence-producing jobs.',inputSchema:ciPipelineAssuranceSchema},async (input)=>result(auditCiPipeline(input)));
  server.registerTool('krom_detect_ci_gate_gaps',{title:'Detect CI gate gaps',description:'Detect missing CI commands, triggers and evidence outputs.',inputSchema:ciPipelineAssuranceSchema},async (input)=>result(detectCiGateGaps(input)));
  server.registerTool('krom_enforce_ci_independence',{title:'Enforce CI independence',description:'Ensure build/type/registry verification does not depend on deployment provider capacity.',inputSchema:ciPipelineAssuranceSchema},async (input)=>result(enforceCiIndependence(input)));
  server.registerTool('krom_build_ci_evidence_manifest',{title:'Build CI evidence manifest',description:'Create an evidence manifest from CI jobs, commands and required checks.',inputSchema:ciPipelineAssuranceSchema},async (input)=>result(buildCiEvidenceManifest(input)));
  server.registerTool('krom_build_ci_failure_triage_plan',{title:'Build CI failure triage plan',description:'Map failed CI commands to the first diagnostic action without hiding the failed evidence.',inputSchema:ciPipelineAssuranceSchema},async (input)=>result(buildCiFailureTriagePlan(input)));
  server.registerTool('krom_compare_ci_pipelines',{title:'Compare CI pipelines',description:'Compare current CI gate coverage against a prior snapshot.',inputSchema:ciPipelineAssuranceSchema},async (input)=>result(compareCiPipelines(input)));

  // v48 Delivery Handoff Guard
  server.registerTool('krom_build_delivery_handoff',{title:'Build delivery handoff',description:'Build a branch, commit, PR and evidence handoff without implying merge or deployment.',inputSchema:deliveryHandoffSchema},async (input)=>result(buildDeliveryHandoff(input)));
  server.registerTool('krom_validate_delivery_handoff',{title:'Validate delivery handoff',description:'Validate handoff completeness, no-merge guard and unsupported passing claims.',inputSchema:deliveryHandoffSchema},async (input)=>result(validateDeliveryHandoff(input)));
  server.registerTool('krom_build_reviewer_checklist',{title:'Build reviewer checklist',description:'Build a reviewer checklist from changed paths and attached evidence.',inputSchema:deliveryHandoffSchema},async (input)=>result(buildReviewerChecklist(input)));
  server.registerTool('krom_detect_delivery_claim_gaps',{title:'Detect delivery claim gaps',description:'Detect handoff claims whose required evidence is missing or unverified.',inputSchema:deliveryHandoffSchema},async (input)=>result(detectDeliveryClaimGaps(input)));
  server.registerTool('krom_build_no_merge_guard',{title:'Build no-merge guard',description:'Build a guard that keeps batch branches unmerged until explicit approval and evidence exist.',inputSchema:deliveryHandoffSchema},async (input)=>result(buildNoMergeGuard(input)));
  server.registerTool('krom_compare_delivery_handoffs',{title:'Compare delivery handoffs',description:'Compare current handoff completeness and evidence state against a prior snapshot.',inputSchema:deliveryHandoffSchema},async (input)=>result(compareDeliveryHandoffs(input)));

  // v49 Release Provenance
  server.registerTool('krom_build_release_provenance',{title:'Build release provenance',description:'Bind a release identity to its claims, gates and supplied artifacts.',inputSchema:releaseProvenanceSchema},async (input)=>result(buildReleaseProvenance(input)));
  server.registerTool('krom_audit_provenance_bindings',{title:'Audit provenance bindings',description:'Audit claim and gate evidence references against verification and exact commit identity.',inputSchema:releaseProvenanceSchema},async (input)=>result(auditProvenanceBindings(input)));
  server.registerTool('krom_detect_provenance_drift',{title:'Detect provenance drift',description:'Detect evidence from the wrong commit and artifact digest changes across release snapshots.',inputSchema:releaseProvenanceSchema},async (input)=>result(detectProvenanceDrift(input)));
  server.registerTool('krom_evaluate_artifact_integrity',{title:'Evaluate artifact integrity',description:'Evaluate supplied artifact digest shape, verification state and integrity gaps without computing proof.',inputSchema:releaseProvenanceSchema},async (input)=>result(evaluateArtifactIntegrity(input)));
  server.registerTool('krom_build_release_attestation',{title:'Build release attestation',description:'Build an evidence-bounded release attestation and reject unsupported claims or passing gates.',inputSchema:releaseProvenanceSchema},async (input)=>result(buildReleaseAttestation(input)));
  server.registerTool('krom_compare_release_provenance',{title:'Compare release provenance',description:'Compare current release attestation and artifact drift with a previous release identity.',inputSchema:releaseProvenanceSchema},async (input)=>result(compareReleaseProvenance(input)));

  // v49 Risk-adaptive Verification
  server.registerTool('krom_classify_adaptive_change_risk',{title:'Classify adaptive change risk',description:'Compute effective verification risk from reversibility, visibility, shared contracts and sensitive categories.',inputSchema:adaptiveVerificationSchema},async (input)=>result(classifyAdaptiveChangeRisk(input)));
  server.registerTool('krom_derive_adaptive_verification_plan',{title:'Derive adaptive verification plan',description:'Compile required verification gates from the supplied change risk and impacted domains.',inputSchema:adaptiveVerificationSchema},async (input)=>result(deriveAdaptiveVerificationPlan(input)));
  server.registerTool('krom_evaluate_adaptive_verification_coverage',{title:'Evaluate adaptive verification coverage',description:'Evaluate required gates, failed checks, missing runs and unsupported passes.',inputSchema:adaptiveVerificationSchema},async (input)=>result(evaluateAdaptiveVerificationCoverage(input)));
  server.registerTool('krom_detect_verification_shortcuts',{title:'Detect verification shortcuts',description:'Detect passing checks without commands or verified evidence and missing recovery gates.',inputSchema:adaptiveVerificationSchema},async (input)=>result(detectVerificationShortcuts(input)));
  server.registerTool('krom_prioritize_verification_gaps',{title:'Prioritize verification gaps',description:'Order failed, unsupported, missing and unrun verification gates into concrete next actions.',inputSchema:adaptiveVerificationSchema},async (input)=>result(prioritizeVerificationGaps(input)));
  server.registerTool('krom_compare_adaptive_verification_plans',{title:'Compare adaptive verification plans',description:'Compare required gate sets across change revisions and include current coverage.',inputSchema:adaptiveVerificationSchema},async (input)=>result(compareAdaptiveVerificationPlans(input)));

  // v49 MCP Contract Assurance
  server.registerTool('krom_build_tool_contract_catalog',{title:'Build tool contract catalog',description:'Build a versioned catalog of MCP tool input and output contracts.',inputSchema:toolContractCatalogSchema},async (input)=>result(buildToolContractCatalog(input)));
  server.registerTool('krom_audit_tool_contract_coverage',{title:'Audit tool contract coverage',description:'Audit duplicate and incomplete tool contracts, handlers and capability exposure.',inputSchema:toolContractCatalogSchema},async (input)=>result(auditToolContractCoverage(input)));
  server.registerTool('krom_detect_tool_contract_compatibility_risk',{title:'Detect tool contract compatibility risk',description:'Detect removed tools, newly required inputs and removed output fields.',inputSchema:toolContractCatalogSchema},async (input)=>result(detectToolContractCompatibilityRisk(input)));
  server.registerTool('krom_generate_tool_contract_test_plan',{title:'Generate tool contract test plan',description:'Generate schema, handler and capability contract tests for every supplied tool.',inputSchema:toolContractCatalogSchema},async (input)=>result(generateToolContractTestPlan(input)));
  server.registerTool('krom_evaluate_tool_contract_results',{title:'Evaluate tool contract results',description:'Evaluate contract test completeness, failures and passes without verified evidence.',inputSchema:toolContractCatalogSchema},async (input)=>result(evaluateToolContractResults(input)));
  server.registerTool('krom_compare_tool_contract_catalogs',{title:'Compare tool contract catalogs',description:'Compare tool additions, removals, compatibility risk and contract coverage.',inputSchema:toolContractCatalogSchema},async (input)=>result(compareToolContractCatalogs(input)));

  // v49 CI Run Evidence
  server.registerTool('krom_audit_ci_run_binding',{title:'Audit CI run binding',description:'Verify that a supplied CI run belongs to the expected branch and exact commit.',inputSchema:ciRunEvidenceSchema},async (input)=>result(auditCiRunBinding(input)));
  server.registerTool('krom_build_ci_run_evidence_bundle',{title:'Build CI run evidence bundle',description:'Build a portable CI evidence bundle with run identity, checks and artifacts.',inputSchema:ciRunEvidenceSchema},async (input)=>result(buildCiEvidenceBundle(input)));
  server.registerTool('krom_detect_ci_evidence_gaps',{title:'Detect CI evidence gaps',description:'Detect missing checks, unsupported passes, missing run URLs and missing artifact digests.',inputSchema:ciRunEvidenceSchema},async (input)=>result(detectCiEvidenceGaps(input)));
  server.registerTool('krom_evaluate_ci_run_trust',{title:'Evaluate CI run trust',description:'Evaluate CI conclusion only after branch, commit, required check and evidence validation.',inputSchema:ciRunEvidenceSchema},async (input)=>result(evaluateCiRunTrust(input)));
  server.registerTool('krom_build_ci_run_failure_triage',{title:'Build CI run failure triage',description:'Build ordered reproduction and evidence actions for non-passing CI checks.',inputSchema:ciRunEvidenceSchema},async (input)=>result(buildCiFailureTriage(input)));
  server.registerTool('krom_compare_ci_run_evidence',{title:'Compare CI run evidence',description:'Compare CI check regressions and recoveries while retaining current trust status.',inputSchema:ciRunEvidenceSchema},async (input)=>result(compareCiRunEvidence(input)));

  // v49 Recovery Rehearsal
  server.registerTool('krom_build_recovery_rehearsal_plan',{title:'Build recovery rehearsal plan',description:'Build isolated recovery scenarios and expose missing host capabilities.',inputSchema:recoveryRehearsalSchema},async (input)=>result(buildRecoveryRehearsalPlan(input)));
  server.registerTool('krom_audit_recovery_dependencies',{title:'Audit recovery dependencies',description:'Audit whether every recovery scenario has the capabilities required to execute safely.',inputSchema:recoveryRehearsalSchema},async (input)=>result(auditRecoveryDependencies(input)));
  server.registerTool('krom_build_failure_injection_matrix',{title:'Build failure injection matrix',description:'Build safe isolated failure-injection checks with production abort guards.',inputSchema:recoveryRehearsalSchema},async (input)=>result(buildFailureInjectionMatrix(input)));
  server.registerTool('krom_evaluate_recovery_objectives',{title:'Evaluate recovery objectives',description:'Evaluate scenario results against supplied recovery time and recovery point objectives.',inputSchema:recoveryRehearsalSchema},async (input)=>result(evaluateRecoveryObjectives(input)));
  server.registerTool('krom_evaluate_recovery_rehearsal',{title:'Evaluate recovery rehearsal',description:'Evaluate recovery dependencies, objectives and verified recovery evidence.',inputSchema:recoveryRehearsalSchema},async (input)=>result(evaluateRecoveryRehearsal(input)));
  server.registerTool('krom_compare_recovery_rehearsals',{title:'Compare recovery rehearsals',description:'Compare scenario regressions and recoveries across rehearsal snapshots.',inputSchema:recoveryRehearsalSchema},async (input)=>result(compareRecoveryRehearsals(input)));

  // v49 Merge Policy Enforcement
  server.registerTool('krom_compile_merge_policy',{title:'Compile merge policy',description:'Compile required checks and risk-sensitive approval roles for one commit.',inputSchema:mergePolicySchema},async (input)=>result(compileMergePolicy(input)));
  server.registerTool('krom_derive_required_approvers',{title:'Derive required approvers',description:'Resolve required, satisfied and pending approval roles bound to the current commit.',inputSchema:mergePolicySchema},async (input)=>result(deriveRequiredApprovers(input)));
  server.registerTool('krom_build_approval_evidence_matrix',{title:'Build approval evidence matrix',description:'Map approvals to actors, commit binding and verified approval evidence.',inputSchema:mergePolicySchema},async (input)=>result(buildApprovalEvidenceMatrix(input)));
  server.registerTool('krom_detect_merge_bypass_risk',{title:'Detect merge bypass risk',description:'Detect missing or failed checks, stale approvals and prohibited self-approval.',inputSchema:mergePolicySchema},async (input)=>result(detectMergeBypassRisk(input)));
  server.registerTool('krom_evaluate_merge_policy',{title:'Evaluate merge policy',description:'Return ALLOW, BLOCK or CONDITIONAL from exact checks, approvals and verified exception evidence.',inputSchema:mergePolicySchema},async (input)=>result(evaluateMergePolicy(input)));
  server.registerTool('krom_compare_merge_policy_decisions',{title:'Compare merge policy decisions',description:'Compare the current merge decision against the previous decision and expose blockers.',inputSchema:mergePolicySchema},async (input)=>result(compareMergePolicyDecisions(input)));

  // v50 Policy-as-Code
  server.registerTool('krom_compile_policy_set',{title:'Compile policy set',description:'Compile prioritized policy rules against supplied facts and expose active conditions.',inputSchema:policyAsCodeSchema},async (input)=>result(compilePolicySet(input)));
  server.registerTool('krom_evaluate_policy_set',{title:'Evaluate policy set',description:'Evaluate allow, deny and requirement rules with verified exception handling.',inputSchema:policyAsCodeSchema},async (input)=>result(evaluatePolicySet(input)));
  server.registerTool('krom_detect_policy_conflicts',{title:'Detect policy conflicts',description:'Detect equally prioritized active rules with incompatible effects in the same scope.',inputSchema:policyAsCodeSchema},async (input)=>result(detectPolicyConflicts(input)));
  server.registerTool('krom_audit_policy_exceptions',{title:'Audit policy exceptions',description:'Audit exception approval, expiration, evidence and referenced policy identity.',inputSchema:policyAsCodeSchema},async (input)=>result(auditPolicyExceptions(input)));
  server.registerTool('krom_build_policy_decision_trace',{title:'Build policy decision trace',description:'Build an ordered explainable trace from facts and rule matches to the policy decision.',inputSchema:policyAsCodeSchema},async (input)=>result(buildPolicyDecisionTrace(input)));
  server.registerTool('krom_compare_policy_evaluations',{title:'Compare policy evaluations',description:'Compare current policy outcomes with supplied prior decisions.',inputSchema:policyAsCodeSchema},async (input)=>result(comparePolicyEvaluations(input)));

  // v50 Evidence Lineage
  server.registerTool('krom_build_evidence_lineage',{title:'Build evidence lineage',description:'Build a claim and evidence lineage graph with validated edges, roots and leaves.',inputSchema:evidenceLineageSchema},async (input)=>result(buildEvidenceLineage(input)));
  server.registerTool('krom_detect_evidence_cycles',{title:'Detect evidence cycles',description:'Detect circular derivation and support paths that invalidate evidence lineage.',inputSchema:evidenceLineageSchema},async (input)=>result(detectEvidenceCycles(input)));
  server.registerTool('krom_detect_orphan_evidence',{title:'Detect orphan evidence',description:'Detect unconnected evidence and claims without supporting evidence edges.',inputSchema:evidenceLineageSchema},async (input)=>result(detectOrphanEvidence(input)));
  server.registerTool('krom_find_evidence_contradictions',{title:'Find evidence contradictions',description:'Find explicit contradictions and escalate contradictions between verified nodes.',inputSchema:evidenceLineageSchema},async (input)=>result(findEvidenceContradictions(input)));
  server.registerTool('krom_evaluate_lineage_integrity',{title:'Evaluate lineage integrity',description:'Evaluate dangling edges, expiration, missing claims, cycles and verified contradictions.',inputSchema:evidenceLineageSchema},async (input)=>result(evaluateLineageIntegrity(input)));
  server.registerTool('krom_compare_evidence_lineage',{title:'Compare evidence lineage',description:'Compare node hashes, removals and current evidence graph integrity.',inputSchema:evidenceLineageSchema},async (input)=>result(compareEvidenceLineage(input)));

  // v50 Verification Portfolio Optimization
  server.registerTool('krom_optimize_verification_portfolio',{title:'Optimize verification portfolio',description:'Select the highest-value available gates within a supplied verification time budget.',inputSchema:verificationPortfolioSchema},async (input)=>result(optimizeVerificationPortfolio(input)));
  server.registerTool('krom_evaluate_verification_budget',{title:'Evaluate verification budget',description:'Evaluate whether required gates fit the budget and whether required capabilities exist.',inputSchema:verificationPortfolioSchema},async (input)=>result(evaluateVerificationBudget(input)));
  server.registerTool('krom_detect_dropped_verification_risk',{title:'Detect dropped verification risk',description:'Detect changed or critical categories left uncovered by the selected gate portfolio.',inputSchema:verificationPortfolioSchema},async (input)=>result(detectDroppedVerificationRisk(input)));
  server.registerTool('krom_build_verification_critical_path',{title:'Build verification critical path',description:'Topologically order selected verification gates and detect dependency cycles.',inputSchema:verificationPortfolioSchema},async (input)=>result(buildVerificationCriticalPath(input)));
  server.registerTool('krom_evaluate_verification_portfolio_results',{title:'Evaluate verification portfolio results',description:'Evaluate failures, incomplete gates, unsupported passes and risk coverage.',inputSchema:verificationPortfolioSchema},async (input)=>result(evaluateVerificationPortfolioResults(input)));
  server.registerTool('krom_compare_verification_portfolios',{title:'Compare verification portfolios',description:'Compare selected gates, budget health and dropped risk across portfolio revisions.',inputSchema:verificationPortfolioSchema},async (input)=>result(compareVerificationPortfolios(input)));

  // v50 Confidence Calibration
  server.registerTool('krom_calculate_release_confidence',{title:'Calculate release confidence',description:'Calculate evidence-discounted weighted release confidence from supplied signals.',inputSchema:confidenceCalibrationSchema},async (input)=>result(calculateReleaseConfidence(input)));
  server.registerTool('krom_detect_confidence_inflation',{title:'Detect confidence inflation',description:'Detect unsupported passing signals, missing mandatory signals and optimistic unknowns.',inputSchema:confidenceCalibrationSchema},async (input)=>result(detectConfidenceInflation(input)));
  server.registerTool('krom_calibrate_confidence_thresholds',{title:'Calibrate confidence thresholds',description:'Recommend non-lowering confidence thresholds from supplied historical outcomes.',inputSchema:confidenceCalibrationSchema},async (input)=>result(calibrateConfidenceThresholds(input)));
  server.registerTool('krom_build_confidence_breakdown',{title:'Build confidence breakdown',description:'Break release confidence into evidence-weighted signal categories.',inputSchema:confidenceCalibrationSchema},async (input)=>result(buildConfidenceBreakdown(input)));
  server.registerTool('krom_decide_confidence_gate',{title:'Decide confidence gate',description:'Return ALLOW, CONDITIONAL or BLOCK while enforcing mandatory failures and anti-inflation rules.',inputSchema:confidenceCalibrationSchema},async (input)=>result(decideConfidenceGate(input)));
  server.registerTool('krom_compare_confidence_models',{title:'Compare confidence models',description:'Compare confidence score movement and current gate decision.',inputSchema:confidenceCalibrationSchema},async (input)=>result(compareConfidenceModels(input)));

  // v50 Incident Command
  server.registerTool('krom_classify_incident_severity',{title:'Classify incident severity',description:'Classify incident severity from verified signals while retaining unverified observations.',inputSchema:incidentCommandSchema},async (input)=>result(classifyIncidentSeverity(input)));
  server.registerTool('krom_build_incident_command_plan',{title:'Build incident command plan',description:'Build stabilize, diagnose, recover and learn phases for incident command.',inputSchema:incidentCommandSchema},async (input)=>result(buildIncidentCommandPlan(input)));
  server.registerTool('krom_build_incident_timeline',{title:'Build incident timeline',description:'Build an ordered incident timeline and identify events without verified evidence.',inputSchema:incidentCommandSchema},async (input)=>result(buildIncidentTimeline(input)));
  server.registerTool('krom_detect_incident_ownership_gaps',{title:'Detect incident ownership gaps',description:'Detect missing and unacknowledged required incident response roles.',inputSchema:incidentCommandSchema},async (input)=>result(detectIncidentOwnershipGaps(input)));
  server.registerTool('krom_evaluate_incident_objectives',{title:'Evaluate incident objectives',description:'Evaluate response objectives against timing targets and verified evidence.',inputSchema:incidentCommandSchema},async (input)=>result(evaluateIncidentObjectives(input)));
  server.registerTool('krom_evaluate_incident_closure',{title:'Evaluate incident closure',description:'Evaluate ownership, objectives and timeline evidence before incident closure.',inputSchema:incidentCommandSchema},async (input)=>result(evaluateIncidentClosure(input)));
  server.registerTool('krom_compare_incident_states',{title:'Compare incident states',description:'Compare incident severity and closure state with the previous snapshot.',inputSchema:incidentCommandSchema},async (input)=>result(compareIncidentStates(input)));

  // v50 Compatibility Lifecycle
  server.registerTool('krom_detect_breaking_compatibility_changes',{title:'Detect breaking compatibility changes',description:'Detect removed interfaces, added required inputs, removed outputs and unversioned contract drift.',inputSchema:compatibilityLifecycleSchema},async (input)=>result(detectBreakingCompatibilityChanges(input)));
  server.registerTool('krom_assess_compatibility_consumer_impact',{title:'Assess compatibility consumer impact',description:'Map breaking interface changes to affected consumers.',inputSchema:compatibilityLifecycleSchema},async (input)=>result(assessCompatibilityConsumerImpact(input)));
  server.registerTool('krom_build_deprecation_plan',{title:'Build deprecation plan',description:'Build replacement, announcement, migration and sunset plans for deprecated interfaces.',inputSchema:compatibilityLifecycleSchema},async (input)=>result(buildDeprecationPlan(input)));
  server.registerTool('krom_evaluate_sunset_readiness',{title:'Evaluate sunset readiness',description:'Require announcement, replacement, migrated consumers, elapsed sunset date and verified evidence.',inputSchema:compatibilityLifecycleSchema},async (input)=>result(evaluateSunsetReadiness(input)));
  server.registerTool('krom_build_compatibility_migration_waves',{title:'Build compatibility migration waves',description:'Group remaining consumers into bounded migration waves with verification gates.',inputSchema:compatibilityLifecycleSchema},async (input)=>result(buildCompatibilityMigrationWaves(input)));
  server.registerTool('krom_compare_compatibility_lifecycles',{title:'Compare compatibility lifecycles',description:'Compare interface additions, removals, breaking changes and consumer impact.',inputSchema:compatibilityLifecycleSchema},async (input)=>result(compareCompatibilityLifecycles(input)));

  // v50 Agent Reliability
  server.registerTool('krom_detect_unsupported_agent_claims',{title:'Detect unsupported agent claims',description:'Detect agent claims that lack linked verified evidence.',inputSchema:agentReliabilitySchema},async (input)=>result(detectUnsupportedAgentClaims(input)));
  server.registerTool('krom_evaluate_agent_reliability',{title:'Evaluate agent reliability',description:'Score agents from passed runs, scope discipline and evidence-supported claims.',inputSchema:agentReliabilitySchema},async (input)=>result(evaluateAgentReliability(input)));
  server.registerTool('krom_detect_agent_handoff_drift',{title:'Detect agent handoff drift',description:'Detect missing fields in the required agent handoff contract.',inputSchema:agentReliabilitySchema},async (input)=>result(detectAgentHandoffDrift(input)));
  server.registerTool('krom_build_agent_trust_policy',{title:'Build agent trust policy',description:'Map evidenced agent reliability to read-only, supervised or approval-required modes.',inputSchema:agentReliabilitySchema},async (input)=>result(buildAgentTrustPolicy(input)));
  server.registerTool('krom_route_task_by_reliability',{title:'Route task by reliability',description:'Route a task to the highest-evidenced matching specialist.',inputSchema:agentReliabilitySchema},async (input)=>result(routeTaskByReliability(input)));
  server.registerTool('krom_build_agent_quality_drift_report',{title:'Build agent quality drift report',description:'Compare current agent reliability with supplied previous scores.',inputSchema:agentReliabilitySchema},async (input)=>result(buildAgentQualityDriftReport(input)));
  server.registerTool('krom_compare_agent_reliability',{title:'Compare agent reliability',description:'Combine reliability, drift, routing and handoff evidence into one comparison.',inputSchema:agentReliabilitySchema},async (input)=>result(compareAgentReliability(input)));

  // v50 Continuous Improvement
  server.registerTool('krom_cluster_improvement_observations',{title:'Cluster improvement observations',description:'Cluster recurring engineering observations by signature and severity.',inputSchema:continuousImprovementSchema},async (input)=>result(clusterImprovementObservations(input)));
  server.registerTool('krom_detect_systemic_improvement_patterns',{title:'Detect systemic improvement patterns',description:'Detect recurring or repeated patterns that indicate systemic engineering debt.',inputSchema:continuousImprovementSchema},async (input)=>result(detectSystemicImprovementPatterns(input)));
  server.registerTool('krom_measure_control_effectiveness',{title:'Measure control effectiveness',description:'Measure supplied control detection and prevention rates with operating cost.',inputSchema:continuousImprovementSchema},async (input)=>result(measureControlEffectiveness(input)));
  server.registerTool('krom_prioritize_improvement_investments',{title:'Prioritize improvement investments',description:'Select the highest-value improvement investments within supplied capacity.',inputSchema:continuousImprovementSchema},async (input)=>result(prioritizeImprovementInvestments(input)));
  server.registerTool('krom_build_continuous_improvement_backlog',{title:'Build continuous improvement backlog',description:'Build an ordered evidence-linked backlog from selected and deferred improvements.',inputSchema:continuousImprovementSchema},async (input)=>result(buildContinuousImprovementBacklog(input)));
  server.registerTool('krom_evaluate_improvement_economics',{title:'Evaluate improvement economics',description:'Compare supplied avoided effort with control operating and investment cost.',inputSchema:continuousImprovementSchema},async (input)=>result(evaluateImprovementEconomics(input)));
  server.registerTool('krom_compare_improvement_programs',{title:'Compare improvement programs',description:'Compare priority changes, systemic patterns and improvement economics.',inputSchema:continuousImprovementSchema},async (input)=>result(compareImprovementPrograms(input)));

  // v51 Mission Runtime and Checkpointing
  server.registerTool('krom_create_mission_runtime',{title:'Create mission runtime',description:'Compile mission stages into an executable evidence, capability and approval-aware runtime.',inputSchema:missionRuntimeSchema},async (input)=>result(createMissionRuntime(input)));
  server.registerTool('krom_evaluate_mission_transition',{title:'Evaluate mission transition',description:'Evaluate whether mission state can advance without unsupported pass claims.',inputSchema:missionRuntimeSchema},async (input)=>result(evaluateMissionTransition(input)));
  server.registerTool('krom_select_mission_checkpoint',{title:'Select mission checkpoint',description:'Select the latest passed reversible checkpoint for safe recovery planning.',inputSchema:missionRuntimeSchema},async (input)=>result(selectMissionCheckpoint(input)));
  server.registerTool('krom_detect_mission_deadlock',{title:'Detect mission deadlock',description:'Detect dependency cycles and missions with unfinished but non-executable stages.',inputSchema:missionRuntimeSchema},async (input)=>result(detectMissionDeadlock(input)));
  server.registerTool('krom_build_mission_recovery_route',{title:'Build mission recovery route',description:'Build an evidence-bounded recovery route from failed stages to a verified checkpoint.',inputSchema:missionRuntimeSchema},async (input)=>result(buildMissionRecoveryRoute(input)));
  server.registerTool('krom_compare_mission_runs',{title:'Compare mission runs',description:'Compare stage transitions and current executable state with a prior mission run.',inputSchema:missionRuntimeSchema},async (input)=>result(compareMissionRuns(input)));

  // v51 Causal Decision Intelligence
  server.registerTool('krom_build_causal_decision_graph',{title:'Build causal decision graph',description:'Build option, assumption and causal-relation graphs and detect invalid edges or cycles.',inputSchema:causalDecisionSchema},async (input)=>result(buildCausalDecisionGraph(input)));
  server.registerTool('krom_score_decision_options',{title:'Score decision options',description:'Score options from evidenced utility, risk and assumption validity.',inputSchema:causalDecisionSchema},async (input)=>result(scoreDecisionOptions(input)));
  server.registerTool('krom_detect_decision_assumption_drift',{title:'Detect decision assumption drift',description:'Detect invalid or evidence-free assumptions that undermine an engineering decision.',inputSchema:causalDecisionSchema},async (input)=>result(detectDecisionAssumptionDrift(input)));
  server.registerTool('krom_evaluate_decision_reversibility',{title:'Evaluate decision reversibility',description:'Evaluate selected-option reversibility, evidence and rollback needs.',inputSchema:causalDecisionSchema},async (input)=>result(evaluateDecisionReversibility(input)));
  server.registerTool('krom_trace_decision_outcomes',{title:'Trace decision outcomes',description:'Trace observed outcomes to decisions and reject unsupported measurements.',inputSchema:causalDecisionSchema},async (input)=>result(traceDecisionOutcomes(input)));
  server.registerTool('krom_compare_decision_paths',{title:'Compare decision paths',description:'Compare previous and current decision paths with scoring and assumption drift.',inputSchema:causalDecisionSchema},async (input)=>result(compareDecisionPaths(input)));

  // v51 Counterfactual Scenario Laboratory
  server.registerTool('krom_simulate_delivery_scenarios',{title:'Simulate delivery scenarios',description:'Simulate evidence-weighted strategy outcomes across supplied delivery scenarios.',inputSchema:scenarioLabSchema},async (input)=>result(simulateDeliveryScenarios(input)));
  server.registerTool('krom_rank_counterfactual_strategies',{title:'Rank counterfactual strategies',description:'Rank strategies by evidence-weighted expected value across counterfactuals.',inputSchema:scenarioLabSchema},async (input)=>result(rankCounterfactualStrategies(input)));
  server.registerTool('krom_detect_scenario_fragility',{title:'Detect scenario fragility',description:'Detect negative worst cases and missing capabilities that make strategies fragile.',inputSchema:scenarioLabSchema},async (input)=>result(detectScenarioFragility(input)));
  server.registerTool('krom_build_scenario_sensitivity_map',{title:'Build scenario sensitivity map',description:'Map the strongest scenario drivers for each delivery strategy.',inputSchema:scenarioLabSchema},async (input)=>result(buildScenarioSensitivityMap(input)));
  server.registerTool('krom_select_resilient_strategy',{title:'Select resilient strategy',description:'Select the strongest worst-case strategy that has required capabilities.',inputSchema:scenarioLabSchema},async (input)=>result(selectResilientStrategy(input)));
  server.registerTool('krom_compare_scenario_sets',{title:'Compare scenario sets',description:'Compare strategy ranking movement and resilient selections with a prior set.',inputSchema:scenarioLabSchema},async (input)=>result(compareScenarioSets(input)));

  // v51 Risk Capital and Portfolio Budgeting
  server.registerTool('krom_calculate_risk_budget',{title:'Calculate risk budget',description:'Calculate evidenced portfolio risk and remaining risk capital.',inputSchema:riskCapitalSchema},async (input)=>result(calculateRiskBudget(input)));
  server.registerTool('krom_allocate_change_risk_capital',{title:'Allocate change risk capital',description:'Allocate risk capital to mandatory and highest-value evidenced changes.',inputSchema:riskCapitalSchema},async (input)=>result(allocateChangeRiskCapital(input)));
  server.registerTool('krom_detect_risk_concentration',{title:'Detect risk concentration',description:'Detect domains carrying a concentrated share of portfolio risk.',inputSchema:riskCapitalSchema},async (input)=>result(detectRiskConcentration(input)));
  server.registerTool('krom_evaluate_risk_portfolio',{title:'Evaluate risk portfolio',description:'Evaluate allocation, concentration and dependency integrity in one portfolio gate.',inputSchema:riskCapitalSchema},async (input)=>result(evaluateRiskPortfolio(input)));
  server.registerTool('krom_build_risk_rebalancing_plan',{title:'Build risk rebalancing plan',description:'Build staging, deferral and diversification actions for an overexposed portfolio.',inputSchema:riskCapitalSchema},async (input)=>result(buildRiskRebalancingPlan(input)));
  server.registerTool('krom_compare_risk_portfolios',{title:'Compare risk portfolios',description:'Compare selected change allocations and portfolio risk with a prior state.',inputSchema:riskCapitalSchema},async (input)=>result(compareRiskPortfolios(input)));

  // v51 Capability Market and Delegation Contracts
  server.registerTool('krom_publish_capability_offers',{title:'Publish capability offers',description:'Normalize provider offers and discount reliability without verified evidence.',inputSchema:capabilityMarketSchema},async (input)=>result(publishCapabilityOffers(input)));
  server.registerTool('krom_match_capability_demand',{title:'Match capability demand',description:'Match capability demand to trusted offers within reliability and cost constraints.',inputSchema:capabilityMarketSchema},async (input)=>result(matchCapabilityDemand(input)));
  server.registerTool('krom_evaluate_delegation_contracts',{title:'Evaluate delegation contracts',description:'Validate matched delegation contracts and evidence-backed approval.',inputSchema:capabilityMarketSchema},async (input)=>result(evaluateDelegationContracts(input)));
  server.registerTool('krom_detect_capability_bottlenecks',{title:'Detect capability bottlenecks',description:'Detect unmatched demand and overloaded capability providers.',inputSchema:capabilityMarketSchema},async (input)=>result(detectCapabilityBottlenecks(input)));
  server.registerTool('krom_build_delegation_plan',{title:'Build delegation plan',description:'Build capacity-aware delegation assignments without implying host execution.',inputSchema:capabilityMarketSchema},async (input)=>result(buildDelegationPlan(input)));
  server.registerTool('krom_compare_capability_markets',{title:'Compare capability markets',description:'Compare provider matches and bottlenecks with a prior capability market.',inputSchema:capabilityMarketSchema},async (input)=>result(compareCapabilityMarkets(input)));

  // v51 Knowledge Freshness and Consolidation
  server.registerTool('krom_evaluate_knowledge_freshness',{title:'Evaluate knowledge freshness',description:'Evaluate whether knowledge is current, verified and backed by live evidence.',inputSchema:knowledgeMemorySchema},async (input)=>result(evaluateKnowledgeFreshness(input)));
  server.registerTool('krom_detect_knowledge_contradictions',{title:'Detect knowledge contradictions',description:'Detect active verified knowledge items that explicitly contradict each other.',inputSchema:knowledgeMemorySchema},async (input)=>result(detectKnowledgeContradictions(input)));
  server.registerTool('krom_consolidate_project_knowledge',{title:'Consolidate project knowledge',description:'Consolidate current knowledge while retiring stale or replaced items.',inputSchema:knowledgeMemorySchema},async (input)=>result(consolidateProjectKnowledge(input)));
  server.registerTool('krom_build_knowledge_refresh_plan',{title:'Build knowledge refresh plan',description:'Plan verification or refresh work for stale items and uncovered topics.',inputSchema:knowledgeMemorySchema},async (input)=>result(buildKnowledgeRefreshPlan(input)));
  server.registerTool('krom_score_knowledge_coverage',{title:'Score knowledge coverage',description:'Score required-topic coverage using active verified knowledge only.',inputSchema:knowledgeMemorySchema},async (input)=>result(scoreKnowledgeCoverage(input)));
  server.registerTool('krom_compare_project_knowledge_snapshots',{title:'Compare project knowledge snapshots',description:'Compare active knowledge changes, coverage and contradictions with a prior snapshot.',inputSchema:knowledgeMemorySchema},async (input)=>result(compareKnowledgeSnapshots(input)));

  // v51 Safety Case and Assurance Arguments
  server.registerTool('krom_build_engineering_safety_case',{title:'Build engineering safety case',description:'Build structured claims, arguments, hazards and control relationships.',inputSchema:safetyCaseSchema},async (input)=>result(buildEngineeringSafetyCase(input)));
  server.registerTool('krom_evaluate_safety_arguments',{title:'Evaluate safety arguments',description:'Evaluate assurance arguments against verified evidence and supported premises.',inputSchema:safetyCaseSchema},async (input)=>result(evaluateSafetyArguments(input)));
  server.registerTool('krom_detect_safety_assurance_gaps',{title:'Detect safety assurance gaps',description:'Detect unsupported claims, arguments and uncontrolled hazards.',inputSchema:safetyCaseSchema},async (input)=>result(detectAssuranceGaps(input)));
  server.registerTool('krom_trace_hazard_controls',{title:'Trace hazard controls',description:'Trace hazards to controls and verify supplied control-effectiveness evidence.',inputSchema:safetyCaseSchema},async (input)=>result(traceHazardControls(input)));
  server.registerTool('krom_build_release_assurance_case',{title:'Build release assurance case',description:'Combine assurance gaps and residual hazard risk into a release decision.',inputSchema:safetyCaseSchema},async (input)=>result(buildReleaseAssuranceCase(input)));
  server.registerTool('krom_compare_safety_cases',{title:'Compare safety cases',description:'Compare resolved and newly unsupported claims across safety cases.',inputSchema:safetyCaseSchema},async (input)=>result(compareSafetyCases(input)));

  // v51 Release Digital Twin
  server.registerTool('krom_build_release_digital_twin',{title:'Build release digital twin',description:'Build a component and dependency twin with evidence-bound state.',inputSchema:releaseTwinSchema},async (input)=>result(buildReleaseDigitalTwin(input)));
  server.registerTool('krom_simulate_release_transition',{title:'Simulate release transition',description:'Simulate component transitions and discount readiness without required evidence.',inputSchema:releaseTwinSchema},async (input)=>result(simulateReleaseTransition(input)));
  server.registerTool('krom_inject_release_failures',{title:'Inject release failures',description:'Inject isolated failure models and propagate effects through dependencies.',inputSchema:releaseTwinSchema},async (input)=>result(injectReleaseFailures(input)));
  server.registerTool('krom_evaluate_twin_fidelity',{title:'Evaluate twin fidelity',description:'Evaluate digital-twin prediction error from verified observations.',inputSchema:releaseTwinSchema},async (input)=>result(evaluateTwinFidelity(input)));
  server.registerTool('krom_build_release_prediction',{title:'Build release prediction',description:'Build an evidence-bounded release prediction from transitions and failure injections.',inputSchema:releaseTwinSchema},async (input)=>result(buildReleasePrediction(input)));
  server.registerTool('krom_compare_release_twins',{title:'Compare release twins',description:'Compare current predicted risk with a prior release-twin state.',inputSchema:releaseTwinSchema},async (input)=>result(compareReleaseTwins(input)));

  // v51 Tool Ecosystem and Composition Planning
  server.registerTool('krom_build_tool_ecosystem_graph',{title:'Build tool ecosystem graph',description:'Build tool dependencies and detect references to missing providers.',inputSchema:toolEcosystemSchema},async (input)=>result(buildToolEcosystemGraph(input)));
  server.registerTool('krom_find_tool_composition_paths',{title:'Find tool composition paths',description:'Find trusted tool candidates for required capabilities.',inputSchema:toolEcosystemSchema},async (input)=>result(findToolCompositionPaths(input)));
  server.registerTool('krom_detect_tool_dependency_cycles',{title:'Detect tool dependency cycles',description:'Detect cycles that can deadlock a composed tool chain.',inputSchema:toolEcosystemSchema},async (input)=>result(detectToolDependencyCycles(input)));
  server.registerTool('krom_evaluate_tool_chain_resilience',{title:'Evaluate tool chain resilience',description:'Evaluate missing requirements, single-provider risks and dependency cycles.',inputSchema:toolEcosystemSchema},async (input)=>result(evaluateToolChainResilience(input)));
  server.registerTool('krom_optimize_tool_chain',{title:'Optimize tool chain',description:'Select a reliable low-cost tool set and include transitive dependencies.',inputSchema:toolEcosystemSchema},async (input)=>result(optimizeToolChain(input)));
  server.registerTool('krom_compare_tool_ecosystems',{title:'Compare tool ecosystems',description:'Compare provider changes, resilience and optimized composition.',inputSchema:toolEcosystemSchema},async (input)=>result(compareToolEcosystems(input)));

  // v51 Drift Forecasting and Early Warning
  server.registerTool('krom_forecast_engineering_drift',{title:'Forecast engineering drift',description:'Forecast metric drift only from verified supplied time-series points.',inputSchema:driftForecastSchema},async (input)=>result(forecastEngineeringDrift(input)));
  server.registerTool('krom_detect_leading_risk_indicators',{title:'Detect leading risk indicators',description:'Detect verified metric trends moving toward risk thresholds.',inputSchema:driftForecastSchema},async (input)=>result(detectLeadingRiskIndicators(input)));
  server.registerTool('krom_evaluate_drift_thresholds',{title:'Evaluate drift thresholds',description:'Evaluate projected metric breaches and expose insufficient evidence.',inputSchema:driftForecastSchema},async (input)=>result(evaluateDriftThresholds(input)));
  server.registerTool('krom_build_drift_response_plan',{title:'Build drift response plan',description:'Prioritize investigation and reverification for projected breaches.',inputSchema:driftForecastSchema},async (input)=>result(buildDriftResponsePlan(input)));
  server.registerTool('krom_calibrate_drift_forecast',{title:'Calibrate drift forecast',description:'Measure forecast error against verified host-supplied actuals.',inputSchema:driftForecastSchema},async (input)=>result(calibrateDriftForecast(input)));
  server.registerTool('krom_compare_drift_forecasts',{title:'Compare drift forecasts',description:'Compare forecast movement, thresholds and calibration with a prior model.',inputSchema:driftForecastSchema},async (input)=>result(compareDriftForecasts(input)));

  // v51 Human Oversight and Escalation
  server.registerTool('krom_build_oversight_policy',{title:'Build oversight policy',description:'Normalize impact, uncertainty and irreversibility thresholds for human review.',inputSchema:humanOversightSchema},async (input)=>result(buildOversightPolicy(input)));
  server.registerTool('krom_classify_human_review_need',{title:'Classify human review need',description:'Classify actions that require review from impact, uncertainty or irreversibility.',inputSchema:humanOversightSchema},async (input)=>result(classifyHumanReviewNeed(input)));
  server.registerTool('krom_audit_human_approval_chain',{title:'Audit human approval chain',description:'Audit role coverage and evidence for actions requiring human approval.',inputSchema:humanOversightSchema},async (input)=>result(auditHumanApprovalChain(input)));
  server.registerTool('krom_detect_oversight_gaps',{title:'Detect oversight gaps',description:'Detect missing reviewer roles and uncovered escalation levels.',inputSchema:humanOversightSchema},async (input)=>result(detectOversightGaps(input)));
  server.registerTool('krom_build_escalation_ladder',{title:'Build escalation ladder',description:'Map actions to the minimum human authority level covering their impact.',inputSchema:humanOversightSchema},async (input)=>result(buildEscalationLadder(input)));
  server.registerTool('krom_compare_oversight_models',{title:'Compare oversight models',description:'Compare review-set changes, approval evidence and escalation coverage.',inputSchema:humanOversightSchema},async (input)=>result(compareOversightModels(input)));

  // v51 Outcome Learning and Calibration
  server.registerTool('krom_link_actions_to_outcomes',{title:'Link actions to outcomes',description:'Link interventions to verified outcomes without inventing causal success.',inputSchema:outcomeLearningSchema},async (input)=>result(linkActionsToOutcomes(input)));
  server.registerTool('krom_measure_intervention_effect',{title:'Measure intervention effect',description:'Measure supported outcome deltas and enforce minimum samples.',inputSchema:outcomeLearningSchema},async (input)=>result(measureInterventionEffect(input)));
  server.registerTool('krom_calibrate_outcome_predictions',{title:'Calibrate outcome predictions',description:'Compare predicted impact with evidenced observed effects.',inputSchema:outcomeLearningSchema},async (input)=>result(calibrateOutcomePredictions(input)));
  server.registerTool('krom_detect_learning_bias',{title:'Detect learning bias',description:'Detect unsupported or underrepresented outcome cohorts.',inputSchema:outcomeLearningSchema},async (input)=>result(detectLearningBias(input)));
  server.registerTool('krom_build_learning_feedback_loop',{title:'Build learning feedback loop',description:'Turn sample sufficiency, calibration error and cohort bias into learning actions.',inputSchema:outcomeLearningSchema},async (input)=>result(buildLearningFeedbackLoop(input)));
  server.registerTool('krom_compare_learning_programs',{title:'Compare learning programs',description:'Compare intervention effects, calibration and feedback with prior observations.',inputSchema:outcomeLearningSchema},async (input)=>result(compareLearningPrograms(input)));

  

  // v52 Strategic Engineering Intelligence
  server.registerTool('krom_compile_engineering_constitution',{title:'Compile engineering constitution',description:'Compile ordered engineering principles and mandatory constraints.',inputSchema:engineeringConstitutionSchema},async(input)=>result(compileEngineeringConstitution(input)));
  server.registerTool('krom_evaluate_constitution_compliance',{title:'Evaluate constitution compliance',description:'Block actions that violate mandatory evidenced engineering principles.',inputSchema:engineeringConstitutionSchema},async(input)=>result(evaluateConstitutionCompliance(input)));
  server.registerTool('krom_detect_constitution_conflicts',{title:'Detect constitution conflicts',description:'Detect competing actions and explicit principle violations.',inputSchema:engineeringConstitutionSchema},async(input)=>result(detectConstitutionConflicts(input)));
  server.registerTool('krom_compare_engineering_constitutions',{title:'Compare engineering constitutions',description:'Compare principle additions, removals and compliance state.',inputSchema:engineeringConstitutionSchema},async(input)=>result(compareEngineeringConstitutions(input)));
  server.registerTool('krom_solve_engineering_constraints',{title:'Solve engineering constraints',description:'Find a deterministic assignment that satisfies supplied mandatory constraints.',inputSchema:constraintSolverSchema},async(input)=>result(solveEngineeringConstraints(input)));
  server.registerTool('krom_extract_constraint_unsat_core',{title:'Extract constraint unsat core',description:'Identify mandatory constraints that collapse a variable domain to no valid values.',inputSchema:constraintSolverSchema},async(input)=>result(extractUnsatCore(input)));
  server.registerTool('krom_build_constraint_relaxation_plan',{title:'Build constraint relaxation plan',description:'Order unsatisfied constraints for human review without silently weakening policy.',inputSchema:constraintSolverSchema},async(input)=>result(buildConstraintRelaxationPlan(input)));
  server.registerTool('krom_compare_constraint_solutions',{title:'Compare constraint solutions',description:'Compare current and previous engineering assignments.',inputSchema:constraintSolverSchema},async(input)=>result(compareConstraintSolutions(input)));
  server.registerTool('krom_build_engineering_trust_graph',{title:'Build engineering trust graph',description:'Build evidence-backed trust nodes and dependency/delegation edges.',inputSchema:trustGraphSchema},async(input)=>result(buildEngineeringTrustGraph(input)));
  server.registerTool('krom_evaluate_transitive_trust',{title:'Evaluate transitive trust',description:'Propagate trust conservatively through evidenced graph relationships.',inputSchema:trustGraphSchema},async(input)=>result(evaluateTransitiveTrust(input)));
  server.registerTool('krom_detect_trust_weak_links',{title:'Detect trust weak links',description:'Detect low-trust nodes and weak-confidence relationships.',inputSchema:trustGraphSchema},async(input)=>result(detectTrustWeakLinks(input)));
  server.registerTool('krom_compare_trust_graphs',{title:'Compare trust graphs',description:'Compare trust-score movement against previous graph state.',inputSchema:trustGraphSchema},async(input)=>result(compareTrustGraphs(input)));
  server.registerTool('krom_simulate_change_blast_radius',{title:'Simulate change blast radius',description:'Propagate component changes through dependency relationships.',inputSchema:changeSimulationSchema},async(input)=>result(simulateChangeBlastRadius(input)));
  server.registerTool('krom_detect_change_cascades',{title:'Detect change cascades',description:'Detect indirect impacted components and irreversible source changes.',inputSchema:changeSimulationSchema},async(input)=>result(detectChangeCascades(input)));
  server.registerTool('krom_build_change_safeguard_plan',{title:'Build change safeguard plan',description:'Map impacted components to safeguard verification or safeguard creation work.',inputSchema:changeSimulationSchema},async(input)=>result(buildChangeSafeguardPlan(input)));
  server.registerTool('krom_compare_change_simulations',{title:'Compare change simulations',description:'Compare newly impacted and resolved components.',inputSchema:changeSimulationSchema},async(input)=>result(compareChangeSimulations(input)));
  server.registerTool('krom_score_recovery_strategies',{title:'Score recovery strategies',description:'Score recovery choices against objective, dependency, evidence, service and data-loss risk.',inputSchema:recoveryStrategySchema},async(input)=>result(scoreRecoveryStrategies(input)));
  server.registerTool('krom_build_recovery_decision_tree',{title:'Build recovery decision tree',description:'Build explicit recovery branches and fallback behavior without claiming execution.',inputSchema:recoveryStrategySchema},async(input)=>result(buildRecoveryDecisionTree(input)));
  server.registerTool('krom_evaluate_recovery_strategy_readiness',{title:'Evaluate recovery strategy readiness',description:'Require verified evidence, dependencies and objective fit before marking recovery ready.',inputSchema:recoveryStrategySchema},async(input)=>result(evaluateRecoveryStrategyReadiness(input)));
  server.registerTool('krom_compare_recovery_strategies',{title:'Compare recovery strategies',description:'Compare selected recovery strategy with prior state.',inputSchema:recoveryStrategySchema},async(input)=>result(compareRecoveryStrategies(input)));
  server.registerTool('krom_optimize_verification_spend',{title:'Optimize verification spend',description:'Allocate verification budget to mandatory and highest risk-reduction checks.',inputSchema:verificationEconomicsSchema},async(input)=>result(optimizeVerificationSpend(input)));
  server.registerTool('krom_detect_verification_underinvestment',{title:'Detect verification underinvestment',description:'Detect omitted critical-path verification and mandatory verification budget overruns.',inputSchema:verificationEconomicsSchema},async(input)=>result(detectVerificationUnderinvestment(input)));
  server.registerTool('krom_evaluate_verification_value',{title:'Evaluate verification value',description:'Compare risk reduction per verification cost and portfolio selection.',inputSchema:verificationEconomicsSchema},async(input)=>result(evaluateVerificationValue(input)));
  server.registerTool('krom_compare_verification_economics',{title:'Compare verification economics',description:'Compare selected verification checks across portfolio snapshots.',inputSchema:verificationEconomicsSchema},async(input)=>result(compareVerificationEconomics(input)));
  server.registerTool('krom_build_program_dependency_network',{title:'Build program dependency network',description:'Build project dependency order across an engineering program.',inputSchema:multiProjectCoordinationSchema},async(input)=>result(buildProgramDependencyNetwork(input)));
  server.registerTool('krom_detect_program_collisions',{title:'Detect program collisions',description:'Detect release-window collisions and dependency deadlocks across projects.',inputSchema:multiProjectCoordinationSchema},async(input)=>result(detectProgramCollisions(input)));
  server.registerTool('krom_allocate_shared_program_capacity',{title:'Allocate shared program capacity',description:'Allocate finite shared capabilities to highest-priority projects.',inputSchema:multiProjectCoordinationSchema},async(input)=>result(allocateSharedProgramCapacity(input)));
  server.registerTool('krom_compare_program_coordination',{title:'Compare program coordination',description:'Compare dependency order movement and collision state.',inputSchema:multiProjectCoordinationSchema},async(input)=>result(compareProgramCoordination(input)));
  server.registerTool('krom_build_operator_decision_cockpit',{title:'Build operator decision cockpit',description:'Aggregate evidenced ready and blocked engineering actions for an operator.',inputSchema:operatorCockpitSchema},async(input)=>result(buildOperatorDecisionCockpit(input)));
  server.registerTool('krom_evaluate_operator_action_readiness',{title:'Evaluate operator action readiness',description:'Require evidence, approvals and cleared blockers before an action is considered ready.',inputSchema:operatorCockpitSchema},async(input)=>result(evaluateOperatorActionReadiness(input)));
  server.registerTool('krom_select_next_safe_operator_action',{title:'Select next safe operator action',description:'Select an advisory next action from evidenced ready candidates without executing it.',inputSchema:operatorCockpitSchema},async(input)=>result(selectNextSafeOperatorAction(input)));
  server.registerTool('krom_compare_operator_cockpits',{title:'Compare operator cockpits',description:'Compare selected operator action and readiness with previous state.',inputSchema:operatorCockpitSchema},async(input)=>result(compareOperatorCockpits(input)));
  // v53 — 2000 generated, domain-specialized strategic tools
  for (const spec of V53_TOOL_SPECS) {
    server.registerTool(
      spec.name,
      {
        title: spec.title,
        description: spec.description,
        inputSchema: v53UniversalSchema
      },
      async (input) => result(executeV53Tool(spec, input))
    );
  }

  // v54 — 2485 generated enterprise automation tools
  for (const spec of V54_TOOL_SPECS) {
    server.registerTool(
      spec.name,
      { title: spec.title, description: spec.description, inputSchema: v54AutomationSchema },
      async (input) => result(executeV54Tool(spec, input))
    );
  }

  
  // v55 Adaptive Autonomous Engineering Runtime
  server.registerTool('krom_v55_route_adaptive_intent',{title:'Route adaptive intent',description:'Route intent across the tool estate using relevance, reliability, evidence quality, latency and cost.',inputSchema:v55RuntimeSchema},async(input)=>result(routeAdaptiveIntent(input)));
  server.registerTool('krom_v55_load_domain_skill_packs',{title:'Load domain skill packs',description:'Load only domain-relevant tool packs instead of exposing the entire registry.',inputSchema:v55RuntimeSchema},async(input)=>result(loadDomainSkillPacks(input)));
  server.registerTool('krom_v55_rank_tool_quality',{title:'Rank tool quality',description:'Rank tools by observed quality, failure rate, evidence quality, latency and cost.',inputSchema:v55RuntimeSchema},async(input)=>result(rankToolQuality(input)));
  server.registerTool('krom_v55_compress_capabilities',{title:'Compress capabilities',description:'Compress thousands of capabilities into domain packs and representative tools.',inputSchema:v55RuntimeSchema},async(input)=>result(compressCapabilities(input)));
  server.registerTool('krom_v55_build_adaptive_task_graph',{title:'Build adaptive task graph',description:'Build a dependency-aware execution graph from proposed engineering actions.',inputSchema:v55RuntimeSchema},async(input)=>result(buildAdaptiveTaskGraph(input)));
  server.registerTool('krom_v55_plan_parallel_execution',{title:'Plan parallel execution',description:'Create safe execution waves from action dependencies.',inputSchema:v55RuntimeSchema},async(input)=>result(planParallelExecution(input)));
  server.registerTool('krom_v55_build_agent_command_center',{title:'Build agent command center',description:'Build an availability and reliability view across specialist agents.',inputSchema:v55RuntimeSchema},async(input)=>result(buildAgentCommandCenter(input)));
  server.registerTool('krom_v55_detect_agent_contradictions',{title:'Detect agent contradictions',description:'Detect directly opposing agent claims that require reconciliation.',inputSchema:v55RuntimeSchema},async(input)=>result(detectAgentContradictions(input)));
  server.registerTool('krom_v55_score_evidence_trust',{title:'Score evidence trust',description:'Score evidence using verification, freshness, confidence and dependency burden.',inputSchema:v55RuntimeSchema},async(input)=>result(scoreEvidenceTrust(input)));
  server.registerTool('krom_v55_build_automatic_reverification',{title:'Build automatic reverification',description:'Identify actions whose evidence is missing, stale or unverified.',inputSchema:v55RuntimeSchema},async(input)=>result(buildAutomaticReverification(input)));
  server.registerTool('krom_v55_simulate_execution_dry_run',{title:'Simulate execution dry run',description:'Dry-run proposed actions without mutation and enforce evidence/approval preconditions.',inputSchema:v55RuntimeSchema},async(input)=>result(simulateExecutionDryRun(input)));
  server.registerTool('krom_v55_evaluate_mutation_risk',{title:'Evaluate mutation risk',description:'Classify risky, irreversible and approval-bound mutations before execution.',inputSchema:v55RuntimeSchema},async(input)=>result(evaluateMutationRisk(input)));
  server.registerTool('krom_v55_create_mission_checkpoint',{title:'Create mission checkpoint',description:'Create a portable checkpoint for resumable mission execution.',inputSchema:v55RuntimeSchema},async(input)=>result(createMissionCheckpointV55(input)));
  server.registerTool('krom_v55_resume_mission_checkpoint',{title:'Resume mission checkpoint',description:'Resume unfinished work from a portable checkpoint without replaying completed actions.',inputSchema:v55RuntimeSchema},async(input)=>result(resumeMissionCheckpointV55(input)));
  server.registerTool('krom_v55_assess_change_impact_v2',{title:'Assess change impact v2',description:'Propagate change impact through action dependencies and highlight high-risk impact.',inputSchema:v55RuntimeSchema},async(input)=>result(assessChangeImpactV2(input)));
  server.registerTool('krom_v55_simulate_release_twin_v2',{title:'Simulate release twin v2',description:'Build a non-observed digital twin of a release plan and blocked steps.',inputSchema:v55RuntimeSchema},async(input)=>result(simulateReleaseTwinV2(input)));
  server.registerTool('krom_v55_build_incident_commander',{title:'Build incident commander',description:'Aggregate verified incident signals, severity and containment actions.',inputSchema:v55RuntimeSchema},async(input)=>result(buildIncidentCommander(input)));
  server.registerTool('krom_v55_evaluate_incident_action',{title:'Evaluate incident action',description:'Select a safe evidence-backed next incident action without executing it.',inputSchema:v55RuntimeSchema},async(input)=>result(evaluateIncidentAction(input)));
  server.registerTool('krom_v55_govern_execution_cost',{title:'Govern execution cost',description:'Select a quality-ranked tool portfolio within an explicit execution budget.',inputSchema:v55RuntimeSchema},async(input)=>result(governExecutionCost(input)));
  server.registerTool('krom_v55_select_adaptive_depth',{title:'Select adaptive depth',description:'Select FAST, STANDARD, DEEP or FORENSIC depth from risk and incident severity.',inputSchema:v55RuntimeSchema},async(input)=>result(selectAdaptiveDepth(input)));
  server.registerTool('krom_v55_detect_decision_contradictions',{title:'Detect decision contradictions',description:'Detect conflicting states for the same engineering signal.',inputSchema:v55RuntimeSchema},async(input)=>result(detectDecisionContradictions(input)));
  server.registerTool('krom_v55_reconcile_decision_contradictions',{title:'Reconcile decision contradictions',description:'Convert contradictions into explicit fresh-evidence collection actions.',inputSchema:v55RuntimeSchema},async(input)=>result(reconcileDecisionContradictions(input)));
  server.registerTool('krom_v55_select_execution_provider',{title:'Select execution provider',description:'Select a compatible local or cloud provider using capability, quality, latency and cost.',inputSchema:v55RuntimeSchema},async(input)=>result(selectExecutionProvider(input)));
  server.registerTool('krom_v55_build_plugin_adapter_plan',{title:'Build plugin adapter plan',description:'Normalize providers/plugins behind health, capability, execution, evidence and error contracts.',inputSchema:v55RuntimeSchema},async(input)=>result(buildPluginAdapterPlan(input)));
  server.registerTool('krom_v55_build_mission_console_snapshot',{title:'Build mission console snapshot',description:'Aggregate routing, agents, evidence, cost, depth and incident state for a realtime mission console.',inputSchema:v55RuntimeSchema},async(input)=>result(buildMissionConsoleSnapshot(input)));
  server.registerTool('krom_v55_learn_from_outcome',{title:'Learn from outcome',description:'Build a non-mutating learning record from intent, selected tools and verified evidence.',inputSchema:v55RuntimeSchema},async(input)=>result(learnFromOutcome(input)));
  server.registerTool('krom_v55_build_on_demand_tool_set',{title:'Build on-demand tool set',description:'Produce a compact domain-aware tool set for the current request.',inputSchema:v55RuntimeSchema},async(input)=>result(buildOnDemandToolSet(input)));
  server.registerTool('krom_v55_evaluate_routing_efficiency',{title:'Evaluate routing efficiency',description:'Measure on-demand loading reduction and top routing quality scores.',inputSchema:v55RuntimeSchema},async(input)=>result(evaluateRoutingEfficiency(input)));

  
  // v56 Cognitive Self-Healing Runtime
  server.registerTool('krom_v56_build_semantic_mission_memory',{title:'Build semantic mission memory',description:'Build ordered portable mission memory without claiming durable persistence.',inputSchema:v56RuntimeSchema},async(input)=>result(buildSemanticMissionMemory(input)));
  server.registerTool('krom_v56_compact_mission_memory',{title:'Compact mission memory',description:'Compact mission records into bounded verified summaries.',inputSchema:v56RuntimeSchema},async(input)=>result(compactMissionMemory(input)));
  server.registerTool('krom_v56_replay_mission_deterministically',{title:'Replay mission deterministically',description:'Create a deterministic non-executing replay representation and fingerprint.',inputSchema:v56RuntimeSchema},async(input)=>result(replayMissionDeterministically(input)));
  server.registerTool('krom_v56_compare_mission_replays',{title:'Compare mission replays',description:'Compare current deterministic replay with supplied reference state.',inputSchema:v56RuntimeSchema},async(input)=>result(compareMissionReplays(input)));
  server.registerTool('krom_v56_classify_failure_for_replan',{title:'Classify failure for replan',description:'Classify failures into reauthorize, failover/backoff, replan or escalation strategies.',inputSchema:v56RuntimeSchema},async(input)=>result(classifyFailureForReplan(input)));
  server.registerTool('krom_v56_build_self_healing_replan',{title:'Build self-healing replan',description:'Build evidence-first recovery/replan steps without automatic mutation.',inputSchema:v56RuntimeSchema},async(input)=>result(buildSelfHealingReplan(input)));
  server.registerTool('krom_v56_enforce_retry_budget',{title:'Enforce retry budget',description:'Enforce attempt and cost ceilings before another retry.',inputSchema:v56RuntimeSchema},async(input)=>result(enforceRetryBudget(input)));
  server.registerTool('krom_v56_detect_retry_loop',{title:'Detect retry loop',description:'Detect repeated action/failure/provider/tool signatures that indicate looping.',inputSchema:v56RuntimeSchema},async(input)=>result(detectRetryLoop(input)));
  server.registerTool('krom_v56_update_provider_circuit_breaker',{title:'Update provider circuit breaker',description:'Derive provider circuit state from observed successes and failures.',inputSchema:v56RuntimeSchema},async(input)=>result(updateProviderCircuitBreaker(input)));
  server.registerTool('krom_v56_select_failover_provider',{title:'Select failover provider',description:'Select a healthy failover provider using circuit, quality, cost and latency.',inputSchema:v56RuntimeSchema},async(input)=>result(selectFailoverProvider(input)));
  server.registerTool('krom_v56_build_tool_shadow_evaluation',{title:'Build tool shadow evaluation',description:'Build non-executing shadow pairs for comparative tool evaluation.',inputSchema:v56RuntimeSchema},async(input)=>result(buildToolShadowEvaluation(input)));
  server.registerTool('krom_v56_evaluate_tool_canary',{title:'Evaluate tool canary',description:'Evaluate tool canary eligibility while requiring observed results for promotion.',inputSchema:v56RuntimeSchema},async(input)=>result(evaluateToolCanary(input)));
  server.registerTool('krom_v56_detect_semantic_tool_overlap',{title:'Detect semantic tool overlap',description:'Detect highly overlapping tool semantics using normalized token similarity.',inputSchema:v56RuntimeSchema},async(input)=>result(detectSemanticToolOverlap(input)));
  server.registerTool('krom_v56_recommend_tool_deprecations',{title:'Recommend tool deprecations',description:'Recommend overlap-based tool consolidation without automatic deprecation.',inputSchema:v56RuntimeSchema},async(input)=>result(recommendToolDeprecations(input)));
  server.registerTool('krom_v56_build_agent_quorum',{title:'Build agent quorum',description:'Build reliability/evidence-weighted multi-agent voting state.',inputSchema:v56RuntimeSchema},async(input)=>result(buildAgentQuorum(input)));
  server.registerTool('krom_v56_evaluate_agent_quorum',{title:'Evaluate agent quorum',description:'Evaluate weighted approve/block quorum without fabricating consensus.',inputSchema:v56RuntimeSchema},async(input)=>result(evaluateAgentQuorum(input)));
  server.registerTool('krom_v56_compile_runtime_policy',{title:'Compile runtime policy',description:'Compile deterministic priority-ordered runtime policy state.',inputSchema:v56RuntimeSchema},async(input)=>result(compileRuntimePolicy(input)));
  server.registerTool('krom_v56_diff_runtime_policies',{title:'Diff runtime policies',description:'Detect added, removed and changed runtime policy rules.',inputSchema:v56RuntimeSchema},async(input)=>result(diffRuntimePolicies(input)));
  server.registerTool('krom_v56_propagate_evidence_invalidation',{title:'Propagate evidence invalidation',description:'Propagate changed evidence through dependency chains to impacted actions.',inputSchema:v56RuntimeSchema},async(input)=>result(propagateEvidenceInvalidation(input)));
  server.registerTool('krom_v56_build_causal_execution_trace',{title:'Build causal execution trace',description:'Build action dependency and evidence linkage trace for runtime reasoning.',inputSchema:v56RuntimeSchema},async(input)=>result(buildCausalExecutionTrace(input)));
  server.registerTool('krom_v56_evaluate_recovery_confidence',{title:'Evaluate recovery confidence',description:'Measure recovery support only from verified fresh evidence.',inputSchema:v56RuntimeSchema},async(input)=>result(evaluateRecoveryConfidence(input)));
  server.registerTool('krom_v56_build_runtime_observability_snapshot',{title:'Build runtime observability snapshot',description:'Aggregate runtime metric thresholds, attempts, failures and open provider circuits.',inputSchema:v56RuntimeSchema},async(input)=>result(buildRuntimeObservabilitySnapshot(input)));
  server.registerTool('krom_v56_detect_runtime_control_anomalies',{title:'Detect runtime control anomalies',description:'Detect metric breaches, retry loops and open provider circuits.',inputSchema:v56RuntimeSchema},async(input)=>result(detectRuntimeControlAnomalies(input)));
  server.registerTool('krom_v56_build_self_healing_command_snapshot',{title:'Build self-healing command snapshot',description:'Aggregate replan, retry, failover, quorum, recovery and anomaly state without execution claims.',inputSchema:v56RuntimeSchema},async(input)=>result(buildSelfHealingCommandSnapshot(input)));

  server.registerTool(
    'krom_get_capabilities',
    {
      title: 'Get KROM Forge capabilities',
      description: 'List the MCP tools and the boundaries of this server.',
      inputSchema: z.object({})
    },
    async () => result({
      version: pkg.version,
      transport: 'Streamable HTTP',
      protocol: 'MCP 2026-07-28 with 2025 stateless compatibility',
      endpoint: '/mcp',
      tools: ['krom_route_workflow', 'krom_create_research_brief', 'krom_create_master_prompt_blueprint', 'krom_create_uiux_blueprint', 'krom_create_engineering_blueprint', 'krom_create_debug_plan', 'krom_evaluate_release_evidence', 'krom_select_tools', 'krom_build_task_graph', 'krom_plan_execution', 'krom_resume_task', 'krom_verify_evidence', 'krom_audit_project', 'krom_inspect_project', 'krom_build_project_inventory', 'krom_map_architecture', 'krom_inventory_dependencies', 'krom_detect_broken_routes', 'krom_detect_duplicates', 'krom_find_risks', 'krom_compare_project_state', 'krom_classify_sources', 'krom_extract_requirements', 'krom_build_domain_model', 'krom_detect_research_conflicts', 'krom_assess_research_coverage', 'krom_synthesize_research', 'krom_plan_code_change', 'krom_prepare_patch', 'krom_validate_change_scope', 'krom_assess_patch_risk', 'krom_generate_migration_plan', 'krom_generate_test_plan', 'krom_review_diff', 'krom_verify_patch_evidence', 'krom_list_agents', 'krom_route_agent', 'krom_create_agent_run', 'krom_agent_handoff', 'krom_coordinate_agents', 'krom_evaluate_agent_run', 'krom_create_project_memory', 'krom_get_project_memory', 'krom_update_project_memory', 'krom_record_decision', 'krom_record_failure', 'krom_record_evidence', 'krom_record_test_result', 'krom_record_deployment', 'krom_record_task', 'krom_record_risk', 'krom_record_project_snapshot', 'krom_get_project_timeline', 'krom_compare_project_memory', 'krom_audit_project_memory', 'krom_audit_ui', 'krom_audit_responsive', 'krom_audit_rtl', 'krom_audit_accessibility', 'krom_build_design_system', 'krom_review_ui_evidence', 'krom_compare_ui_states', 'krom_generate_ui_fix_plan', 'krom_create_debug_session', 'krom_classify_failure', 'krom_add_debug_evidence', 'krom_add_debug_hypothesis', 'krom_record_debug_attempt', 'krom_update_reproduction', 'krom_build_root_cause_graph', 'krom_check_debug_loop', 'krom_next_debug_diagnostic', 'krom_set_root_cause', 'krom_record_debug_fix', 'krom_verify_debug_fix', 'krom_evaluate_debug_closure', 'krom_create_evidence_bundle', 'krom_record_claim', 'krom_record_evidence_artifact', 'krom_link_claim_evidence', 'krom_verify_claim', 'krom_audit_evidence_graph', 'krom_build_release_evidence', 'krom_compare_evidence_snapshots', 'krom_create_autonomous_loop', 'krom_get_next_autonomous_action', 'krom_advance_autonomous_loop', 'krom_record_loop_host_result', 'krom_resume_autonomous_loop', 'krom_audit_autonomous_loop', 'krom_register_host_capabilities', 'krom_assess_host_requirements', 'krom_adapt_loop_to_host', 'krom_recommend_host_strategy', 'krom_validate_host_evidence', 'krom_compare_host_capabilities', 'krom_get_execution_policy', 'krom_classify_execution_action', 'krom_create_approval_request', 'krom_evaluate_approval', 'krom_enforce_execution_policy', 'krom_audit_execution_policy', 'krom_compare_execution_policies', 'krom_get_quality_gate_policy', 'krom_evaluate_plan_quality', 'krom_evaluate_quality_gate', 'krom_evaluate_delivery_quality', 'krom_self_critique', 'krom_compare_quality_gates', 'krom_create_restore_point', 'krom_assess_recovery_impact', 'krom_build_recovery_plan', 'krom_validate_recovery_execution', 'krom_verify_recovery', 'krom_recommend_recovery_strategy', 'krom_compare_restore_points', 'krom_normalize_runtime_signals', 'krom_evaluate_service_health', 'krom_detect_runtime_anomalies', 'krom_correlate_runtime_incident', 'krom_evaluate_slo', 'krom_build_runtime_evidence', 'krom_recommend_runtime_action', 'krom_compare_runtime_snapshots', 'krom_evaluate_production_readiness', 'krom_decide_release', 'krom_build_release_checklist', 'krom_evaluate_release_exception', 'krom_verify_post_release', 'krom_create_release_control_summary', 'krom_compare_production_readiness', 'krom_evaluate_security_assessment', 'krom_audit_rls', 'krom_audit_authorization', 'krom_audit_secrets', 'krom_audit_dependencies_security', 'krom_build_security_control_matrix', 'krom_recommend_security_remediation', 'krom_compare_security_assessments', 'krom_evaluate_compliance_assessment', 'krom_map_compliance_evidence', 'krom_build_compliance_control_coverage', 'krom_evaluate_compliance_exception', 'krom_decide_governance', 'krom_recommend_compliance_remediation', 'krom_compare_compliance_assessments', 'krom_audit_database_architecture', 'krom_detect_schema_drift', 'krom_assess_migration_safety', 'krom_analyze_query_performance', 'krom_evaluate_data_integrity', 'krom_verify_backup_readiness', 'krom_compare_database_snapshots', 'krom_evaluate_performance_budgets', 'krom_analyze_runtime_cost', 'krom_enforce_cost_guardrail', 'krom_detect_performance_regression', 'krom_recommend_performance_actions', 'krom_compare_performance_snapshots', 'krom_audit_supply_chain', 'krom_detect_dependency_version_drift', 'krom_evaluate_license_risk', 'krom_build_dependency_upgrade_plan', 'krom_compare_dependency_snapshots', 'krom_assess_change_blast_radius', 'krom_build_rollout_plan', 'krom_build_release_train', 'krom_evaluate_change_readiness', 'krom_compare_change_sets', 'krom_build_execution_graph', 'krom_evaluate_plan_intelligence', 'krom_select_next_plan_action', 'krom_detect_plan_conflicts', 'krom_create_plan_evidence_matrix', 'krom_compare_plans', 'krom_build_traceability_matrix', 'krom_evaluate_requirement_coverage', 'krom_detect_orphan_requirements', 'krom_detect_unproven_requirements', 'krom_build_requirement_release_gate', 'krom_compare_traceability', 'krom_audit_architecture_model', 'krom_detect_architecture_cycles', 'krom_evaluate_architecture_decisions', 'krom_assess_architecture_change_impact', 'krom_build_architecture_decision_register', 'krom_compare_architecture_models', 'krom_evaluate_test_coverage', 'krom_select_risk_based_tests', 'krom_cluster_test_failures', 'krom_detect_flaky_tests', 'krom_evaluate_test_evidence', 'krom_build_regression_plan', 'krom_compare_test_suites', 'krom_audit_api_contracts', 'krom_detect_breaking_api_changes', 'krom_audit_api_authorization', 'krom_audit_api_idempotency', 'krom_build_api_contract_test_plan', 'krom_compare_api_contracts', 'krom_audit_knowledge_graph', 'krom_query_knowledge_neighborhood', 'krom_find_knowledge_contradictions', 'krom_evaluate_knowledge_evidence_coverage', 'krom_build_impact_graph', 'krom_compare_knowledge_graphs', 'krom_create_engineering_mission', 'krom_build_mission_context_pack', 'krom_compile_mission_execution_manifest', 'krom_evaluate_mission_gate', 'krom_select_mission_next_action', 'krom_record_mission_host_result', 'krom_resume_engineering_mission', 'krom_arbitrate_mission_blockers', 'krom_build_cross_engine_gate', 'krom_create_delivery_manifest', 'krom_verify_delivery_closure', 'krom_build_post_deploy_watch_plan', 'krom_generate_operator_brief', 'krom_audit_control_plane', 'krom_compare_missions', 'krom_audit_portfolio', 'krom_build_portfolio_dependency_graph', 'krom_detect_portfolio_bottlenecks', 'krom_prioritize_portfolio_attention', 'krom_assess_portfolio_scenario', 'krom_build_portfolio_command_brief', 'krom_compare_portfolios', 'krom_audit_pipeline', 'krom_evaluate_pipeline_gate', 'krom_detect_weak_pipeline_gates', 'krom_analyze_pipeline_failure_patterns', 'krom_build_pipeline_hardening_plan', 'krom_build_pipeline_evidence_manifest', 'krom_compare_pipelines', 'krom_run_engineering_premortem', 'krom_detect_single_points_of_failure', 'krom_audit_preventive_controls', 'krom_build_failure_detection_matrix', 'krom_evaluate_resilience_readiness', 'krom_build_failure_prevention_plan', 'krom_compare_failure_models', 'krom_audit_engineering_decisions', 'krom_evaluate_engineering_decision', 'krom_detect_decision_conflicts', 'krom_build_decision_risk_command_center', 'krom_build_decision_evidence_matrix', 'krom_build_executive_engineering_brief', 'krom_compare_decision_models', 'krom_build_enterprise_command_snapshot', 'krom_evaluate_enterprise_command_gate', 'krom_select_enterprise_intervention', 'krom_compare_enterprise_command_snapshots', 'krom_normalize_engineering_intent', 'krom_route_semantic_intent', 'krom_build_semantic_tool_chain', 'krom_detect_routing_ambiguity', 'krom_validate_route_evidence', 'krom_compare_semantic_routes', 'krom_audit_evidence_freshness', 'krom_invalidate_stale_evidence', 'krom_build_reverification_plan', 'krom_detect_stale_claims', 'krom_compute_evidence_dependencies', 'krom_compare_evidence_freshness', 'krom_build_unified_change_impact_graph', 'krom_trace_change_to_tests', 'krom_trace_change_to_runtime', 'krom_build_change_reverification_set', 'krom_detect_uncovered_change_impact', 'krom_compare_change_impacts', 'krom_create_workflow_template', 'krom_instantiate_workflow', 'krom_validate_workflow', 'krom_select_workflow_template', 'krom_advance_workflow_state', 'krom_compare_workflows', 'krom_build_enterprise_audit_package', 'krom_validate_audit_package', 'krom_build_evidence_index', 'krom_build_approval_ledger', 'krom_build_exception_register', 'krom_compare_audit_packages', 'krom_build_enterprise_release_train', 'krom_detect_release_train_conflicts', 'krom_evaluate_release_train_readiness', 'krom_build_canary_sequence', 'krom_build_rollback_matrix', 'krom_compare_release_trains', 'krom_build_project_health_snapshot', 'krom_evaluate_project_health_gate', 'krom_detect_health_contradictions', 'krom_build_health_action_queue', 'krom_build_executive_health_brief', 'krom_compare_project_health', 'krom_classify_next_authorized_action', 'krom_build_authorization_queue', 'krom_validate_action_preconditions', 'krom_enforce_evidence_before_action', 'krom_build_autonomy_runbook', 'krom_compare_autonomy_states', 'krom_build_assurance_verification_contract', 'krom_evaluate_assurance_evidence', 'krom_detect_unsupported_release_claims', 'krom_build_evidence_replay_plan', 'krom_compare_assurance_runs', 'krom_audit_tool_registry', 'krom_evaluate_version_consistency', 'krom_build_registry_repair_plan', 'krom_build_capability_delta_report', 'krom_compare_registry_snapshots', 'krom_audit_ci_pipeline', 'krom_detect_ci_gate_gaps', 'krom_enforce_ci_independence', 'krom_build_ci_evidence_manifest', 'krom_build_ci_failure_triage_plan', 'krom_compare_ci_pipelines', 'krom_build_delivery_handoff', 'krom_validate_delivery_handoff', 'krom_build_reviewer_checklist', 'krom_detect_delivery_claim_gaps', 'krom_build_no_merge_guard', 'krom_compare_delivery_handoffs', 'krom_build_release_provenance', 'krom_audit_provenance_bindings', 'krom_detect_provenance_drift', 'krom_evaluate_artifact_integrity', 'krom_build_release_attestation', 'krom_compare_release_provenance', 'krom_classify_adaptive_change_risk', 'krom_derive_adaptive_verification_plan', 'krom_evaluate_adaptive_verification_coverage', 'krom_detect_verification_shortcuts', 'krom_prioritize_verification_gaps', 'krom_compare_adaptive_verification_plans', 'krom_build_tool_contract_catalog', 'krom_audit_tool_contract_coverage', 'krom_detect_tool_contract_compatibility_risk', 'krom_generate_tool_contract_test_plan', 'krom_evaluate_tool_contract_results', 'krom_compare_tool_contract_catalogs', 'krom_audit_ci_run_binding', 'krom_build_ci_run_evidence_bundle', 'krom_detect_ci_evidence_gaps', 'krom_evaluate_ci_run_trust', 'krom_build_ci_run_failure_triage', 'krom_compare_ci_run_evidence', 'krom_build_recovery_rehearsal_plan', 'krom_audit_recovery_dependencies', 'krom_build_failure_injection_matrix', 'krom_evaluate_recovery_objectives', 'krom_evaluate_recovery_rehearsal', 'krom_compare_recovery_rehearsals', 'krom_compile_merge_policy', 'krom_derive_required_approvers', 'krom_build_approval_evidence_matrix', 'krom_detect_merge_bypass_risk', 'krom_evaluate_merge_policy', 'krom_compare_merge_policy_decisions', ...V50_TOOL_NAMES, ...V51_TOOL_NAMES, ...V52_TOOL_NAMES, ...V53_TOOL_NAMES, ...V54_TOOL_NAMES, 'krom_v55_route_adaptive_intent', 'krom_v55_load_domain_skill_packs', 'krom_v55_rank_tool_quality', 'krom_v55_compress_capabilities', 'krom_v55_build_adaptive_task_graph', 'krom_v55_plan_parallel_execution', 'krom_v55_build_agent_command_center', 'krom_v55_detect_agent_contradictions', 'krom_v55_score_evidence_trust', 'krom_v55_build_automatic_reverification', 'krom_v55_simulate_execution_dry_run', 'krom_v55_evaluate_mutation_risk', 'krom_v55_create_mission_checkpoint', 'krom_v55_resume_mission_checkpoint', 'krom_v55_assess_change_impact_v2', 'krom_v55_simulate_release_twin_v2', 'krom_v55_build_incident_commander', 'krom_v55_evaluate_incident_action', 'krom_v55_govern_execution_cost', 'krom_v55_select_adaptive_depth', 'krom_v55_detect_decision_contradictions', 'krom_v55_reconcile_decision_contradictions', 'krom_v55_select_execution_provider', 'krom_v55_build_plugin_adapter_plan', 'krom_v55_build_mission_console_snapshot', 'krom_v55_learn_from_outcome', 'krom_v55_build_on_demand_tool_set', 'krom_v55_evaluate_routing_efficiency', 'krom_v56_build_semantic_mission_memory', 'krom_v56_compact_mission_memory', 'krom_v56_replay_mission_deterministically', 'krom_v56_compare_mission_replays', 'krom_v56_classify_failure_for_replan', 'krom_v56_build_self_healing_replan', 'krom_v56_enforce_retry_budget', 'krom_v56_detect_retry_loop', 'krom_v56_update_provider_circuit_breaker', 'krom_v56_select_failover_provider', 'krom_v56_build_tool_shadow_evaluation', 'krom_v56_evaluate_tool_canary', 'krom_v56_detect_semantic_tool_overlap', 'krom_v56_recommend_tool_deprecations', 'krom_v56_build_agent_quorum', 'krom_v56_evaluate_agent_quorum', 'krom_v56_compile_runtime_policy', 'krom_v56_diff_runtime_policies', 'krom_v56_propagate_evidence_invalidation', 'krom_v56_build_causal_execution_trace', 'krom_v56_evaluate_recovery_confidence', 'krom_v56_build_runtime_observability_snapshot', 'krom_v56_detect_runtime_control_anomalies', 'krom_v56_build_self_healing_command_snapshot', 'krom_get_capabilities'],
      boundary: 'Autonomous engineering orchestration, evidence-based project inspection, research synthesis, patch planning/review, multi-agent coordination, project-scoped intelligence memory, UI/UX intelligence, evidence-driven debugging, claim-to-evidence verification, execution-policy/approval enforcement, self-evaluation quality gates, recovery/rollback intelligence, observability/runtime intelligence, production-readiness/release control, security/policy intelligence, compliance/governance intelligence, database/data intelligence, performance/cost intelligence, software-supply-chain intelligence, change/release-train intelligence, planning intelligence, requirements traceability, architecture-decision intelligence, test intelligence, API-contract intelligence, engineering knowledge-graph intelligence, a unified mission/control-plane layer, portfolio/program intelligence, CI/CD pipeline intelligence, failure-prevention/pre-mortem intelligence, engineering decision/risk command intelligence, an enterprise command gate, semantic routing, evidence freshness/invalidation, unified change-impact reverification, workflow templates, enterprise audit packaging, release-train orchestration, project-health intelligence, authorized autonomy, v48 assurance controls, the v49 Release Integrity Mesh, the v50 Engineering Operating System, the v51 Frontier Operations layer for mission runtime, causal decisions, counterfactual simulation, risk capital, capability markets, knowledge consolidation, safety cases, release digital twins, tool composition, drift forecasting, human oversight and outcome learning, the v52 Strategic Engineering Intelligence layer for engineering constitutions, constraint solving, trust graphs, change simulation, recovery strategy intelligence, verification economics, multi-project coordination and operator decision cockpits, the v53 2000-Tool Strategic Expansion spanning 40 engineering domains with 50 evidence-bound operations per domain, and the v54 Enterprise Automation Fabric adding 2485 automation-aware tools across 35 advanced engineering domains with 71 operations per domain, reaching 5000 MCP tools, plus the v55 Adaptive Autonomous Engineering Runtime for semantic routing, on-demand skill packs, quality ranking, task graphs, evidence trust, dry-run safety, resumable missions, incident command, cost governance, provider abstraction outcome learning, and v56 cognitive self-healing for deterministic replay, failure-aware replanning, retry-loop protection, provider failover, semantic overlap control, quorum, evidence invalidation and recovery observability. Project memory defaults to PORTABLE host-carried state; durable persistence requires a separately authorized external store. Specialist agents coordinate and validate handoffs but external browsing, file mutation, repository, execution, database and deployment actions still require host-authorized tools; KROM Forge never fabricates agent execution, edits, tests, persistence, CI, recovery, approval, incident closure or deployment success.'
    })
  );
}, {
  serverInfo: { name: 'krom-forge', version: pkg.version }
});

export { handler as GET, handler as POST };
