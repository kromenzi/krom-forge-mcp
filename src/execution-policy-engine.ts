import type { z } from 'zod';
import {
  executionActionSchema, executionPolicySchema, approvalRecordSchema
} from './execution-policy-schema';

type Action = z.infer<typeof executionActionSchema>;
type Policy = z.infer<typeof executionPolicySchema>;
type Approval = z.infer<typeof approvalRecordSchema>;

export function defaultExecutionPolicy(now = new Date().toISOString()): Policy {
  return executionPolicySchema.parse({
    policyId:'krom-default-v36',
    name:'KROM Forge Safe Execution Policy',
    createdAt:now,
    notes:[
      'Read-only inspection and analysis may be auto-executable when the host exposes the capability.',
      'Consequential writes, production changes, destructive actions, auth/secret changes and external communications require explicit approval unless a stricter host policy blocks them.',
      'KROM never converts a missing approval into implied consent.'
    ]
  });
}

function riskFor(action:Action) {
  if (action.affectsBilling || action.changesAuthOrSecrets || action.kind==='SECRET_CHANGE' || action.kind==='AUTH_CHANGE') return 'CRITICAL' as const;
  if (action.environment==='PRODUCTION' || action.kind==='DEPLOY_PRODUCTION' || action.kind==='ROLLBACK' || action.kind==='DATABASE_MIGRATION' || action.kind==='MERGE_PR' || action.destructive) return 'HIGH' as const;
  if (action.writesExternalState || !action.reversible || ['WRITE_FILE','RUN_COMMAND','INSTALL_DEPENDENCY','GIT_COMMIT','GIT_PUSH','CREATE_PR','DATABASE_WRITE','DEPLOY_PREVIEW','DOMAIN_CHANGE','EXTERNAL_MESSAGE'].includes(action.kind)) return 'MEDIUM' as const;
  return 'LOW' as const;
}

export function classifyExecutionAction(action:Action, suppliedPolicy?:Policy) {
  const policy = suppliedPolicy ?? defaultExecutionPolicy();
  const risk = riskFor(action);
  const reasons:string[]=[];
  let decision:'AUTO_EXECUTE'|'REQUIRE_APPROVAL'|'BLOCKED'='AUTO_EXECUTE';

  if (!action.hostCanExecute) {
    decision='BLOCKED';
    reasons.push('The supplied host cannot execute this action.');
  }
  if (policy.blockedKinds.includes(action.kind)) {
    decision='BLOCKED';
    reasons.push(`Policy blocks action kind ${action.kind}.`);
  }

  if (decision!=='BLOCKED') {
    const approvalTriggers = [
      policy.alwaysRequireApprovalKinds.includes(action.kind) && `Action kind ${action.kind} always requires approval.`,
      policy.requireApprovalForProduction && action.environment==='PRODUCTION' && 'Production target requires approval.',
      policy.requireApprovalForDestructive && action.destructive && 'Destructive action requires approval.',
      policy.requireApprovalForIrreversible && !action.reversible && 'Irreversible action requires approval.',
      policy.requireApprovalForExternalState && action.writesExternalState && 'External state mutation requires approval.',
      policy.requireApprovalForAuthOrSecrets && action.changesAuthOrSecrets && 'Auth/secret mutation requires approval.',
      policy.requireApprovalForBilling && action.affectsBilling && 'Billing-impacting action requires approval.'
    ].filter(Boolean) as string[];
    if (approvalTriggers.length) {
      decision='REQUIRE_APPROVAL';
      reasons.push(...approvalTriggers);
    } else if (!policy.allowAutoExecuteKinds.includes(action.kind)) {
      decision='REQUIRE_APPROVAL';
      reasons.push(`Action kind ${action.kind} is not in the auto-execute allowlist.`);
    }
  }

  if (decision==='AUTO_EXECUTE' && !action.userRequestedExplicitly && risk!=='LOW') {
    decision='REQUIRE_APPROVAL';
    reasons.push('Non-low-risk action lacks explicit user request.');
  }

  return {
    actionId:action.actionId,
    decision,
    risk,
    reasons,
    reversible:action.reversible,
    environment:action.environment,
    requiredEvidence: decision==='AUTO_EXECUTE'
      ? ['host execution result']
      : decision==='REQUIRE_APPROVAL'
        ? ['explicit approval record','host execution result after approval']
        : ['host capability or policy change before execution'],
    rule:'Approval is action-scoped. Missing approval never counts as approval.'
  };
}

