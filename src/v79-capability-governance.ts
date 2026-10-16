export type KromCapabilityProfileV79 =
  | 'core'
  | 'project'
  | 'change'
  | 'security-release'
  | 'research-ui'
  | 'skills-admin'
  | 'full-legacy';

export type KromCapabilityLifecycleV79 = 'stable' | 'beta' | 'legacy' | 'deprecated';
export type KromCapabilityBehaviorV79 = 'analysis' | 'planning' | 'governance' | 'host-handoff';
export type KromCapabilityRiskV79 = 'low' | 'medium' | 'high';
export type KromCapabilityPermissionV79 = 'read' | 'governance' | 'admin';

export interface KromCapabilityMetadataV79 {
  name: string;
  version: number | null;
  domain: string;
  profiles: KromCapabilityProfileV79[];
  lifecycle: KromCapabilityLifecycleV79;
  behavior: KromCapabilityBehaviorV79;
  exposure: 'core' | 'profile' | 'admin' | 'legacy';
  riskLevel: KromCapabilityRiskV79;
  requiredPermission: KromCapabilityPermissionV79;
  requiredEvidence: string[];
  preferredAgent: string | null;
  preferredSkill: string | null;
  replaces: string[];
  replacedBy: string | null;
  fallbackCapability: string | null;
  publicDirect: boolean;
  controlPlane: boolean;
}

const PROFILES = new Set<KromCapabilityProfileV79>([
  'core',
  'project',
  'change',
  'security-release',
  'research-ui',
  'skills-admin',
  'full-legacy'
]);

const ADMIN_PATTERN = /(skill_(?:registry|catalog|index)|audit_tool_registry|registry_repair|dependency_sbom|scan_redacted_secrets|native_skill_directives|directive_enforcement)/i;
const SECURITY_PATTERN = /(security|secret|authorization|identity|delegation|trust|attestation|governance|compliance|policy|release|deploy|rollback|recovery|incident|slo|error_budget|provenance)/i;
const UI_PATTERN = /(ui|ux|responsive|rtl|accessibility|design|frontend|browser|visual)/i;
const CHANGE_PATTERN = /(patch|diff|change|migration|test_plan|api_contract|breaking_api|implementation|refactor)/i;
const PROJECT_PATTERN = /(project|architecture|dependency|route|inventory|risk|health|knowledge|memory)/i;
const ROUTING_PATTERN = /(route|routing|intent|skill|agent|mission|workflow|task_graph|execution_plan|capabilit)/i;

const evidenceFor = (domain: string, behavior: KromCapabilityBehaviorV79) => {
  if (domain === 'security-release') return ['security evidence', 'authorization/provenance evidence when consequential'];
  if (domain === 'change') return ['diff/change evidence', 'focused test evidence'];
  if (domain === 'research-ui') return ['browser/screenshot/DOM or source evidence when UI claims are consequential'];
  if (behavior === 'governance') return ['verified evidence proportional to the decision'];
  if (behavior === 'host-handoff') return ['host authorization', 'host execution receipt'];
  return ['host-supplied evidence when the capability evaluates real project state'];
};

const preferredAgentFor = (domain: string) => {
  switch (domain) {
    case 'security-release': return 'security';
    case 'research-ui': return 'uiux';
    case 'change': return 'qa';
    case 'project': return 'architect';
    case 'skills-admin': return 'orchestrator';
    default: return 'orchestrator';
  }
};

export function resolveCapabilityProfileV79(value?: string | null): KromCapabilityProfileV79 {
  const normalized = String(value ?? '').trim().toLowerCase() as KromCapabilityProfileV79;
  return PROFILES.has(normalized) ? normalized : 'core';
}

export function buildCapabilityMetadataV79(
  name: string,
  title = '',
  description = '',
  publicDirect = false,
  controlPlane = false
): KromCapabilityMetadataV79 {
  const haystack = `${name} ${title} ${description}`;
  const versionMatch = name.match(/_v(\d+)_/);
  const version = versionMatch ? Number(versionMatch[1]) : null;

  let domain = 'orchestration';
  if (ADMIN_PATTERN.test(haystack)) domain = 'skills-admin';
  else if (SECURITY_PATTERN.test(haystack)) domain = 'security-release';
  else if (UI_PATTERN.test(haystack)) domain = 'research-ui';
  else if (CHANGE_PATTERN.test(haystack)) domain = 'change';
  else if (PROJECT_PATTERN.test(haystack)) domain = 'project';
  else if (ROUTING_PATTERN.test(haystack)) domain = 'orchestration';

  const behavior: KromCapabilityBehaviorV79 =
    /(execute|dispatch|handoff|apply|mutation)/i.test(haystack) ? 'host-handoff'
      : /(gate|govern|authorize|approval|release|trust|policy|audit)/i.test(haystack) ? 'governance'
        : /(plan|build|prepare|design|route|select|recommend|simulate)/i.test(haystack) ? 'planning'
          : 'analysis';

  const requiredPermission: KromCapabilityPermissionV79 =
    domain === 'skills-admin' ? 'admin'
      : behavior === 'governance' || behavior === 'host-handoff' ? 'governance'
        : 'read';

  const riskLevel: KromCapabilityRiskV79 =
    requiredPermission === 'admin' ? 'high'
      : requiredPermission === 'governance' ? 'medium'
        : 'low';

  const domainProfile = (domain === 'project' ? 'project'
    : domain === 'change' ? 'change'
      : domain === 'security-release' ? 'security-release'
        : domain === 'research-ui' ? 'research-ui'
          : domain === 'skills-admin' ? 'skills-admin'
            : 'core') as KromCapabilityProfileV79;

  const profiles = domain === 'skills-admin'
    ? ['skills-admin', 'full-legacy'] as KromCapabilityProfileV79[]
    : [...new Set<KromCapabilityProfileV79>(['core', domainProfile, 'full-legacy'])];

  return {
    name,
    version,
    domain,
    profiles,
    lifecycle: 'stable',
    behavior,
    exposure: publicDirect ? 'core' : domain === 'skills-admin' ? 'admin' : 'profile',
    riskLevel,
    requiredPermission,
    requiredEvidence: evidenceFor(domain, behavior),
    preferredAgent: preferredAgentFor(domain),
    preferredSkill: null,
    replaces: [],
    replacedBy: null,
    fallbackCapability: null,
    publicDirect,
    controlPlane
  };
}

export function isCapabilityAllowedV79(
  metadata: KromCapabilityMetadataV79,
  profile: KromCapabilityProfileV79
) {
  if (profile === 'full-legacy') return true;
  if (metadata.requiredPermission === 'admin') return profile === 'skills-admin';
  if (profile === 'core') return metadata.profiles.includes('core');
  return metadata.profiles.includes(profile) || metadata.profiles.includes('core');
}

export function summarizeInputSchemaV79(schema: any) {
  const shape = schema && typeof schema === 'object' && schema.shape && typeof schema.shape === 'object'
    ? schema.shape
    : null;
  return {
    available: Boolean(schema),
    kind: schema?.constructor?.name ?? typeof schema,
    fields: shape ? Object.keys(shape).sort() : [],
    validatesWithSafeParse: typeof schema?.safeParse === 'function'
  };
}
