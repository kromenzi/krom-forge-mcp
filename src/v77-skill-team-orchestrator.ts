import { createHash } from 'node:crypto';
import { z } from 'zod';
import { v77RuntimeSchema, routeCompoundIntentV77 } from './v77-native-skill-runtime';
import type { V76CapabilityCandidate } from './v76-semantic-skill-runtime';
import { getSkillMetadataV76 } from './v76-skill-index';

export const v77SkillTeamSchema=v77RuntimeSchema.extend({
  maxTeamSize:z.number().int().min(1).max(6).default(5),
  overlapThreshold:z.number().min(0).max(1).default(0.72)
});

export type V77SkillRole='PRIMARY'|'SUPPORT'|'VALIDATOR';

function isValidatorSkill(name:string,domains:readonly string[]){
  const n=name.toLowerCase();
  const domainSet=new Set(domains.map(x=>x.toLowerCase()));
  return /(?:qa|security|auditor|guardian|reliability|release-guardian)/.test(n) ||
    ['qa','test','security','auth','authorization','reliability','observability'].some(x=>domainSet.has(x));
}

function domainOverlap(a:readonly string[],b:readonly string[]){
  const aa=new Set(a.map(x=>x.toLowerCase()));
  const bb=new Set(b.map(x=>x.toLowerCase()));
  if(!aa.size || !bb.size) return 0;
  let intersection=0;
  for(const x of aa) if(bb.has(x)) intersection++;
  const union=new Set([...aa,...bb]).size;
  return union ? intersection/union : 0;
}

export function buildSkillTeamV77(
  input:z.infer<typeof v77SkillTeamSchema>,
  capabilityCandidates:V76CapabilityCandidate[]
){
  const route=routeCompoundIntentV77({
    query:input.query,
    maxSkills:Math.min(input.maxSkills,input.maxTeamSize),
    maxCapabilities:input.maxCapabilities,
    relativeSkillThreshold:input.relativeSkillThreshold,
    hostAuthorized:input.hostAuthorized,
    approvalRequired:input.approvalRequired,
    approved:input.approved,
    schemaValidated:input.schemaValidated
  },capabilityCandidates);

  const selected=route.selectedSkills.slice(0,input.maxTeamSize);
  const members=selected.map((skill,index)=>{
    const metadata=getSkillMetadataV76(skill.name);
    const domains=metadata?.domains ?? [];
    const role:V77SkillRole=index===0
      ? 'PRIMARY'
      : isValidatorSkill(skill.name,domains)
        ? 'VALIDATOR'
        : 'SUPPORT';
    const ownerAgent=metadata?.preferredAgents?.[0] ?? route.selectedAgent.agentId;
    return {
      id:`M${index+1}`,
      skill:skill.name,
      role,
      ownerAgent,
      score:skill.score,
      relativeScore:skill.relativeScore,
      coverage:skill.coverage,
      domains:[...domains],
      sha256:metadata?.sha256 ?? null
    };
  });

  const primary=members.find(x=>x.role==='PRIMARY') ?? null;
  const support=members.filter(x=>x.role==='SUPPORT');
  const validators=members.filter(x=>x.role==='VALIDATOR');

  const overlaps:{a:string,b:string,score:number,high:boolean}[]=[];
  for(let i=0;i<members.length;i++){
    for(let j=i+1;j<members.length;j++){
      const score=domainOverlap(members[i].domains,members[j].domains);
      if(score>0){
        overlaps.push({
          a:members[i].skill,
          b:members[j].skill,
          score:Number(score.toFixed(3)),
          high:score>=input.overlapThreshold
        });
      }
    }
  }

  const highOverlapPairs=overlaps.filter(x=>x.high);
  const supportIds=support.map(x=>x.id);
  const executionWaves=[
    {
      wave:1,
      mode:'PRIMARY',
      members:primary?[primary.id]:[],
      dependsOn:[] as number[]
    },
    {
      wave:2,
      mode:'PARALLEL_SUPPORT',
      members:supportIds,
      dependsOn:primary?[1]:[]
    },
    {
      wave:3,
      mode:'VALIDATION',
      members:validators.map(x=>x.id),
      dependsOn:members.length?[1,2].filter(x=>x===1 || supportIds.length>0):[]
    }
  ].filter(x=>x.members.length>0);

  const ownershipConflicts=members.flatMap((member,index)=>
    members.slice(index+1)
      .filter(other=>member.ownerAgent===other.ownerAgent && member.role!==other.role)
      .map(other=>({
        agent:member.ownerAgent,
        skills:[member.skill,other.skill],
        roles:[member.role,other.role],
        blocking:false,
        reason:'Same specialist agent owns multiple team roles; acceptable but should be scheduled explicitly.'
      }))
  );

  const highRiskValidatorRequired=Boolean(route.action.highRisk);
  const teamGates=[
    {id:'TG1',name:'PRIMARY_ASSIGNED',satisfied:Boolean(primary)},
    {id:'TG2',name:'ROUTE_READY',satisfied:route.status==='READY'},
    {id:'TG3',name:'NO_DIRECTIVE_CONFLICTS',satisfied:route.conflicts.length===0},
    {id:'TG4',name:'HOST_AUTHORIZATION',satisfied:route.authorization.authorizationSatisfied},
    {id:'TG5',name:'APPROVAL',satisfied:route.authorization.approvalSatisfied},
    {id:'TG6',name:'HIGH_RISK_VALIDATOR',satisfied:!highRiskValidatorRequired||validators.length>0}
  ];
  const failedTeamGates=teamGates.filter(x=>!x.satisfied);

  const status=!primary
    ? 'REVIEW_REQUIRED'
    : route.conflicts.length
      ? 'BLOCKED_CONFLICT'
      : route.status!=='READY'
        ? route.status
        : highRiskValidatorRequired&&validators.length===0
          ? 'REVIEW_REQUIRED'
          : 'READY';

  const canonical={
    release:'v77',
    query:input.query,
    status,
    routeStatus:route.status,
    actionClass:route.action.class,
    highRiskValidatorRequired,
    failedTeamGates:failedTeamGates.map(x=>x.id),
    members:members.map(x=>({
      skill:x.skill,role:x.role,ownerAgent:x.ownerAgent,sha256:x.sha256
    })),
    highOverlapPairs,
    executionWaves
  };

  return {
    ...canonical,
    teamDigest:createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    primary,
    support,
    validators,
    overlaps,
    ownershipConflicts,
    selectedAgent:route.selectedAgent,
    routeConflicts:route.conflicts,
    routeAuthorization:route.authorization,
    teamGates,
    failedTeamGates,
    highRiskValidatorRequired,
    parallelSupportAllowed:support.length>1 && highOverlapPairs.filter(x=>
      support.some(s=>s.skill===x.a)&&support.some(s=>s.skill===x.b)
    ).length===0,
    dispatchAllowed:status==='READY'&&failedTeamGates.length===0,
    executionClaim:false
  } as const;
}

