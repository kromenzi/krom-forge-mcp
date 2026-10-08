import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { buildV42RealBenchmarkManifestV80 } from '../src/v80-real-benchmark-evidence-pipeline';
import { getVerifiedResumeStateV80 } from '../src/v80-host-resume';

const sourceCommit='a'.repeat(40);
const manifest=buildV42RealBenchmarkManifestV80({benchmarkId:'resume-contract',cases:[{
  caseId:'case-a',skillName:V80_V42_SHADOW_SEEDS[0].n,scenarioId:'real-case',scenarioRef:'repo:benchmarks/codex-host/scenarios.md#repair-claims',expectedEvidenceKinds:['result','validator','security'],latencyBudgetMs:1000
}]});
const contentByKind={result:'result bytes',validator:'review bytes',security:'security bytes'};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
function checkpoint(){
  const artifacts=Object.entries(contentByKind).map(([kind,content])=>({caseId:'case-a',kind,content,sha256:digest(content)}));
  const receipt={benchmarkId:manifest.benchmarkId,caseId:'case-a',skillName:manifest.cases[0].skillName,manifestCaseDigest:manifest.cases[0].caseDigest,
    hostExecutionId:'host-case-a',evidenceOrigin:'HOST_EXECUTION' as const,executionPerformed:true,sourceRef:'git:'+sourceCommit,
    evidenceRefs:artifacts.map(a=>'sha256:'+a.sha256),evidenceKinds:artifacts.map(a=>a.kind),outcome:'PASS' as const,validatorPass:true,securityPass:true,
    unsupportedClaim:false,regressionDetected:false,latencyMs:200,semanticSimilarity:1,proceduralSimilarity:1,specializationDistinct:false,
    hostAttestation:'host-adapter:host-case-a',instructionHashContract:'krom-instruction-raw-utf8-v1'};
  return {resumeVersion:1,campaignDigest:manifest.manifestDigest,sourceCommit,receipts:[receipt],artifacts};
}

test('resume accepts only artifact-bound receipts for the exact source and campaign',()=>{
  const state=getVerifiedResumeStateV80({checkpoint:checkpoint(),manifest,sourceCommit});
  assert.deepEqual([...state.completedCaseIds],['case-a']);
  assert.equal(state.receipts.length,1);
  assert.equal(state.artifacts.length,3);
});
test('resume rejects checkpoints for another source commit',()=>{
  const saved=checkpoint(); saved.sourceCommit='b'.repeat(40);
  assert.throws(()=>getVerifiedResumeStateV80({checkpoint:saved,manifest,sourceCommit}),/RESUME_SOURCE_COMMIT_MISMATCH/);
});
test('resume rejects checkpoints for another campaign even if case IDs overlap',()=>{
  const saved=checkpoint(); saved.campaignDigest='f'.repeat(64);
  assert.throws(()=>getVerifiedResumeStateV80({checkpoint:saved,manifest,sourceCommit}),/RESUME_CAMPAIGN_MISMATCH/);
});
test('resume rejects modified artifact bytes and cannot skip the case',()=>{
  const saved=checkpoint(); saved.artifacts[0].content='modified bytes';
  assert.throws(()=>getVerifiedResumeStateV80({checkpoint:saved,manifest,sourceCommit}),/RESUME_ARTIFACT_DIGEST_MISMATCH/);
});
test('resume rejects bare PASS receipts without evidence artifact bytes',()=>{
  const saved=checkpoint(); saved.artifacts=[];
  assert.throws(()=>getVerifiedResumeStateV80({checkpoint:saved,manifest,sourceCommit}),/RESUME_ARTIFACT_COVERAGE_MISMATCH/);
});
