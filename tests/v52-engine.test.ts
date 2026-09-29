import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringConstitutionSchema,constraintSolverSchema,trustGraphSchema,changeSimulationSchema,
  recoveryStrategySchema,verificationEconomicsSchema,multiProjectCoordinationSchema,operatorCockpitSchema
} from '../src/v52-schema';
import {
  evaluateConstitutionCompliance,solveEngineeringConstraints,extractUnsatCore,evaluateTransitiveTrust,
  detectTrustWeakLinks,simulateChangeBlastRadius,detectChangeCascades,evaluateRecoveryStrategyReadiness,
  scoreRecoveryStrategies,optimizeVerificationSpend,detectVerificationUnderinvestment,detectProgramCollisions,
  allocateSharedProgramCapacity,evaluateOperatorActionReadiness,selectNextSafeOperatorAction
} from '../src/v52-engine';

const evidence=(id:string)=>({id,kind:'TEST',verified:true,source:'test'});

test('constitution blocks explicit mandatory violations',()=>{
  const input=engineeringConstitutionSchema.parse({constitutionId:'c',evidence:[evidence('e')],principles:[{id:'p',statement:'no unsafe deploy',evidenceRefs:['e']}],proposedActions:[{id:'deploy',violates:['p']}]});
  assert.equal(evaluateConstitutionCompliance(input).status,'BLOCKED');
});
test('constitution blocks unsupported mandatory principles',()=>{
  const input=engineeringConstitutionSchema.parse({constitutionId:'c',principles:[{id:'p',statement:'rule'}]});
  assert.deepEqual(evaluateConstitutionCompliance(input).unsupportedMandatoryPrinciples,['p']);
});
test('constraint solver finds satisfiable assignment',()=>{
  const input=constraintSolverSchema.parse({solverId:'s',variables:{region:['a','b']},constraints:[{id:'c',variable:'region',allowed:['b']}]});
  assert.deepEqual(solveEngineeringConstraints(input).selection,{region:'b'});
});
test('constraint solver extracts unsat core',()=>{
  const input=constraintSolverSchema.parse({solverId:'s',variables:{region:['a']},constraints:[{id:'c',variable:'region',forbidden:['a']}]});
  assert.deepEqual(extractUnsatCore(input).unsatCore,['c']);
});
test('trust graph propagates bounded trust',()=>{
  const input=trustGraphSchema.parse({graphId:'g',evidence:[evidence('e')],nodes:[{id:'a',directTrust:90,evidenceRefs:['e']},{id:'b'}],edges:[{from:'a',to:'b',relation:'VERIFIES',confidence:70}]});
  assert.equal(evaluateTransitiveTrust(input).scores.b,70);
});
test('trust graph exposes weak unsupported nodes',()=>{
  const input=trustGraphSchema.parse({graphId:'g',nodes:[{id:'a',directTrust:100}]});
  assert.deepEqual(detectTrustWeakLinks(input).weakNodes,[{id:'a',score:0}]);
});
test('change simulation propagates blast radius to dependents',()=>{
  const input=changeSimulationSchema.parse({simulationId:'s',components:[{id:'db'},{id:'api',dependsOn:['db']}],changes:[{id:'c',componentId:'db',impact:80}]});
  assert.deepEqual(simulateChangeBlastRadius(input).impacted.sort(),['api','db']);
});
test('change simulation identifies cascade-only components',()=>{
  const input=changeSimulationSchema.parse({simulationId:'s',components:[{id:'db'},{id:'api',dependsOn:['db']}],changes:[{id:'c',componentId:'db',impact:80}]});
  assert.deepEqual(detectChangeCascades(input).cascades,['api']);
});
test('recovery readiness requires dependencies and evidence',()=>{
  const input=recoveryStrategySchema.parse({recoveryId:'r',evidence:[evidence('e')],availableDependencies:['backup'],strategies:[{id:'restore',estimatedMinutes:30,dependencies:['backup'],evidenceRefs:['e']}]});
  assert.equal(evaluateRecoveryStrategyReadiness(input).status,'READY');
});
test('recovery scoring penalizes unsupported strategies',()=>{
  const input=recoveryStrategySchema.parse({recoveryId:'r',evidence:[evidence('e')],strategies:[{id:'good',estimatedMinutes:20,evidenceRefs:['e']},{id:'unsupported',estimatedMinutes:1}]});
  assert.equal(scoreRecoveryStrategies(input).selectedStrategyId,'good');
});
test('verification economics always includes mandatory checks',()=>{
  const input=verificationEconomicsSchema.parse({portfolioId:'v',budget:1,checks:[{id:'must',cost:5,riskReduction:100,mandatory:true},{id:'optional',cost:1,riskReduction:1}]});
  assert.ok(optimizeVerificationSpend(input).selectedIds.includes('must'));
});
test('verification economics detects critical underinvestment',()=>{
  const input=verificationEconomicsSchema.parse({portfolioId:'v',budget:0,checks:[{id:'critical',cost:10,riskReduction:100,criticalPath:true}]});
  assert.deepEqual(detectVerificationUnderinvestment(input).missingCritical,['critical']);
});
test('program coordination detects shared release windows',()=>{
  const input=multiProjectCoordinationSchema.parse({programId:'p',projects:[{id:'a',window:'w'},{id:'b',window:'w'}]});
  assert.equal(detectProgramCollisions(input).windowCollisions.length,1);
});
test('program capacity favors higher-priority projects',()=>{
  const input=multiProjectCoordinationSchema.parse({programId:'p',sharedCapacity:{gpu:1},projects:[{id:'low',priority:1,requiredCapabilities:['gpu']},{id:'high',priority:10,requiredCapabilities:['gpu']}]});
  assert.deepEqual(allocateSharedProgramCapacity(input).allocations.gpu,['high']);
});
test('operator cockpit blocks approval-required actions without approval',()=>{
  const input=operatorCockpitSchema.parse({cockpitId:'o',evidence:[evidence('e')],actions:[{id:'deploy',requiresApproval:true,evidenceRefs:['e']}]});
  assert.equal(evaluateOperatorActionReadiness(input).status,'BLOCKED');
});
test('operator cockpit selects evidenced ready action',()=>{
  const input=operatorCockpitSchema.parse({cockpitId:'o',evidence:[evidence('e')],actions:[{id:'safe',severity:'HIGH',impact:20,evidenceRefs:['e']},{id:'blocked',severity:'CRITICAL',impact:1,blockers:['incident'],evidenceRefs:['e']}]});
  assert.equal(selectNextSafeOperatorAction(input).selectedActionId,'safe');
});
