import { z } from 'zod';
import catalog from './v53-catalog.json';

type Domain = (typeof catalog.domains)[number];
type Operation = (typeof catalog.operations)[number];

export const v53EvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  verified: z.boolean().default(false),
  source: z.string().default('host'),
  summary: z.string().optional()
});

export const v53UniversalSchema = z.object({
  objective: z.string().min(1),
  context: z.string().default(''),
  artifacts: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().default('GENERIC'),
    summary: z.string().default('')
  })).default([]),
  constraints: z.array(z.string()).default([]),
  evidence: z.array(v53EvidenceSchema).default([]),
  options: z.array(z.object({
    id: z.string().min(1),
    label: z.string().default(''),
    value: z.number().optional(),
    risk: z.number().min(0).max(100).optional()
  })).default([]),
  previousState: z.record(z.string(), z.unknown()).default({}),
  environment: z.string().default('unspecified'),
  riskTolerance: z.enum(['LOW','MEDIUM','HIGH']).default('MEDIUM'),
  requestedDepth: z.enum(['FAST','STANDARD','DEEP']).default('STANDARD')
});

export type V53Input = z.infer<typeof v53UniversalSchema>;

export type V53ToolSpec = {
  name: string;
  title: string;
  description: string;
  domainId: string;
  domainTitle: string;
  operationId: string;
  operationTitle: string;
  family: string;
  focus: string[];
  evidenceKinds: string[];
  intent: string;
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');

export const V53_TOOL_SPECS: V53ToolSpec[] = catalog.domains.flatMap((domain: Domain) =>
  catalog.operations.map((operation: Operation) => ({
    name: `krom_v53_${slug(domain.id)}_${slug(operation.id)}`,
    title: `${operation.title} — ${domain.title}`,
    description: `${operation.intent} Domain focus: ${domain.focus.join(', ')}. Outputs remain evidence-bound and never imply host execution.`,
    domainId: domain.id,
    domainTitle: domain.title,
    operationId: operation.id,
    operationTitle: operation.title,
    family: operation.family,
    focus: [...domain.focus],
    evidenceKinds: [...domain.evidenceKinds],
    intent: operation.intent
  }))
);

export const V53_TOOL_NAMES = V53_TOOL_SPECS.map((spec) => spec.name);

if (V53_TOOL_SPECS.length !== 2000) {
  throw new Error(`KROM v53 registry integrity failure: expected 2000 tools, got ${V53_TOOL_SPECS.length}`);
}
if (new Set(V53_TOOL_NAMES).size !== V53_TOOL_NAMES.length) {
  throw new Error('KROM v53 registry integrity failure: duplicate tool names');
}

const verifiedEvidence = (input: V53Input) => input.evidence.filter((item) => item.verified);
const evidenceCoverage = (spec: V53ToolSpec, input: V53Input) => {
  const verified = verifiedEvidence(input);
  const matchedKinds = new Set(verified.map((item) => item.kind.toUpperCase()));
  const expected = spec.evidenceKinds;
  const matched = expected.filter((kind) => matchedKinds.has(kind.toUpperCase()));
  return {
    verifiedCount: verified.length,
    expectedKinds: expected,
    matchedKinds: matched,
    coverage: expected.length ? Math.round((matched.length / expected.length) * 100) : 100
  };
};

const actionTemplate = (spec: V53ToolSpec, input: V53Input) =>
  spec.focus.map((focus, index) => ({
    order: index + 1,
    focus,
    action: `${spec.operationTitle} ${focus} for objective: ${input.objective}`,
    evidenceRequired: spec.evidenceKinds[index % spec.evidenceKinds.length] ?? 'HOST_EVIDENCE'
  }));

export function executeV53Tool(spec: V53ToolSpec, input: V53Input) {
  const coverage = evidenceCoverage(spec, input);
  const evidenceStrict = ['EVALUATE','VERIFY','CONTROL'].includes(spec.family);
  const blockedForEvidence = evidenceStrict && coverage.verifiedCount === 0;
  const optionRanking = [...input.options]
    .map((option) => ({
      id: option.id,
      label: option.label,
      score: (option.value ?? 0) - (option.risk ?? 0)
    }))
    .sort((a, b) => b.score - a.score);

  const base = {
    tool: spec.name,
    release: 'v53',
    domain: { id: spec.domainId, title: spec.domainTitle, focus: spec.focus },
    operation: { id: spec.operationId, title: spec.operationTitle, family: spec.family },
    objective: input.objective,
    environment: input.environment,
    constraints: input.constraints,
    evidence: coverage,
    status: blockedForEvidence ? 'NOT_AVAILABLE' : 'READY',
    evidenceBoundary: blockedForEvidence
      ? 'This operation requires verified host evidence before a supported conclusion can be produced.'
      : 'Output is derived only from supplied context/evidence and does not claim external execution.',
    executionClaim: false
  } as const;

  if (spec.family === 'OBSERVE') {
    return {
      ...base,
      observations: input.artifacts.map((artifact) => ({
        artifactId: artifact.id,
        kind: artifact.kind,
        relevance: spec.focus,
        summary: artifact.summary
      })),
      requestedChecks: actionTemplate(spec, input)
    };
  }

  if (spec.family === 'EVALUATE' || spec.family === 'VERIFY' || spec.family === 'CONTROL') {
    return {
      ...base,
      decision: blockedForEvidence ? 'NOT_AVAILABLE' : input.constraints.length ? 'PASS_WITH_CONSTRAINTS' : 'PASS_WITH_SUPPLIED_EVIDENCE',
      optionRanking,
      checks: actionTemplate(spec, input),
      unsupportedClaimsProhibited: true
    };
  }

  if (spec.family === 'MODEL') {
    return {
      ...base,
      modelType: spec.operationId,
      assumptions: input.constraints,
      scenarios: spec.focus.map((focus) => ({ focus, hypothesis: `${spec.operationTitle} scenario for ${focus}`, observed: false })),
      warning: 'Model/simulation outputs are hypotheses until validated by host evidence.'
    };
  }

  if (spec.family === 'DECIDE') {
    return {
      ...base,
      priorities: actionTemplate(spec, input).map((item, index) => ({ ...item, priority: index + 1 })),
      optionRanking,
      decisionSupportOnly: true
    };
  }

  return {
    ...base,
    plan: actionTemplate(spec, input),
    rollbackRequired: ['migrate','upgrade','refactor','build','orchestrate'].includes(spec.operationId),
    hostAuthorizationRequiredForMutation: true
  };
}
