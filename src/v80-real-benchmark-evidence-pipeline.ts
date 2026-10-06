import { createHash } from 'node:crypto';
import { z } from 'zod';
import { V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import {
  V80_PROMOTED_V42_SKILL_NAMES,
  V80_PROMOTED_V42_SKILL_COUNT
} from './v80-promoted-v42-skill-seeds';
import {
  evaluateV42ShadowBenchmarkV80,
  type V80ShadowBenchmarkCase
} from './v80-shadow-benchmark-runner';

const promotedNameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);
const shadowByName=new Map<string,(typeof V80_V42_SHADOW_SEEDS)[number]>(
  V80_V42_SHADOW_SEEDS
    .filter(seed=>!promotedNameSet.has(seed.n))
    .map(seed=>[seed.n,seed] as const)
);

function sha256(value:unknown){
  return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
}

function canonicalCaseIdentity(input:{
  benchmarkId:string;
  caseId:string;
  skillName:string;
  skillInstructionHash:string;
  primaryAgent:string;
  validatorAgent:string;
  scenarioId:string;
  scenarioRef:string;
  expectedEvidenceKinds:string[];
  latencyBudgetMs:number;
}){
  return {
    benchmarkId:input.benchmarkId,
    caseId:input.caseId,
    skillName:input.skillName,
    skillInstructionHash:input.skillInstructionHash,
    primaryAgent:input.primaryAgent,
    validatorAgent:input.validatorAgent,
    scenarioId:input.scenarioId,
    scenarioRef:input.scenarioRef,
    expectedEvidenceKinds:[...input.expectedEvidenceKinds].sort(),
    latencyBudgetMs:input.latencyBudgetMs
  };
}

export const v80RealBenchmarkManifestCaseRequestSchema=z.object({
  caseId:z.string().min(1),
  skillName:z.string().min(1),
  scenarioId:z.string().min(1),
  scenarioRef:z.string().min(1),
  expectedEvidenceKinds:z.array(z.string().min(1)).min(1).max(25),
  latencyBudgetMs:z.number().positive().default(10000)
});

export const v80BuildRealBenchmarkManifestSchema=z.object({
  benchmarkId:z.string().min(1),
  cases:z.array(v80RealBenchmarkManifestCaseRequestSchema).min(1).max(20000)
});

export const v80RealBenchmarkManifestCaseSchema=z.object({
  benchmarkId:z.string().min(1),
  caseId:z.string().min(1),
  skillName:z.string().min(1),
  skillInstructionHash:z.string().regex(/^[a-f0-9]{64}$/),
  primaryAgent:z.string().min(1),
  validatorAgent:z.string().min(1),
  scenarioId:z.string().min(1),
  scenarioRef:z.string().min(1),
  expectedEvidenceKinds:z.array(z.string().min(1)).min(1).max(25),
  latencyBudgetMs:z.number().positive(),
  caseDigest:z.string().regex(/^[a-f0-9]{64}$/)
});

export const v80RealBenchmarkManifestSchema=z.object({
  release:z.literal('v80'),
  phase:z.literal('real-benchmark-evidence-pipeline'),
  benchmarkId:z.string().min(1),
  status:z.literal('READY_FOR_HOST_EXECUTION'),
  createdFrom:z.literal('V42_SHADOW_CANDIDATES'),
  stableCatalogCount:z.number().int().min(1465),
  promotedV42Count:z.number().int().min(0).max(500),
  caseCount:z.number().int().min(1),
  cases:z.array(v80RealBenchmarkManifestCaseSchema).min(1).max(20000),
  manifestDigest:z.string().regex(/^[a-f0-9]{64}$/),
  executionPerformed:z.literal(false),
  repositoryMutationApplied:z.literal(false),
  runtimeCatalogMutationApplied:z.literal(false),
  deploymentMutationApplied:z.literal(false)
});

