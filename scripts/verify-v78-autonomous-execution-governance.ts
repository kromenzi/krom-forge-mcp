import { evaluateAutonomousExecutionV78, auditAutonomousExecutionV78 } from '../src/v78-autonomous-execution-governance';

const audit=auditAutonomousExecutionV78();
if(audit.status!=='PASS') throw new Error(`v78 governance audit failed: ${JSON.stringify(audit)}`);

const blocked=evaluateAutonomousExecutionV78({
  objective:'deploy production without approval',
  autonomyMode:'BOUNDED_AUTONOMOUS',
  hostAuthorized:true,
  approvalRequired:true,
  approved:false,
  budgetUnits:20,
  estimatedCost:5,
  confidence:0.9,
  minimumConfidence:0.65,
  leaseOwner:'release-auditor',
  leaseActive:true,
  competingOwners:[],
  highRisk:true,
  rollbackAvailable:true
});
if(blocked.status!=='BLOCKED'||blocked.dispatchAllowed) throw new Error('v78 approval gate failed');

console.log(JSON.stringify({
  release:'v78',
  status:'PASS',
  autonomousExecutionGovernance:true,
  budgetAwareExecution:true,
  confidenceGate:true,
  executionLease:true,
  ownershipConflictDetection:true,
  rollbackGate:true,
  executionClaim:false
},null,2));
