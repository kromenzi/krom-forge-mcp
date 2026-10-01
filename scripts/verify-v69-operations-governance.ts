import assert from 'node:assert/strict';
import { v69OperationsGovernanceSchema } from '../src/v69-schema';
import { assessChangeRiskV69, evaluateApprovalGateV69, evaluatePolicyEnforcementV69, buildRolloutPlanV69, buildRollbackPlanV69, evaluateSloHealthV69, calculateErrorBudgetV69, assessDependencyHealthV69, evaluateCanaryPromotionV69, scoreReleaseConfidenceV69, buildIncidentLearningV69, buildOperationalDecisionPacketV69 } from '../src/v69-engine';

const i=v69OperationsGovernanceSchema.parse({
  objective:'v69 operations governance benchmark',
  evidence:[
    {id:'e-change',verified:true,fresh:true,confidence:95},
    {id:'e-service',verified:true,fresh:true,confidence:98},
    {id:'e-approval',verified:true,fresh:true,confidence:99},
    {id:'e-canary',verified:true,fresh:true,confidence:97},
    {id:'e-incident',verified:true,fresh:true,confidence:96}
  ],
  changes:[{id:'chg-1',services:['api'],risk:25,reversible:true,evidenceRefs:['e-change']}],
  services:[
    {name:'db',criticality:95,healthy:true,availability:99.99,sloTarget:99.9,evidenceRefs:['e-service']},
    {name:'api',criticality:90,healthy:true,dependencies:['db'],availability:99.98,sloTarget:99.9,evidenceRefs:['e-service']}
  ],
  approvals:[{id:'a1',scope:'api',approved:true,approver:'ops',evidenceRefs:['e-approval']}],
  policies:[{id:'p1',scope:'api',effect:'ALLOW',minEvidenceConfidence:60}],
  canaries:[{service:'api',successRate:99.9,errorRate:0.1,latencyMs:120,sampleSize:500,evidenceRefs:['e-canary']}],
  incidents:[{id:'inc-old',active:false,severity:70,services:['api'],rootCause:'bad config',correctiveActions:['config validation'],evidenceRefs:['e-incident']}]
});

assert.equal(assessChangeRiskV69(i).changes.length,1);
assert.equal(evaluateApprovalGateV69(i).status,'PASS');
assert.equal(evaluatePolicyEnforcementV69(i).pass,true);
assert.equal(buildRolloutPlanV69(i).status,'PLANNED');
assert.equal(buildRollbackPlanV69(i).fullyReversible,true);
assert.equal(evaluateSloHealthV69(i).pass,true);
assert.equal(calculateErrorBudgetV69(i).pass,true);
assert.equal(assessDependencyHealthV69(i).pass,true);
assert.equal(evaluateCanaryPromotionV69(i).pass,true);
assert.equal(scoreReleaseConfidenceV69(i).status,'READY');
assert.equal(buildIncidentLearningV69(i).coverage,100);
assert.equal(buildOperationalDecisionPacketV69(i).execute,false);

const noEvidence=v69OperationsGovernanceSchema.parse({objective:'no evidence',changes:[{id:'chg',services:['api'],risk:10}],services:[{name:'api',availability:100}]});
assert.equal(evaluateSloHealthV69(noEvidence).pass,false);
assert.equal(calculateErrorBudgetV69(noEvidence).pass,false);
assert.equal(scoreReleaseConfidenceV69(noEvidence).status,'BLOCKED');

const highRiskNoCanary=v69OperationsGovernanceSchema.parse({...i,changes:[{id:'chg-risk',services:['api'],risk:95,reversible:true,evidenceRefs:['e-change']}],approvals:[{id:'a-risk',scope:'chg-risk',approved:true,approver:'ops',evidenceRefs:['e-approval']}],canaries:[]});
assert.equal(scoreReleaseConfidenceV69(highRiskNoCanary).blockers.includes('HIGH_RISK_CANARY_REQUIRED'),true);
assert.equal(scoreReleaseConfidenceV69(highRiskNoCanary).status,'BLOCKED');

const criticalIncident=v69OperationsGovernanceSchema.parse({...i,incidents:[{id:'inc-live',active:true,severity:95,services:['api'],evidenceRefs:['e-incident']}]});
assert.equal(scoreReleaseConfidenceV69(criticalIncident).blockers.includes('CRITICAL_ACTIVE_INCIDENT'),true);

const noRollback=v69OperationsGovernanceSchema.parse({...i,changes:[{id:'chg-nr',services:['api'],risk:95,reversible:false,evidenceRefs:['e-change']}],approvals:[{id:'a-nr',scope:'chg-nr',approved:true,approver:'ops',evidenceRefs:['e-approval']}]});
assert.equal(scoreReleaseConfidenceV69(noRollback).blockers.includes('HIGH_RISK_ROLLBACK_UNAVAILABLE'),true);

const badCanary=v69OperationsGovernanceSchema.parse({...i,canaries:[{service:'api',successRate:80,errorRate:20,latencyMs:5000,sampleSize:10,evidenceRefs:['e-canary']}]});
assert.equal(evaluateCanaryPromotionV69(badCanary).pass,false);

const denied=v69OperationsGovernanceSchema.parse({...i,policies:[{id:'deny',scope:'api',effect:'DENY'}]});
assert.equal(evaluatePolicyEnforcementV69(denied).pass,false);
assert.equal(buildRolloutPlanV69(denied).status,'BLOCKED');

console.log(JSON.stringify({status:'PASS',changeRisk:true,approvalGate:true,policyEnforcement:true,rollout:true,rollback:true,sloHealth:true,errorBudget:true,dependencyHealth:true,canaryPromotion:true,releaseConfidence:true,highRiskCanaryGuard:true,criticalIncidentGuard:true,rollbackGuard:true,incidentLearning:true,decisionPacket:true},null,2));