export function buildV42RealBenchmarkManifestV80(input:z.input<typeof v80BuildRealBenchmarkManifestSchema>){
  const parsed=v80BuildRealBenchmarkManifestSchema.parse(input);
  const duplicateCaseIds=[...new Set(
    parsed.cases.map(item=>item.caseId).filter((id,index,items)=>items.indexOf(id)!==index)
  )].sort();
  const unknownSkills=[...new Set(
    parsed.cases.map(item=>item.skillName)
      .filter(name=>!V80_V42_SHADOW_SEEDS.some(seed=>seed.n===name))
  )].sort();
  const alreadyPromotedSkills=[...new Set(
    parsed.cases.map(item=>item.skillName).filter(name=>promotedNameSet.has(name))
  )].sort();

  if(duplicateCaseIds.length){
    throw new Error('DUPLICATE_BENCHMARK_CASE_IDS:'+duplicateCaseIds.join(','));
  }
  if(unknownSkills.length){
    throw new Error('UNKNOWN_V42_CANDIDATES:'+unknownSkills.join(','));
  }
  if(alreadyPromotedSkills.length){
    throw new Error('ALREADY_PROMOTED_CANDIDATES:'+alreadyPromotedSkills.join(','));
  }

  const cases=parsed.cases.map(request=>{
    const seed=shadowByName.get(request.skillName);
    if(!seed) throw new Error('SHADOW_CANDIDATE_NOT_AVAILABLE:'+request.skillName);
    const canonical=canonicalCaseIdentity({
      benchmarkId:parsed.benchmarkId,
      caseId:request.caseId,
      skillName:request.skillName,
      skillInstructionHash:seed.h,
      primaryAgent:seed.p,
      validatorAgent:seed.v,
      scenarioId:request.scenarioId,
      scenarioRef:request.scenarioRef,
      expectedEvidenceKinds:request.expectedEvidenceKinds,
      latencyBudgetMs:request.latencyBudgetMs
    });
    return {
      ...canonical,
      caseDigest:sha256(canonical)
    };
  });

  const manifestDigest=sha256({
    benchmarkId:parsed.benchmarkId,
    cases:cases.map(item=>item.caseDigest)
  });

  return {
    release:'v80',
    phase:'real-benchmark-evidence-pipeline',
    benchmarkId:parsed.benchmarkId,
    status:'READY_FOR_HOST_EXECUTION',
    createdFrom:'V42_SHADOW_CANDIDATES',
    stableCatalogCount:V75_SKILL_NAMES.length,
    promotedV42Count:V80_PROMOTED_V42_SKILL_COUNT,
    caseCount:cases.length,
    cases,
    manifestDigest,
    executionPerformed:false,
    repositoryMutationApplied:false,
    runtimeCatalogMutationApplied:false,
    deploymentMutationApplied:false
  } as const;
}

export const v80HostBenchmarkReceiptSchema=z.object({
  benchmarkId:z.string().min(1),
  caseId:z.string().min(1),
  skillName:z.string().min(1),
  manifestCaseDigest:z.string().regex(/^[a-f0-9]{64}$/),
  hostExecutionId:z.string().min(1),
  evidenceOrigin:z.enum(['HOST_EXECUTION','FIXTURE','SELF_ASSERTED','DECLARED_ONLY']),
  executionPerformed:z.boolean(),
  sourceRef:z.string().min(1),
  evidenceRefs:z.array(z.string().min(1)).min(1).max(100),
  evidenceKinds:z.array(z.string().min(1)).min(1).max(25),
  outcome:z.enum(['PASS','FAIL','BLOCKED']),
  validatorPass:z.boolean(),
  securityPass:z.boolean(),
  unsupportedClaim:z.boolean().default(false),
  regressionDetected:z.boolean().default(false),
  latencyMs:z.number().min(0),
  semanticSimilarity:z.number().min(0).max(1).default(0),
  proceduralSimilarity:z.number().min(0).max(1).default(0),
  specializationDistinct:z.boolean().default(true),
  hostAttestation:z.string().min(1)
});

