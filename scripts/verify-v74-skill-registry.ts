import { auditSkillRegistryV74, validateSkillPackageV74, evaluateSkillBehavioralSuiteV74, scanRedactedSecretsV74 } from '../src/v74-skill-registry';

const base={packageName:'krom-skill',version:'74.0.0',registryTools:['a'],capabilityTools:['a'],requiredTools:['a'],packageFiles:['skill.md'],dependencies:[],behaviors:[{name:'contract',expected:'PASS',actual:'PASS',evidence:'verified'}],lifecycle:'VALIDATED' as const,findings:[],redactedSamples:[],metadata:{}};
if(auditSkillRegistryV74(base).status!=='PASS') throw new Error('v74 registry parity should pass');
if(validateSkillPackageV74(base).status!=='PASS') throw new Error('v74 package should validate');
if(evaluateSkillBehavioralSuiteV74(base).status!=='PASS') throw new Error('v74 behavioral suite should pass');
const leak=scanRedactedSecretsV74({...base,redactedSamples:['sk-123456789abcdef']});
if(leak.status!=='BLOCKED'||leak.rawSecretValuesReturned!==false) throw new Error('v74 secret scan must block and redact');
console.log(JSON.stringify({status:'PASS',release:'v74'}));
