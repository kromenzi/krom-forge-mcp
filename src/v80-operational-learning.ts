import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { rankSkillsV76 } from './v76-semantic-skill-runtime';
import {
  V80_SKILL_LIFECYCLE,
  buildAgentPerformanceMatrixV80,
  evaluateSkillLifecycleV80,
  rankAdaptiveSkillsV80,
  scoreSkillEffectivenessV80,
  v80AgentMatrixSchema,
  v80AdaptiveRoutingSchema,
  v80EffectivenessSchema,
  v80LifecycleEvaluationSchema
} from './v80-adaptive-skill-intelligence';

const agentSchema = z.enum(V75_AGENT_IDS);
const lifecycleSchema = z.enum(V80_SKILL_LIFECYCLE);
const knownSkills = new Set<string>(V75_SKILL_NAMES as readonly string[]);

const round = (value:number, digits=4) => Number(value.toFixed(digits));
const clamp01 = (value:number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const v80SkillObservationSchema = z.object({
  id:z.string().min(1),
  missionDigest:z.string().regex(/^[a-f0-9]{64}$/).optional(),
  skillName:z.string().min(1),
  domain:z.string().min(1).default('general'),
  primaryAgent:agentSchema,
  validatorAgent:agentSchema,
  outcome:z.enum(['PASS','FAIL','BLOCKED','UNVERIFIED']),
  evidenceComplete:z.boolean(),
  verificationPassed:z.boolean(),
  regressionDetected:z.boolean().default(false),
  handoffCount:z.number().int().min(0).default(0),
  latencyMs:z.number().min(0).default(0),
  timestampEpoch:z.number().int().min(0).default(0),
  note:z.string().max(1000).optional()
});

export const v80ObservationLedgerSchema = z.object({
  version:z.literal('1').default('1'),
  observations:z.array(v80SkillObservationSchema).max(10000).default([])
});

export type V80ObservationLedger=z.infer<typeof v80ObservationLedgerSchema>;

export function createObservationLedgerV80():V80ObservationLedger {
  return {version:'1',observations:[]};
}

export const v80RecordObservationSchema=z.object({
  ledger:v80ObservationLedgerSchema,
  observation:v80SkillObservationSchema
});

export function recordSkillObservationV80(input:z.input<typeof v80RecordObservationSchema>){
  const parsed=v80RecordObservationSchema.parse(input);
  if(!knownSkills.has(parsed.observation.skillName)){
    return {
      release:'v80',
      status:'REJECTED_UNKNOWN_SKILL',
      skillName:parsed.observation.skillName,
      ledger:parsed.ledger,
      recorded:false,
      executionClaim:false
    } as const;
  }
  if(parsed.ledger.observations.some(item=>item.id===parsed.observation.id)){
    return {
      release:'v80',
      status:'DUPLICATE_OBSERVATION',
      skillName:parsed.observation.skillName,
      ledger:parsed.ledger,
      recorded:false,
      executionClaim:false
    } as const;
  }
  const ledger:V80ObservationLedger={
    version:'1',
    observations:[...parsed.ledger.observations,parsed.observation]
  };
  return {
    release:'v80',
    status:'RECORDED',
    skillName:parsed.observation.skillName,
    ledger,
    recorded:true,
    observationCount:ledger.observations.length,
    executionClaim:false
  } as const;
}

export const v80MissionOutcomeSchema=z.object({
  ledger:v80ObservationLedgerSchema,
  missionDigest:z.string().regex(/^[a-f0-9]{64}$/),
  skillNames:z.array(z.string().min(1)).min(1).max(8),
  domain:z.string().min(1).default('general'),
  primaryAgent:agentSchema,
  validatorAgent:agentSchema,
  outcome:z.enum(['SUCCEEDED','FAILED','PARTIAL']),
  evidenceRefs:z.array(z.string().min(1)).default([]),
  verificationPassed:z.boolean().default(false),
  executionAuthorized:z.boolean().default(false),
  regressionDetected:z.boolean().default(false),
  handoffCount:z.number().int().min(0).default(0),
  latencyMs:z.number().min(0).default(0),
  timestampEpoch:z.number().int().min(0).default(0)
});

export function recordMissionOutcomeV80(input:z.input<typeof v80MissionOutcomeSchema>){
  const parsed=v80MissionOutcomeSchema.parse(input);
  const unknownSkills=parsed.skillNames.filter(name=>!knownSkills.has(name));
  if(unknownSkills.length){
    return {
      release:'v80',
      status:'REJECTED_UNKNOWN_SKILL',
      unknownSkills,
      ledger:parsed.ledger,
      recorded:0,
      executionClaim:false
    } as const;
  }

  const evidenceComplete=parsed.evidenceRefs.length>0;
  const safeVerified=parsed.verificationPassed&&parsed.executionAuthorized&&evidenceComplete;
  const outcome =
    parsed.outcome==='FAILED' ? 'FAIL'
      : parsed.outcome==='PARTIAL' ? 'BLOCKED'
        : safeVerified ? 'PASS' : 'UNVERIFIED';

  let ledger=parsed.ledger;
  let recorded=0;
  const duplicateIds:string[]=[];
  for(const [index,skillName] of parsed.skillNames.entries()){
    const id=`${parsed.missionDigest}:${index}:${skillName}`;
    const next=recordSkillObservationV80({
      ledger,
      observation:{
        id,
        missionDigest:parsed.missionDigest,
        skillName,
        domain:parsed.domain,
        primaryAgent:parsed.primaryAgent,
        validatorAgent:parsed.validatorAgent,
        outcome,
        evidenceComplete,
        verificationPassed:parsed.verificationPassed,
        regressionDetected:parsed.regressionDetected,
        handoffCount:parsed.handoffCount,
        latencyMs:parsed.latencyMs,
        timestampEpoch:parsed.timestampEpoch
      }
    });
    if(next.recorded){
      ledger=next.ledger;
      recorded++;
    } else if(next.status==='DUPLICATE_OBSERVATION'){
      duplicateIds.push(id);
    }
  }

  return {
    release:'v80',
    status:recorded===parsed.skillNames.length?'RECORDED':'PARTIAL_RECORD',
    missionDigest:parsed.missionDigest,
    normalizedOutcome:outcome,
    recorded,
    requested:parsed.skillNames.length,
    duplicateIds,
    ledger,
    executionClaim:false
  } as const;
}

function aggregateSkill(ledger:V80ObservationLedger,skillName:string){
  const observations=ledger.observations.filter(item=>item.skillName===skillName);
  const selectionCount=observations.length;
  const successCount=observations.filter(item=>item.outcome==='PASS').length;
  const validatorPassCount=observations.filter(item=>item.verificationPassed).length;
  const evidenceCompleteCount=observations.filter(item=>item.evidenceComplete).length;
  const handoffCount=observations.reduce((sum,item)=>sum+item.handoffCount,0);
  const regressionCount=observations.filter(item=>item.regressionDetected).length;
  const failureCount=observations.filter(item=>item.outcome==='FAIL').length;
  const avgLatencyMs=selectionCount
    ? observations.reduce((sum,item)=>sum+item.latencyMs,0)/selectionCount
    : 0;
  const domainCounts=new Map<string,number>();
  for(const item of observations) domainCounts.set(item.domain,(domainCounts.get(item.domain)??0)+1);
  const domain=[...domainCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??'general';

  return {
    skillName,
    domain,
    selectionCount,
    successCount,
    validatorPassCount,
    evidenceCompleteCount,
    handoffCount,
    regressionCount,
    failureCount,
    avgLatencyMs
  };
}

export const v80SkillHealthSchema=z.object({
  ledger:v80ObservationLedgerSchema,
  latencyBudgetMs:z.number().positive().default(10000),
  minConfidenceSamples:z.number().int().positive().default(20)
});

export function buildSkillHealthSnapshotV80(input:z.input<typeof v80SkillHealthSchema>){
  const parsed=v80SkillHealthSchema.parse(input);
  const observedSkills=[...new Set(parsed.ledger.observations.map(item=>item.skillName))].sort();
  const health=observedSkills.map(skillName=>{
    const metrics=aggregateSkill(parsed.ledger,skillName);
    const score=scoreSkillEffectivenessV80(v80EffectivenessSchema.parse({
      metrics,
      latencyBudgetMs:parsed.latencyBudgetMs,
      minConfidenceSamples:parsed.minConfidenceSamples
    }));
    return {...score,metrics};
  }).sort((a,b)=>b.score-a.score||b.sampleSize-a.sampleSize||a.skillName.localeCompare(b.skillName));

  return {
    release:'v80',
    skillCatalogCount:V75_SKILL_NAMES.length,
    observedSkillCount:observedSkills.length,
    observationCount:parsed.ledger.observations.length,
    coverageRatio:round(observedSkills.length/Math.max(1,V75_SKILL_NAMES.length)),
    health,
    unobservedSkillCount:Math.max(0,V75_SKILL_NAMES.length-observedSkills.length),
    persistence:'PORTABLE_HOST_CARRIED',
    executionClaim:false
  };
}

const lifecycleRecordSchema=z.record(z.string(),lifecycleSchema);

export const v80RouteFromLedgerSchema=z.object({
  query:z.string().min(1),
  ledger:v80ObservationLedgerSchema,
  evidenceReady:z.boolean().default(false),
  evidenceRefs:z.array(z.string().min(1)).default([]),
  agentHint:agentSchema.optional(),
  maxCandidates:z.number().int().min(1).max(20).default(8),
  lifecycleStates:lifecycleRecordSchema.default({}),
  ambiguityDelta:z.number().min(0).max(0.25).default(0.035),
  minimumAcceptableScore:z.number().min(0).max(1).default(0.45)
});

function inferRisk(name:string,domains:string[]):'low'|'medium'|'high'{
  const text=`${name} ${domains.join(' ')}`.toLowerCase();
  if(/security|secret|credential|authorization|authentication|production|deploy|release|privilege|identity/.test(text)) return 'high';
  if(/database|migration|rls|schema|backup|recovery|api|integration/.test(text)) return 'medium';
  return 'low';
}

export function routeWithOperationalHistoryV80(input:z.input<typeof v80RouteFromLedgerSchema>){
  const parsed=v80RouteFromLedgerSchema.parse(input);
  const semantic=rankSkillsV76(parsed.query,parsed.maxCandidates);
  if(!semantic.length){
    return {
      release:'v80',
      query:parsed.query,
      decision:'NO_SEMANTIC_CANDIDATE',
      selectedSkill:null,
      needsOrchestrator:true,
      candidates:[],
      executionClaim:false
    } as const;
  }

  const health=buildSkillHealthSnapshotV80({ledger:parsed.ledger});
  const healthBySkill=new Map(health.health.map(item=>[item.skillName,item]));
  const topSemantic=Math.max(1,semantic[0].score);
  const evidenceFit=parsed.evidenceReady ? 1 : parsed.evidenceRefs.length ? 0.7 : 0.35;

  const candidates=semantic.map(item=>{
    const observed=healthBySkill.get(item.name);
    const confidence=observed?.confidence??0;
    const measured=observed ? observed.score/100 : 0.5;
    const historicalQuality=clamp01((measured*confidence)+(0.5*(1-confidence)));
    const agentFit=!parsed.agentHint ? 0.7 : item.preferredAgents.includes(parsed.agentHint) ? 1 : 0.55;
    const lifecycle=parsed.lifecycleStates[item.name]??'STABLE';
    return {
      skillName:item.name,
      domain:item.domains[0]??'general',
      semanticScore:clamp01(item.score/topSemantic),
      evidenceFit,
      historicalQuality,
      agentFit,
      lifecycle,
      riskLevel:inferRisk(item.name,item.domains)
    };
  });

  const decision=rankAdaptiveSkillsV80(v80AdaptiveRoutingSchema.parse({
    query:parsed.query,
    candidates,
    ambiguityDelta:parsed.ambiguityDelta,
    minimumAcceptableScore:parsed.minimumAcceptableScore
  }));

  return {
    ...decision,
    release:'v80',
    semanticCandidates:semantic,
    operationalCoverage:{
      observedCandidateCount:candidates.filter(item=>healthBySkill.has(item.skillName)).length,
      candidateCount:candidates.length
    },
    evidenceContext:{
      evidenceReady:parsed.evidenceReady,
      evidenceRefCount:parsed.evidenceRefs.length
    },
    persistence:'PORTABLE_HOST_CARRIED',
    executionClaim:false
  };
}

export const v80LifecycleProposalSchema=z.object({
  ledger:v80ObservationLedgerSchema,
  lifecycleStates:lifecycleRecordSchema.default({}),
  qualityGates:z.record(z.string(),z.object({
    contractValid:z.boolean().default(true),
    schemaValid:z.boolean().default(true),
    securityPass:z.boolean().default(true),
    replacementReady:z.boolean().default(false)
  })).default({})
});

export function proposeLifecycleActionsV80(input:z.input<typeof v80LifecycleProposalSchema>){
  const parsed=v80LifecycleProposalSchema.parse(input);
  const observedSkills=[...new Set(parsed.ledger.observations.map(item=>item.skillName))].sort();
  const proposals=observedSkills.map(skillName=>{
    const metrics=aggregateSkill(parsed.ledger,skillName);
    const n=Math.max(1,metrics.selectionCount);
    const gates=parsed.qualityGates[skillName]??{
      contractValid:true,
      schemaValid:true,
      securityPass:true,
      replacementReady:false
    };
    const result=evaluateSkillLifecycleV80(v80LifecycleEvaluationSchema.parse({
      skillName,
      currentState:parsed.lifecycleStates[skillName]??'STABLE',
      contractValid:gates.contractValid,
      schemaValid:gates.schemaValid,
      securityPass:gates.securityPass,
      sampleSize:metrics.selectionCount,
      successRate:metrics.successCount/n,
      validatorPassRate:metrics.validatorPassCount/n,
      evidenceCompletenessRate:metrics.evidenceCompleteCount/n,
      regressionRate:metrics.regressionCount/n,
      criticalFailures:0,
      usageLast30d:metrics.selectionCount,
      replacementReady:gates.replacementReady
    }));
    return result;
  });

  return {
    release:'v80',
    observedSkills:observedSkills.length,
    proposedChanges:proposals.filter(item=>item.changed),
    retained:proposals.filter(item=>!item.changed),
    proposals,
    mutationApplied:false,
    requiresHostAuthorization:proposals.some(item=>item.changed),
    executionClaim:false
  };
}

export const v80ControlCenterSchema=z.object({
  ledger:v80ObservationLedgerSchema,
  lifecycleStates:lifecycleRecordSchema.default({}),
  latencyBudgetMs:z.number().positive().default(10000),
  minConfidenceSamples:z.number().int().positive().default(20)
});

export function buildSkillControlCenterSnapshotV80(input:z.input<typeof v80ControlCenterSchema>){
  const parsed=v80ControlCenterSchema.parse(input);
  const health=buildSkillHealthSnapshotV80({
    ledger:parsed.ledger,
    latencyBudgetMs:parsed.latencyBudgetMs,
    minConfidenceSamples:parsed.minConfidenceSamples
  });
  const lifecycle=proposeLifecycleActionsV80({
    ledger:parsed.ledger,
    lifecycleStates:parsed.lifecycleStates,
    qualityGates:{}
  });

  const agentObservations=parsed.ledger.observations.map(item=>({
    domain:item.domain,
    primaryAgent:item.primaryAgent,
    validatorAgent:item.validatorAgent,
    outcome:item.outcome,
    evidenceComplete:item.evidenceComplete,
    latencyMs:item.latencyMs,
    decisionQuality:item.outcome==='PASS' ? 1 : item.outcome==='BLOCKED' ? 0.7 : item.outcome==='UNVERIFIED' ? 0.4 : 0
  }));

  const agentMatrix=agentObservations.length
    ? buildAgentPerformanceMatrixV80(v80AgentMatrixSchema.parse({
        observations:agentObservations,
        latencyBudgetMs:parsed.latencyBudgetMs,
        minimumSamples:3
      }))
    : {
        release:'v80',
        observations:0,
        matrix:[],
        recommendations:[],
        governedHintsOnly:true,
        authorizationChangesApplied:false,
        executionClaim:false
      };

  const suppliedStates=Object.entries(parsed.lifecycleStates).filter(([name])=>knownSkills.has(name));
  const lifecycleCounts:Record<string,number>={DRAFT:0,SHADOW:0,CANARY:0,STABLE:V75_SKILL_NAMES.length,DEPRECATED:0,RETIRED:0};
  for(const [,state] of suppliedStates){
    lifecycleCounts.STABLE=Math.max(0,lifecycleCounts.STABLE-1);
    lifecycleCounts[state]=(lifecycleCounts[state]??0)+1;
  }

  const topSkills=health.health.slice(0,10).map(item=>({
    skillName:item.skillName,
    score:item.score,
    confidence:item.confidence,
    sampleSize:item.sampleSize
  }));
  const bottomSkills=[...health.health].sort((a,b)=>a.score-b.score||b.sampleSize-a.sampleSize).slice(0,10).map(item=>({
    skillName:item.skillName,
    score:item.score,
    confidence:item.confidence,
    sampleSize:item.sampleSize
  }));

  return {
    release:'v80',
    generatedFrom:'host-carried operational observations',
    catalog:{
      skills:V75_SKILL_NAMES.length,
      agents:V75_AGENT_IDS.length,
      observedSkills:health.observedSkillCount,
      observations:health.observationCount,
      coverageRatio:health.coverageRatio
    },
    lifecycle:lifecycleCounts,
    quality:{
      topSkills,
      bottomSkills,
      lifecycleChangeProposals:lifecycle.proposedChanges.length,
      unobservedSkills:health.unobservedSkillCount
    },
    agentPerformance:agentMatrix,
    lifecycleProposals:lifecycle.proposedChanges,
    persistence:{
      mode:'PORTABLE_HOST_CARRIED',
      durableStoreConfigured:false,
      note:'Durable persistence requires a separately authorized host adapter.'
    },
    authorizationChangesApplied:false,
    skillMutationsApplied:false,
    executionClaim:false
  };
}

export function auditOperationalLearningV80(){
  const known=V75_SKILL_NAMES[0];
  const alternate=V75_SKILL_NAMES[1]??known;
  let ledger=createObservationLedgerV80();

  for(let i=0;i<6;i++){
    const recorded=recordSkillObservationV80({
      ledger,
      observation:{
        id:`audit-good-${i}`,
        skillName:known,
        domain:'testing',
        primaryAgent:'qa',
        validatorAgent:'qa',
        outcome:'PASS',
        evidenceComplete:true,
        verificationPassed:true,
        regressionDetected:false,
        handoffCount:0,
        latencyMs:1000,
        timestampEpoch:i
      }
    });
    if(recorded.recorded) ledger=recorded.ledger;
  }

  const unknown=recordSkillObservationV80({
    ledger,
    observation:{
      id:'audit-unknown',
      skillName:'not-a-real-krom-skill',
      domain:'testing',
      primaryAgent:'qa',
      validatorAgent:'qa',
      outcome:'PASS',
      evidenceComplete:true,
      verificationPassed:true
    }
  });

  const duplicate=recordSkillObservationV80({
    ledger,
    observation:{
      id:'audit-good-0',
      skillName:known,
      domain:'testing',
      primaryAgent:'qa',
      validatorAgent:'qa',
      outcome:'PASS',
      evidenceComplete:true,
      verificationPassed:true
    }
  });

  const health=buildSkillHealthSnapshotV80({ledger,minConfidenceSamples:3});
  const control=buildSkillControlCenterSnapshotV80({ledger,minConfidenceSamples:3});
  const mission=recordMissionOutcomeV80({
    ledger,
    missionDigest:'b'.repeat(64),
    skillNames:[alternate],
    domain:'database',
    primaryAgent:'database',
    validatorAgent:'qa',
    outcome:'SUCCEEDED',
    evidenceRefs:['test:1'],
    verificationPassed:true,
    executionAuthorized:true
  });

  const checks={
    recordsKnownSkill:ledger.observations.length===6,
    rejectsUnknownSkill:unknown.status==='REJECTED_UNKNOWN_SKILL'&&!unknown.recorded,
    rejectsDuplicateObservation:duplicate.status==='DUPLICATE_OBSERVATION'&&!duplicate.recorded,
    derivesMeasuredHealth:health.health[0]?.skillName===known&&health.health[0].status==='MEASURED',
    recordsMissionOutcome:mission.recorded===1&&mission.normalizedOutcome==='PASS',
    controlCenterReportsCatalog:control.catalog.skills===V75_SKILL_NAMES.length&&control.catalog.agents===11,
    portablePersistenceOnly:control.persistence.mode==='PORTABLE_HOST_CARRIED'&&!control.persistence.durableStoreConfigured,
    noAutomaticMutation:!control.authorizationChangesApplied&&!control.skillMutationsApplied
  };
  const failures=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);

  return {
    release:'v80',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    observedSkill:known,
    catalogSkills:V75_SKILL_NAMES.length,
    agents:V75_AGENT_IDS.length,
    executionClaim:false
  };
}