export const v80VerifyRealBenchmarkReceiptsSchema=z.object({
  manifest:v80RealBenchmarkManifestSchema,
  receipts:z.array(v80HostBenchmarkReceiptSchema).min(1).max(20000),
  requireAllManifestCases:z.boolean().default(false)
});

export function verifyV42RealBenchmarkManifestIntegrityV80(input:z.input<typeof v80RealBenchmarkManifestSchema>){
  const manifest=v80RealBenchmarkManifestSchema.parse(input);
  // Rebuild from authoritative shadow seeds; caller-supplied digests are not proof.
  const manifestFailures:string[]=[];
  try {
    const rebuilt=buildV42RealBenchmarkManifestV80({
      benchmarkId:manifest.benchmarkId,
      cases:manifest.cases.map(item=>({
        caseId:item.caseId, skillName:item.skillName,
        scenarioId:item.scenarioId, scenarioRef:item.scenarioRef,
        expectedEvidenceKinds:item.expectedEvidenceKinds,
        latencyBudgetMs:item.latencyBudgetMs
      }))
    });
    if(manifest.caseCount!==rebuilt.caseCount) manifestFailures.push('MANIFEST_CASE_COUNT_MISMATCH');
    if(manifest.manifestDigest!==rebuilt.manifestDigest) manifestFailures.push('MANIFEST_DIGEST_MISMATCH');
    if(manifest.stableCatalogCount!==rebuilt.stableCatalogCount||
       manifest.promotedV42Count!==rebuilt.promotedV42Count) manifestFailures.push('STALE_CATALOG_BINDING');
    manifest.cases.forEach((item,index)=>{
      const expected=rebuilt.cases[index];
      if(item.caseDigest!==expected.caseDigest||
         sha256(canonicalCaseIdentity(item))!==expected.caseDigest) {
        manifestFailures.push('MANIFEST_CASE_IDENTITY_MISMATCH');
      }
    });
  } catch {
    manifestFailures.push('INVALID_MANIFEST_CANDIDATES');
  }
  return [...new Set(manifestFailures)];
}