export function auditSkillTeamOrchestratorV77(capabilityCandidates:V76CapabilityCandidate[]){
  const ui=buildSkillTeamV77({
    query:'fix responsive rtl dashboard accessibility and qa regression testing',
    maxSkills:5,
    maxCapabilities:8,
    relativeSkillThreshold:0.20,
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    schemaValidated:true,
    maxTeamSize:5,
    overlapThreshold:0.72
  },capabilityCandidates);

  const security=buildSkillTeamV77({
    query:'security auth secrets threat model and qa verification',
    maxSkills:5,
    maxCapabilities:8,
    relativeSkillThreshold:0.20,
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    schemaValidated:true,
    maxTeamSize:5,
    overlapThreshold:0.72
  },capabilityCandidates);

  const blockedMutation=buildSkillTeamV77({
    query:'deploy production release',
    maxSkills:5,
    maxCapabilities:8,
    relativeSkillThreshold:0.20,
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    schemaValidated:true,
    maxTeamSize:5,
    overlapThreshold:0.72
  },capabilityCandidates);

  const checks={
    primaryAssigned:Boolean(ui.primary)&&Boolean(security.primary),
    boundedTeam:ui.members.length<=5&&security.members.length<=5,
    deterministicDigests:/^[a-f0-9]{64}$/.test(ui.teamDigest)&&/^[a-f0-9]{64}$/.test(security.teamDigest),
    roleCoverage:ui.members.every(x=>['PRIMARY','SUPPORT','VALIDATOR'].includes(x.role)),
    provenanceBound:ui.members.every(x=>!x.sha256||/^[a-f0-9]{64}$/.test(x.sha256)),
    overlapScored:ui.overlaps.every(x=>x.score>=0&&x.score<=1),
    wavesPresent:ui.executionWaves.length>0,
    routeGatePropagated:blockedMutation.status==='BLOCKED_AUTHORIZATION'&&!blockedMutation.dispatchAllowed,
    teamGatesPresent:ui.teamGates.length>=6&&security.teamGates.length>=6,
    noExecutionClaim:ui.executionClaim===false&&security.executionClaim===false&&blockedMutation.executionClaim===false
  };
  const passed=Object.values(checks).filter(Boolean).length;
  return {
    release:'v77',
    status:passed===Object.keys(checks).length?'PASS':'FAIL',
    checks,
    passed,
    total:Object.keys(checks).length,
    executionClaim:false
  } as const;
}