export function createApprovalRequest(action:Action, suppliedPolicy?:Policy, reason?:string) {
  const classification=classifyExecutionAction(action,suppliedPolicy);
  return {
    approvalId:`approval_${action.actionId}`,
    actionId:action.actionId,
    status:classification.decision==='REQUIRE_APPROVAL'?'PENDING':classification.decision==='AUTO_EXECUTE'?'NOT_REQUIRED':'UNAVAILABLE',
    requestedAt:new Date().toISOString(),
    scope:'single-action',
    reason:reason ?? classification.reasons.join(' '),
    classification
  };
}

export function evaluateApproval(action:Action, suppliedPolicy?:Policy, approval?:Approval) {
  const classification=classifyExecutionAction(action,suppliedPolicy);
  if (classification.decision==='BLOCKED') return {allowed:false,status:'BLOCKED',classification,approval:null};
  if (classification.decision==='AUTO_EXECUTE') return {allowed:true,status:'AUTO_EXECUTE',classification,approval:null};
  if (!approval) return {allowed:false,status:'APPROVAL_REQUIRED',classification,approval:null};
  if (approval.actionId!==action.actionId) return {allowed:false,status:'APPROVAL_SCOPE_MISMATCH',classification,approval};
  if (approval.status!=='APPROVED') return {allowed:false,status:`APPROVAL_${approval.status}`,classification,approval};
  return {allowed:true,status:'APPROVED_FOR_EXECUTION',classification,approval};
}

export function enforceExecutionPolicy(actions:Action[], suppliedPolicy?:Policy, approvals:Approval[] = []) {
  const policy=suppliedPolicy ?? defaultExecutionPolicy();
  const results=actions.map(action=>evaluateApproval(action,policy,approvals.find(a=>a.actionId===action.actionId)));
  return {
    status: results.some(r=>r.status==='BLOCKED') ? 'BLOCKED' : results.some(r=>!r.allowed) ? 'AWAITING_APPROVAL' : 'EXECUTABLE',
    results,
    allowedActionIds:actions.filter((_,i)=>results[i].allowed).map(a=>a.actionId),
    deniedOrPendingActionIds:actions.filter((_,i)=>!results[i].allowed).map(a=>a.actionId),
    rule:'The host may execute only actions whose policy result is allowed=true and whose required host capability exists.'
  };
}

export function auditExecutionPolicy(actions:Action[], suppliedPolicy?:Policy, approvals:Approval[] = []) {
  const evaluation=enforceExecutionPolicy(actions,suppliedPolicy,approvals);
  const orphanApprovals=approvals.filter(a=>!actions.some(x=>x.actionId===a.actionId));
  const highRiskWithoutApproval=actions.filter((a,i)=>{
    const c=classifyExecutionAction(a,suppliedPolicy);
    return (c.risk==='HIGH'||c.risk==='CRITICAL') && !evaluation.results[i].allowed;
  }).map(a=>a.actionId);
  return {evaluation,orphanApprovals,highRiskWithoutApproval,integrity:orphanApprovals.length?'PASS_WITH_GAPS':'PASS'};
}

export function compareExecutionPolicies(before:Policy, after:Policy) {
  const setDiff=(a:string[],b:string[])=>({added:b.filter(x=>!a.includes(x)),removed:a.filter(x=>!b.includes(x))});
  return {
    before:{policyId:before.policyId,name:before.name},
    after:{policyId:after.policyId,name:after.name},
    autoExecuteKinds:setDiff(before.allowAutoExecuteKinds,after.allowAutoExecuteKinds),
    approvalKinds:setDiff(before.alwaysRequireApprovalKinds,after.alwaysRequireApprovalKinds),
    blockedKinds:setDiff(before.blockedKinds,after.blockedKinds),
    flagChanges:{
      requireApprovalForProduction:[before.requireApprovalForProduction,after.requireApprovalForProduction],
      requireApprovalForDestructive:[before.requireApprovalForDestructive,after.requireApprovalForDestructive],
      requireApprovalForIrreversible:[before.requireApprovalForIrreversible,after.requireApprovalForIrreversible],
      requireApprovalForExternalState:[before.requireApprovalForExternalState,after.requireApprovalForExternalState],
      requireApprovalForAuthOrSecrets:[before.requireApprovalForAuthOrSecrets,after.requireApprovalForAuthOrSecrets],
      requireApprovalForBilling:[before.requireApprovalForBilling,after.requireApprovalForBilling]
    }
  };
}
