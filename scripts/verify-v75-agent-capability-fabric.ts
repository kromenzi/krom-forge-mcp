import { V75_AGENT_IDS, V75_SKILL_NAMES, auditAgentCapabilityFabricV75, listAgentSkillFabricV75 } from '../src/v75-agent-capability-fabric';

const fabric=listAgentSkillFabricV75();
if(fabric.agentCount!==11) throw new Error(`Expected 11 agents, got ${fabric.agentCount}`);
if(fabric.skillCount!==51) throw new Error(`Expected 50 imported skills, got ${fabric.skillCount}`);
if(V75_AGENT_IDS.length!==11) throw new Error('v75 agent registry mismatch');
if(V75_SKILL_NAMES.length!==51) throw new Error('v75 skill registry mismatch');

const audit=auditAgentCapabilityFabricV75({
  query:'',
  availableInternalCapabilities:5333,
  expectedSkillCount:51,
  gatewayTools:['krom_search_capabilities','krom_dispatch_capability']
});

if(audit.status!=='PASS') throw new Error(`v75 fabric audit failed: ${JSON.stringify(audit)}`);
if(!audit.allAgentsHaveAllCapabilities) throw new Error('Not all agents have full internal capability access');
if(!audit.allAgentsHaveAllSkills) throw new Error('Not all agents have full imported skill access');
if(audit.restrictedAgents.length) throw new Error(`Restricted agents detected: ${audit.restrictedAgents.join(',')}`);
if(audit.duplicateAgents.length||audit.duplicateSkills.length) throw new Error('Duplicate agent or skill registry entries detected');

console.log(JSON.stringify({status:'PASS',release:'v75',agents:11,skills:51,internalCapabilities:5333,gatewayTools:audit.gatewayTools}));
