import type { ProjectMemory } from './project-memory-schema';

const now = () => new Date().toISOString();
const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value));

function upsertById<T extends {id:string}>(items:T[], item:T):T[] {
  const out = [...items];
  const i = out.findIndex(x => x.id === item.id);
  if (i >= 0) out[i] = item; else out.push(item);
  return out;
}

function touch(memory:ProjectMemory):ProjectMemory {
  return { ...memory, updatedAt: now() };
}

export function createProjectMemory(input:{projectId:string;projectName:string;scopeKey:string;architectureSummary:string;currentVersion?:string;currentCommitSha?:string;storageMode:'PORTABLE'|'EXTERNAL_PERSISTENCE';persistenceProvider?:string}):ProjectMemory {
  const t=now();
  return {
    schemaVersion:'1', projectId:input.projectId, projectName:input.projectName, scopeKey:input.scopeKey,
    storageMode:input.storageMode, persistenceProvider:input.persistenceProvider,
    createdAt:t, updatedAt:t, architectureSummary:input.architectureSummary,
    currentVersion:input.currentVersion, currentCommitSha:input.currentCommitSha,
    decisions:[], failures:[], evidence:[], tests:[], deployments:[], tasks:[], risks:[], snapshots:[], notes:[]
  };
}

export function getProjectMemorySummary(memory:ProjectMemory) {
  const openFailures=memory.failures.filter(x=>x.status==='OPEN');
  const openRisks=memory.risks.filter(x=>x.status==='OPEN');
  const blockedTasks=memory.tasks.filter(x=>x.status==='BLOCKED');
  const failingTests=memory.tests.filter(x=>x.status==='FAIL');
  const latestDeployment=[...memory.deployments].sort((a,b)=>(b.deployedAt??'').localeCompare(a.deployedAt??''))[0];
  return {
    projectId:memory.projectId, projectName:memory.projectName, scopeKey:memory.scopeKey,
    storage:{mode:memory.storageMode,provider:memory.persistenceProvider??null,durable:memory.storageMode==='EXTERNAL_PERSISTENCE'},
    current:{version:memory.currentVersion??null,commitSha:memory.currentCommitSha??null,architectureSummary:memory.architectureSummary},
    counts:{decisions:memory.decisions.length,openFailures:openFailures.length,evidence:memory.evidence.length,tests:memory.tests.length,deployments:memory.deployments.length,tasks:memory.tasks.length,blockedTasks:blockedTasks.length,openRisks:openRisks.length,snapshots:memory.snapshots.length},
    blockers:{openFailures:openFailures.map(x=>({id:x.id,category:x.category,symptom:x.symptom})),blockedTasks:blockedTasks.map(x=>({id:x.id,title:x.title,blockers:x.blockers})),failingTests:failingTests.map(x=>({id:x.id,kind:x.kind,summary:x.summary})),criticalRisks:openRisks.filter(x=>x.severity==='CRITICAL'||x.severity==='HIGH').map(x=>({id:x.id,severity:x.severity,title:x.title}))},
    latestDeployment:latestDeployment??null,
    updatedAt:memory.updatedAt??null,
    persistenceWarning:memory.storageMode==='PORTABLE'?'PORTABLE memory must be passed back by the host or persisted by an authorized external store. KROM Forge does not claim durable server-side storage in this mode.':null
  };
}

export function updateProjectMemory(input:{memory:ProjectMemory;architectureSummary?:string;currentVersion?:string;currentCommitSha?:string;notesToAdd:string[]}) {
  const m=clone(input.memory);
  if (input.architectureSummary!==undefined) m.architectureSummary=input.architectureSummary;
  if (input.currentVersion!==undefined) m.currentVersion=input.currentVersion;
  if (input.currentCommitSha!==undefined) m.currentCommitSha=input.currentCommitSha;
  if (input.notesToAdd.length) m.notes=[...m.notes,...input.notesToAdd];
  return touch(m);
}

export function recordDecision(memory:ProjectMemory, decision:any){ const m=clone(memory); m.decisions=upsertById(m.decisions,{...decision,createdAt:decision.createdAt??now()}); return touch(m); }
export function recordFailure(memory:ProjectMemory, failure:any){ const m=clone(memory); m.failures=upsertById(m.failures,{...failure,firstSeenAt:failure.firstSeenAt??now()}); return touch(m); }
export function recordEvidence(memory:ProjectMemory, evidence:any){ const m=clone(memory); m.evidence=upsertById(m.evidence,{...evidence,capturedAt:evidence.capturedAt??now()}); return touch(m); }
export function recordTestResult(memory:ProjectMemory, test:any){ const m=clone(memory); m.tests=upsertById(m.tests,{...test,ranAt:test.ranAt??now()}); return touch(m); }
export function recordDeployment(memory:ProjectMemory, deployment:any){ const m=clone(memory); m.deployments=upsertById(m.deployments,{...deployment,deployedAt:deployment.deployedAt??now()}); return touch(m); }
export function recordTask(memory:ProjectMemory, task:any){ const m=clone(memory); m.tasks=upsertById(m.tasks,task); return touch(m); }
export function recordRisk(memory:ProjectMemory, risk:any){ const m=clone(memory); m.risks=upsertById(m.risks,risk); return touch(m); }
export function recordSnapshot(memory:ProjectMemory, snapshot:any){ const m=clone(memory); m.snapshots=upsertById(m.snapshots,{...snapshot,capturedAt:snapshot.capturedAt??now()}); return touch(m); }