export function verifyV42RealBenchmarkReceiptsV80(input:z.input<typeof v80VerifyRealBenchmarkReceiptsSchema>){
  const parsed=v80VerifyRealBenchmarkReceiptsSchema.parse(input);
  const manifestFailures=verifyV42RealBenchmarkManifestIntegrityV80(parsed.manifest);
  const manifestByCaseId=new Map(parsed.manifest.cases.map(item=>[item.caseId,item]));
  const duplicateReceiptCaseIds=[...new Set(
    parsed.receipts.map(item=>item.caseId).filter((id,index,items)=>items.indexOf(id)!==index)
  )].sort();

  const evaluations=parsed.receipts.map(receipt=>{
    const expected=manifestByCaseId.get(receipt.caseId);
    const failures:string[]=[...manifestFailures];

    if(!expected) failures.push('CASE_NOT_IN_MANIFEST');
    if(receipt.benchmarkId!==parsed.manifest.benchmarkId) failures.push('BENCHMARK_ID_MISMATCH');
    if(expected&&receipt.skillName!==expected.skillName) failures.push('SKILL_NAME_MISMATCH');
    if(expected&&receipt.manifestCaseDigest!==expected.caseDigest) failures.push('MANIFEST_CASE_DIGEST_MISMATCH');
    if(!receipt.executionPerformed) failures.push('EXECUTION_NOT_PERFORMED');
    if(receipt.evidenceOrigin!=='HOST_EXECUTION') failures.push('NON_HOST_EXECUTION_EVIDENCE');
    if(!receipt.hostExecutionId.trim()) failures.push('HOST_EXECUTION_ID_REQUIRED');
    if(!receipt.sourceRef.trim()) failures.push('SOURCE_REF_REQUIRED');
    if(!receipt.hostAttestation.trim()) failures.push('HOST_ATTESTATION_REQUIRED');
    if(!receipt.evidenceRefs.length) failures.push('EVIDENCE_REFS_REQUIRED');

    const missingEvidenceKinds=expected
      ? expected.expectedEvidenceKinds.filter(kind=>!receipt.evidenceKinds.includes(kind))
      : [];
    if(missingEvidenceKinds.length) failures.push('MISSING_EXPECTED_EVIDENCE_KINDS');

    const verified=failures.length===0;
    const receiptDigest=sha256({
      benchmarkId:receipt.benchmarkId,
      caseId:receipt.caseId,
      skillName:receipt.skillName,
      manifestCaseDigest:receipt.manifestCaseDigest,
      hostExecutionId:receipt.hostExecutionId,
      evidenceOrigin:receipt.evidenceOrigin,
      executionPerformed:receipt.executionPerformed,
      sourceRef:receipt.sourceRef,
      evidenceRefs:[...receipt.evidenceRefs].sort(),
      evidenceKinds:[...receipt.evidenceKinds].sort(),
      outcome:receipt.outcome,
      validatorPass:receipt.validatorPass,
      securityPass:receipt.securityPass,
      unsupportedClaim:receipt.unsupportedClaim,
      regressionDetected:receipt.regressionDetected,
      latencyMs:receipt.latencyMs,
      semanticSimilarity:receipt.semanticSimilarity,
      proceduralSimilarity:receipt.proceduralSimilarity,
      specializationDistinct:receipt.specializationDistinct,
      hostAttestation:receipt.hostAttestation
    });

    return {
      caseId:receipt.caseId,
      skillName:receipt.skillName,
      verified,
      failures,
      missingEvidenceKinds,
      receiptDigest,
      receipt
    };
  });

  const verified=evaluations.filter(item=>item.verified);
  const rejected=evaluations.filter(item=>!item.verified);
  const verifiedCaseIds=new Set(verified.map(item=>item.caseId));
  const missingManifestCases=parsed.manifest.cases
    .filter(item=>!verifiedCaseIds.has(item.caseId))
    .map(item=>item.caseId);

  const status=
    manifestFailures.length||duplicateReceiptCaseIds.length
      ? 'BLOCKED'
      : parsed.requireAllManifestCases&&missingManifestCases.length
        ? 'INCOMPLETE'
        : rejected.length
          ? 'CONDITIONAL'
          : 'PASS';

  return {
    release:'v80',
    phase:'real-benchmark-evidence-pipeline',
    status,
    benchmarkId:parsed.manifest.benchmarkId,
    manifestDigest:parsed.manifest.manifestDigest,
    manifestFailures:[...new Set(manifestFailures)],
    submittedReceipts:parsed.receipts.length,
    verifiedReceipts:verified.length,
    rejectedReceipts:rejected.length,
    duplicateReceiptCaseIds,
    missingManifestCases,
    evaluations,
    verifiedReceiptDigests:verified.map(item=>item.receiptDigest),
    realHostExecutionEvidencePresent:verified.length>0,
    externalExecutionPerformedByPipeline:false,
    repositoryMutationApplied:false,
    runtimeCatalogMutationApplied:false,
    deploymentMutationApplied:false,
    executionClaim:false
  } as const;
}

export const v80BuildRealBenchmarkEvidenceSchema=z.object({
  manifest:v80RealBenchmarkManifestSchema,
  receipts:z.array(v80HostBenchmarkReceiptSchema).min(1).max(20000),
  minimumCasesPerSkill:z.number().int().min(1).default(20),
  canaryBenchmarkThreshold:z.number().min(0.5).max(1).default(0.90),
  maxCanaryCandidates:z.number().int().min(1).max(100).default(25),
  maxCanaryPerArea:z.number().int().min(1).max(10).default(2),
  similarityReviewThreshold:z.number().min(0.75).max(0.99).default(0.90),
  maxRegressionRate:z.number().min(0).max(0.5).default(0.05)
});

