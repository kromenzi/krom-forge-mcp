import type { ResearchEvidence, SourceRecord } from './research-schema';

const sourceRank: Record<SourceRecord['sourceType'], number> = {
  official: 0,
  'primary-docs': 1,
  'professional-body': 2,
  vendor: 3,
  secondary: 4,
  community: 5,
  internal: 6
};

function classifySource(source: SourceRecord) {
  if (source.evidenceClass) return source.evidenceClass;
  if (source.sourceType === 'official' || source.sourceType === 'primary-docs' || source.sourceType === 'professional-body') return 'AUTHORITATIVE' as const;
  if (source.sourceType === 'vendor') return 'BENCHMARK' as const;
  if (source.sourceType === 'community') return 'COMMON_PRACTICE' as const;
  if (source.sourceType === 'internal') return 'ASSUMPTION' as const;
  return 'RECOMMENDATION' as const;
}

export function classifyResearchSources(input: ResearchEvidence) {
  const sources = input.sources
    .map((s) => ({
      ...s,
      evidenceClass: classifySource(s),
      authorityRank: sourceRank[s.sourceType],
      confidence: s.confidence ?? (s.sourceType === 'official' ? 0.95 : s.sourceType === 'primary-docs' ? 0.9 : s.sourceType === 'professional-body' ? 0.85 : s.sourceType === 'vendor' ? 0.72 : s.sourceType === 'secondary' ? 0.6 : 0.5)
    }))
    .sort((a, b) => a.authorityRank - b.authorityRank || b.confidence - a.confidence);

  return {
    domain: input.domain,
    sourceCount: sources.length,
    sources,
    coverage: {
      authoritative: sources.filter(s => s.evidenceClass === 'AUTHORITATIVE').length,
      benchmark: sources.filter(s => s.evidenceClass === 'BENCHMARK').length,
      commonPractice: sources.filter(s => s.evidenceClass === 'COMMON_PRACTICE').length,
      recommendation: sources.filter(s => s.evidenceClass === 'RECOMMENDATION').length,
      assumption: sources.filter(s => s.evidenceClass === 'ASSUMPTION').length
    },
    limitation: 'Classification is based only on host-supplied source metadata and excerpts. KROM Forge does not claim to have browsed sources unless the host actually supplied them.'
  };
}