export function getProjectTimeline(memory:ProjectMemory) {
  const events:any[]=[];
  memory.decisions.forEach(x=>events.push({at:x.createdAt,type:'DECISION',id:x.id,summary:x.title,status:x.status}));
  memory.failures.forEach(x=>events.push({at:x.resolvedAt??x.firstSeenAt,type:'FAILURE',id:x.id,summary:x.symptom,status:x.status}));
  memory.evidence.forEach(x=>events.push({at:x.capturedAt,type:'EVIDENCE',id:x.id,summary:x.summary,status:x.verified?'VERIFIED':'UNVERIFIED'}));
  memory.tests.forEach(x=>events.push({at:x.ranAt,type:'TEST',id:x.id,summary:`${x.kind}: ${x.summary}`,status:x.status}));
  memory.deployments.forEach(x=>events.push({at:x.deployedAt,type:'DEPLOYMENT',id:x.id,summary:`${x.provider} ${x.environment}${x.version?` ${x.version}`:''}`,status:x.status}));
  memory.snapshots.forEach(x=>events.push({at:x.capturedAt,type:'SNAPSHOT',id:x.id,summary:x.label,status:'CAPTURED'}));
  return {projectId:memory.projectId,events:events.sort((a,b)=>(b.at??'').localeCompare(a.at??'')),rule:'Timeline is synthesized only from supplied project memory records.'};
}

export function compareProjectMemories(before:ProjectMemory, after:ProjectMemory) {
  const ids=(xs:{id:string}[])=>new Set(xs.map(x=>x.id));
  const delta=(a:{id:string}[],b:{id:string}[])=>{const A=ids(a),B=ids(b);return {added:[...B].filter(x=>!A.has(x)),removed:[...A].filter(x=>!B.has(x))};};
  return {
    scopeCompatible:before.scopeKey===after.scopeKey,
    projectCompatible:before.projectId===after.projectId,
    version:{before:before.currentVersion??null,after:after.currentVersion??null},
    commit:{before:before.currentCommitSha??null,after:after.currentCommitSha??null},
    architectureChanged:before.architectureSummary!==after.architectureSummary,
    decisions:delta(before.decisions,after.decisions), failures:delta(before.failures,after.failures), evidence:delta(before.evidence,after.evidence), tests:delta(before.tests,after.tests), deployments:delta(before.deployments,after.deployments), tasks:delta(before.tasks,after.tasks), risks:delta(before.risks,after.risks), snapshots:delta(before.snapshots,after.snapshots),
    warning:before.scopeKey!==after.scopeKey?'Different scopeKey values: do not merge these memories automatically.':null
  };
}

export function evaluateMemoryIntegrity(memory:ProjectMemory) {
  const evidenceIds=new Set(memory.evidence.map(x=>x.id));
  const dangling:{type:string;id:string;evidenceId:string}[]=[];
  const check=(type:string,items:{id:string;evidenceIds:string[]}[])=>items.forEach(i=>i.evidenceIds.forEach(e=>{if(!evidenceIds.has(e))dangling.push({type,id:i.id,evidenceId:e});}));
  check('decision',memory.decisions);check('failure',memory.failures);check('test',memory.tests);check('deployment',memory.deployments);check('task',memory.tasks);check('risk',memory.risks);check('snapshot',memory.snapshots);
  const duplicate=(xs:{id:string}[])=>xs.filter((x,i)=>xs.findIndex(y=>y.id===x.id)!==i).map(x=>x.id);
  const duplicates={evidence:duplicate(memory.evidence),decisions:duplicate(memory.decisions),failures:duplicate(memory.failures),tests:duplicate(memory.tests),deployments:duplicate(memory.deployments),tasks:duplicate(memory.tasks),risks:duplicate(memory.risks),snapshots:duplicate(memory.snapshots)};
  const hasDuplicates=Object.values(duplicates).some(x=>x.length);
  return {status:dangling.length||hasDuplicates?'PASS_WITH_GAPS':'PASS',danglingEvidenceReferences:dangling,duplicateIds:duplicates,storageMode:memory.storageMode,durablePersistenceClaimAllowed:memory.storageMode==='EXTERNAL_PERSISTENCE',rule:'PASS means the supplied memory object is internally consistent; it does not prove durable storage unless an external persistence adapter is actually configured and evidenced.'};
}