export function buildV42RealBenchmarkEvidenceV80(input:z.input<typeof v80BuildRealBenchmarkEvidenceSchema>){
  const parsed=v80BuildRealBenchmarkEvidenceSchema.parse(input);
  const verification=verifyV42RealBenchmarkReceiptsV80({
    manifest:parsed.manifest,
    receipts:parsed.receipts,
    requireAllManifestCases:false
  });

  const verified=verification.status==='BLOCKED' ? [] : verification.evaluations.filter(item=>item.verified);
  const manifestByCaseId=new Map(parsed.manifest.cases.map(item=>[item.caseId,item]));

  const benchmarkCases:V80ShadowBenchmarkCase[]=verified.map(item=>{
    const receipt=item.receipt;
    const expected=manifestByCaseId.get(receipt.caseId)!;
    return {
      caseId:receipt.caseId,
      skillName:receipt.skillName,
      outcome:receipt.outcome,
      evidenceRefs:[...receipt.evidenceRefs, 'host-execution:'+receipt.hostExecutionId, 'receipt-digest:'+item.receiptDigest],
      validatorPass:receipt.validatorPass,
      securityPass:receipt.securityPass,
      unsupportedClaim:receipt.unsupportedClaim,
      regressionDetected:receipt.regressionDetected,
      latencyMs:receipt.latencyMs,
      latencyBudgetMs:expected.latencyBudgetMs,
      semanticSimilarity:receipt.semanticSimilarity,
      proceduralSimilarity:receipt.proceduralSimilarity,
      specializationDistinct:receipt.specializationDistinct,
      sourceRef:receipt.sourceRef
    };
  });

  const benchmark=benchmarkCases.length
    ? evaluateV42ShadowBenchmarkV80({
        benchmarkId:parsed.manifest.benchmarkId,
        results:benchmarkCases,
        minimumCasesPerSkill:parsed.minimumCasesPerSkill,
        canaryBenchmarkThreshold:parsed.canaryBenchmarkThreshold,
        maxCanaryCandidates:parsed.maxCanaryCandidates,
        maxCanaryPerArea:parsed.maxCanaryPerArea,
        similarityReviewThreshold:parsed.similarityReviewThreshold,
        maxRegressionRate:parsed.maxRegressionRate
      })
    : null;

  return {
    release:'v80',
    phase:'real-benchmark-evidence-pipeline',
    status:
      verification.status==='BLOCKED'
        ? 'BLOCKED'
        : verified.length===0
          ? 'NO_VERIFIED_HOST_EVIDENCE'
          : verification.rejectedReceipts
            ? 'CONDITIONAL'
            : 'PASS',
    benchmarkId:parsed.manifest.benchmarkId,
    manifestDigest:parsed.manifest.manifestDigest,
    receiptVerification:{
      status:verification.status,
      verifiedReceipts:verification.verifiedReceipts,
      rejectedReceipts:verification.rejectedReceipts,
      missingManifestCases:verification.missingManifestCases
    },
    phase5BenchmarkInput:{
      caseCount:benchmarkCases.length,
      cases:benchmarkCases
    },
    benchmark,
    promotionReadyCandidates:benchmark?.canaryRecommendation.selected??[],
    promotionApplied:false,
    stableCatalogCount:V75_SKILL_NAMES.length,
    promotedV42Count:V80_PROMOTED_V42_SKILL_COUNT,
    externalExecutionPerformedByPipeline:false,
    repositoryMutationApplied:false,
    runtimeCatalogMutationApplied:false,
    deploymentMutationApplied:false,
    executionClaim:false
  } as const;
}

