import { z } from 'zod';

export const V75_AGENT_IDS = [
  'orchestrator','architect','researcher','backend','frontend','uiux','database','security','qa','devops','release-auditor'
] as const;

export const V75_SKILL_NAMES = [
  'elite-product-uiux-designer','enterprise-hse-platform-engineer','excel-playbooks','find-skills','github-gem-seeker','internet-skill-finder',
  'krom-appsec-threat-model-engineer','krom-autonomous-repair-engineer','krom-mcp-contract-security-engineer','krom-observability-reliability-engineer',
  'krom-prompt-skill-evaluation-engineer','krom-sast-dast-dependency-security-engineer','krom-secrets-credential-guardian','krom-secure-code-auditor',
  'krom-self-evolution-engineer','krom-skill-discovery-curation-engineer','krom-skill-factory-meta-engineer','krom-skill-supply-chain-security-auditor',
  'ksa-accessibility-rtl-i18n-engineer','ksa-ai-hse-assistant-rag-engineer','ksa-auth-rbac-rls-security-engineer',
  'ksa-backup-restore-disaster-recovery-engineer','ksa-computer-vision-safety-engineer','ksa-data-exchange-etl-reporting-engineer','ksa-database-schema-migration-architect',
  'ksa-document-intelligence-ocr-import-engineer','ksa-esp-vision-systems-engineer','ksa-integration-notification-engineer',
  'ksa-mobile-pwa-offline-field-engineer','ksa-performance-observability-sre-engineer','ksa-qa-e2e-test-automation-engineer',
  'ksa-realtime-collaboration-engineer','ksa-safety-board-dashboard-analytics','ksa-safety-board-engineering',
  'ksa-safety-board-hse-automation-workflow','ksa-safety-board-orchestrator','ksa-safety-board-orchestrator-v3','ksa-safety-board-print-document-architect',
  'ksa-safety-board-uiux-design','ksa-vision-command-center-uiux','ksa-vision-reliability-security-auditor','outlook-playbooks',
  'powerpoint-playbooks','production-engineering-release-guardian','saudi-forge-public-deployment','skill-creator',
  'system-settings-playbooks','typst-pdf-maker','whatsapp-playbooks','word-playbooks'
] as const;

const preferredHostTools: Record<(typeof V75_AGENT_IDS)[number], string[]> = {
  orchestrator: ['files','web','github','supabase','vercel','execution','browser'],
  architect: ['files','web'],
  researcher: ['web','files'],
  backend: ['files','execution','supabase','github'],
  frontend: ['files','execution','browser'],
  uiux: ['figma','browser','files'],
  database: ['supabase','files','execution'],
  security: ['files','supabase','execution','browser'],
  qa: ['execution','browser','files'],
  devops: ['vercel','github','execution'],
  'release-auditor': ['execution','browser','vercel','github','supabase']
};

export const v75AgentCapabilitySchema = z.object({
  agentId: z.enum(V75_AGENT_IDS).optional(),
  query: z.string().default(''),
  availableInternalCapabilities: z.number().int().min(0).default(5333),
  expectedSkillCount: z.number().int().min(0).default(V75_SKILL_NAMES.length),
  gatewayTools: z.array(z.string()).default(['krom_search_capabilities','krom_dispatch_capability'])
});

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
}

function scoreSkill(name: string, query: string) {
  const q = tokens(query);
  if (!q.length) return 0;
  const n = tokens(name);
  let score = 0;
  for (const t of q) {
    if (name.toLowerCase().includes(t)) score += 3;
    if (n.includes(t)) score += 2;
  }
  return score;
}

export function getAgentCapabilityProfileV75(input: z.infer<typeof v75AgentCapabilitySchema>) {
  const agentId = input.agentId ?? 'orchestrator';
  return {
    release: 'v75',
    agentId,
    capabilityAccess: 'ALL_INTERNAL',
    internalCapabilityCount: input.availableInternalCapabilities,
    skillAccess: 'ALL_IMPORTED_SKILLS',
    skillCount: V75_SKILL_NAMES.length,
    gatewayTools: input.gatewayTools,
    preferredHostTools: preferredHostTools[agentId],
    preferredToolsAreRestrictions: false,
    policy: 'Every specialist agent can discover and dispatch any registered internal KROM capability and can route through the full imported skill catalog. Preferred host tools guide selection only; host authorization still governs real side effects.'
  };
}

export function listAgentSkillFabricV75() {
  return {
    release: 'v75',
    agentCount: V75_AGENT_IDS.length,
    skillCount: V75_SKILL_NAMES.length,
    agents: V75_AGENT_IDS.map(agentId => ({
      agentId,
      preferredHostTools: preferredHostTools[agentId],
      capabilityAccess: 'ALL_INTERNAL',
      skillAccess: 'ALL_IMPORTED_SKILLS'
    })),
    skills: [...V75_SKILL_NAMES]
  };
}

export function searchAgentSkillsV75(input: z.infer<typeof v75AgentCapabilitySchema>) {
  const query = input.query.trim();
  const ranked = V75_SKILL_NAMES
    .map(name => ({ name, score: scoreSkill(name, query) }))
    .filter(x => !query || x.score > 0)
    .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 20);
  return {
    release: 'v75',
    agentId: input.agentId ?? 'orchestrator',
    query,
    totalSkills: V75_SKILL_NAMES.length,
    matches: ranked
  };
}

export function auditAgentCapabilityFabricV75(input: z.infer<typeof v75AgentCapabilitySchema>) {
  const duplicateAgents = V75_AGENT_IDS.filter((v,i,a)=>a.indexOf(v)!==i);
  const duplicateSkills = V75_SKILL_NAMES.filter((v,i,a)=>a.indexOf(v)!==i);
  const missingGateway = ['krom_search_capabilities','krom_dispatch_capability'].filter(x => !input.gatewayTools.includes(x));
  const agentProfiles = V75_AGENT_IDS.map(agentId => getAgentCapabilityProfileV75({...input, agentId}));
  const restrictedAgents = agentProfiles.filter(x => x.capabilityAccess !== 'ALL_INTERNAL' || x.skillAccess !== 'ALL_IMPORTED_SKILLS');
  const status = duplicateAgents.length || duplicateSkills.length || missingGateway.length || restrictedAgents.length ||
    input.expectedSkillCount !== V75_SKILL_NAMES.length || input.availableInternalCapabilities < 5333 ? 'FAIL' : 'PASS';

  return {
    release: 'v75',
    status,
    agentCount: V75_AGENT_IDS.length,
    expectedAgentCount: 11,
    skillCount: V75_SKILL_NAMES.length,
    expectedSkillCount: input.expectedSkillCount,
    internalCapabilityCount: input.availableInternalCapabilities,
    gatewayTools: input.gatewayTools,
    duplicateAgents,
    duplicateSkills,
    missingGateway,
    restrictedAgents: restrictedAgents.map(x => x.agentId),
    allAgentsHaveAllCapabilities: restrictedAgents.length === 0 && input.availableInternalCapabilities >= 5333,
    allAgentsHaveAllSkills: restrictedAgents.length === 0 && V75_SKILL_NAMES.length === input.expectedSkillCount,
    hostAuthorizationBoundaryPreserved: true,
    executionClaim: false
  };
}