export function extractRequirements(input: ResearchEvidence) {
  const rows: Array<{ requirement: string; sourceId: string; evidenceClass: string; confidence: number; status: 'EVIDENCED' | 'NEEDS_VALIDATION' }> = [];
  for (const source of input.sources) {
    const klass = classifySource(source);
    const confidence = source.confidence ?? (klass === 'AUTHORITATIVE' ? 0.9 : 0.65);
    for (const claim of source.claims) {
      const clean = claim.trim();
      if (!clean) continue;
      rows.push({
        requirement: clean,
        sourceId: source.id,
        evidenceClass: klass,
        confidence,
        status: confidence >= 0.75 ? 'EVIDENCED' : 'NEEDS_VALIDATION'
      });
    }
  }

  const seen = new Set<string>();
  const deduped = rows.filter(r => {
    const k = r.requirement.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    requirements: deduped,
    unresolved: deduped.filter(r => r.status === 'NEEDS_VALIDATION'),
    missingEvidence: input.sources.length === 0 ? ['No source evidence supplied by the host.'] : [],
    rule: 'Do not promote a recommendation, benchmark, or assumption into a statutory requirement without authoritative evidence.'
  };
}

function entityCandidates(text: string): string[] {
  const terms = ['user','role','permission','organization','site','project','department','employee','contractor','incident','inspection','action','asset','equipment','document','report','notification','approval','audit','training','permit','risk'];
  const lower = text.toLowerCase();
  return terms.filter(t => lower.includes(t));
}

export function buildDomainModel(input: ResearchEvidence) {
  const requirements = extractRequirements(input).requirements;
  const combined = [input.objective, ...input.constraints, ...requirements.map(r => r.requirement)].join(' ');
  const entities = entityCandidates(combined);
  const actors = ['Admin','Manager','Supervisor','Operator','Employee','Contractor','Auditor'].filter(a => combined.toLowerCase().includes(a.toLowerCase()));
  const workflows = requirements
    .filter(r => /approve|review|submit|assign|close|verify|escalat|workflow|state|permit|inspection|incident|action/i.test(r.requirement))
    .map(r => r.requirement)
    .slice(0, 40);

  return {
    domain: input.domain,
    objective: input.objective,
    jurisdiction: input.jurisdiction ?? 'Unspecified',
    actors: actors.length ? actors : ['Actors not safely inferable from supplied evidence'],
    entities: entities.length ? entities : ['Entities not safely inferable from supplied evidence'],
    workflows,
    controlAreas: ['authorization','auditability','evidence','state transitions','notifications','reporting'].filter(k => combined.toLowerCase().includes(k) || ['authorization','auditability','evidence'].includes(k)),
    assumptions: input.hostNotes,
    evidenceGap: input.sources.length === 0 ? 'No external or internal evidence sources were supplied.' : null,
    rule: 'This model is synthesis from supplied evidence, not independent browsing.'
  };
}

export function detectResearchConflicts(input: ResearchEvidence) {
  const claims = input.sources.flatMap(s => s.claims.map(c => ({ source: s, claim: c })));
  const normalized = claims.map(x => ({ ...x, n: x.claim.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff ]/g, ' ').replace(/\s+/g, ' ').trim() }));
  const conflicts: Array<{ topic: string; sourceA: string; claimA: string; sourceB: string; claimB: string; reason: string }> = [];
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i], b = normalized[j];
      const wordsA = new Set(a.n.split(' ').filter(w => w.length > 4));
      const overlap = b.n.split(' ').filter(w => wordsA.has(w)).length;
      const negA = /\b(no|not|must not|prohibited|shall not|غير|لا يجوز|ممنوع)\b/i.test(a.claim);
      const negB = /\b(no|not|must not|prohibited|shall not|غير|لا يجوز|ممنوع)\b/i.test(b.claim);
      if (overlap >= 2 && negA !== negB) conflicts.push({
        topic: [...wordsA].filter(w => b.n.includes(w)).slice(0, 5).join(' '),
        sourceA: a.source.id, claimA: a.claim,
        sourceB: b.source.id, claimB: b.claim,
        reason: 'Potential polarity conflict detected; requires human/source review.'
      });
    }
  }
  return { conflicts, requiresReview: conflicts.length > 0, limitation: 'Conflict detection is heuristic; absence of a detected conflict is not proof that sources agree.' };
}

export function assessResearchCoverage(input: ResearchEvidence) {
  const classified = classifyResearchSources(input);
  const reqs = extractRequirements(input);
  const authoritative = classified.coverage.authoritative;
  const gaps: string[] = [];
  if (!input.sources.length) gaps.push('No research evidence supplied.');
  if (input.jurisdiction && authoritative === 0) gaps.push('Jurisdiction is specified but no authoritative source is present.');
  if (reqs.requirements.length === 0) gaps.push('No explicit evidence-backed requirements were extracted.');
  if (!input.constraints.length) gaps.push('No product constraints were supplied.');
  return {
    readiness: gaps.length === 0 ? 'READY_FOR_SYNTHESIS' : 'RESEARCH_GAPS_REMAIN',
    gaps,
    counts: classified.coverage,
    requirementCount: reqs.requirements.length,
    recommendation: gaps.length ? 'Collect missing primary evidence before treating the research phase as complete.' : 'Proceed to domain and implementation synthesis while preserving evidence classes.'
  };
}

export function createResearchSynthesis(input: ResearchEvidence) {
  return {
    classification: classifyResearchSources(input),
    requirements: extractRequirements(input),
    domainModel: buildDomainModel(input),
    conflicts: detectResearchConflicts(input),
    coverage: assessResearchCoverage(input),
    nextActions: [
      'Resolve authoritative-source gaps first.',
      'Review detected conflicts before converting findings into product requirements.',
      'Keep benchmarks and recommendations distinct from regulatory requirements.',
      'Pass the synthesized requirements into architecture and prompt blueprints only after evidence review.'
    ]
  };
}