export function auditV42RealBenchmarkEvidencePipelineV80(){
  const candidate=V80_V42_SHADOW_SEEDS.find(seed=>!promotedNameSet.has(seed.n));
  if(!candidate){
    return {
      release:'v80',
      phase:'real-benchmark-evidence-pipeline',
      status:'PASS',
      checks:{noRemainingShadowCandidates:true},
      failures:[],
      executionClaim:false
    } as const;
  }

  const buildInput={
    benchmarkId:'v80-phase9-audit',
    cases:[{
      caseId:'audit-case-1',
      skillName:candidate.n,
      scenarioId:'audit-scenario-1',
      scenarioRef:'audit:scenario:1',
      expectedEvidenceKinds:['result','validator'],
      latencyBudgetMs:5000
    }]
  };
  const manifest=buildV42RealBenchmarkManifestV80(buildInput);
  const manifestAgain=buildV42RealBenchmarkManifestV80(buildInput);
  const manifestCase=manifest.cases[0];

  const validReceipt={
    benchmarkId:manifest.benchmarkId,
    caseId:manifestCase.caseId,
    skillName:manifestCase.skillName,
    manifestCaseDigest:manifestCase.caseDigest,
    hostExecutionId:'host-run-001',
    evidenceOrigin:'HOST_EXECUTION' as const,
    executionPerformed:true,
    sourceRef:'host://audit/run/001',
    evidenceRefs:['evidence:result:001','evidence:validator:001'],
    evidenceKinds:['result','validator'],
    outcome:'PASS' as const,
    validatorPass:true,
    securityPass:true,
    unsupportedClaim:false,
    regressionDetected:false,
    latencyMs:800,
    semanticSimilarity:0.55,
    proceduralSimilarity:0.62,
    specializationDistinct:true,
    hostAttestation:'verified-host-execution'
  };

  const valid=verifyV42RealBenchmarkReceiptsV80({
    manifest,
    receipts:[validReceipt],
    requireAllManifestCases:true
  });
  const tampered=verifyV42RealBenchmarkReceiptsV80({
    manifest,
    receipts:[{...validReceipt,manifestCaseDigest:'0'.repeat(64)}]
  });
  const fixture=verifyV42RealBenchmarkReceiptsV80({
    manifest,
    receipts:[{...validReceipt,evidenceOrigin:'FIXTURE' as const}]
  });
  const missingEvidence=verifyV42RealBenchmarkReceiptsV80({
    manifest,
    receipts:[{...validReceipt,evidenceKinds:['result']}]
  });
  const evidence=buildV42RealBenchmarkEvidenceV80({
    manifest,
    receipts:[validReceipt],
    minimumCasesPerSkill:1,
    canaryBenchmarkThreshold:0.50,
    maxCanaryCandidates:5,
    maxCanaryPerArea:5
  });

  const checks={
    deterministicManifest:manifest.manifestDigest===manifestAgain.manifestDigest,
    caseBoundToSkillHash:manifestCase.skillInstructionHash===candidate.h,
    caseBoundToAgents:manifestCase.primaryAgent===candidate.p&&manifestCase.validatorAgent===candidate.v,
    validHostReceiptAccepted:valid.status==='PASS'&&valid.verifiedReceipts===1,
    tamperedDigestRejected:tampered.rejectedReceipts===1&&tampered.evaluations[0]?.failures.includes('MANIFEST_CASE_DIGEST_MISMATCH'),
    fixtureEvidenceRejected:fixture.rejectedReceipts===1&&fixture.evaluations[0]?.failures.includes('NON_HOST_EXECUTION_EVIDENCE'),
    missingEvidenceKindRejected:missingEvidence.rejectedReceipts===1&&missingEvidence.evaluations[0]?.failures.includes('MISSING_EXPECTED_EVIDENCE_KINDS'),
    verifiedReceiptFeedsPhase5:evidence.phase5BenchmarkInput.caseCount===1&&Boolean(evidence.benchmark),
    noExternalExecutionFabricated:!manifest.executionPerformed&&!valid.externalExecutionPerformedByPipeline&&!evidence.externalExecutionPerformedByPipeline,
    noPromotionOrMutation:!evidence.promotionApplied&&!evidence.repositoryMutationApplied&&!evidence.runtimeCatalogMutationApplied&&!evidence.deploymentMutationApplied,
    realStableCatalogPreserved:V75_SKILL_NAMES.length===1465+V80_PROMOTED_V42_SKILL_COUNT
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);

  return {
    release:'v80',
    phase:'real-benchmark-evidence-pipeline',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    executionClaim:false
  } as const;
}
