import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';

// Phase 8 foundation.
// This list is the single repository-controlled source of truth for v4.2 skills
// that have completed SHADOW -> CANARY -> STABLE governance and were explicitly
// approved for real catalog promotion.
//
// IMPORTANT: it intentionally remains empty in Phase 8. Adding names here is a
// real catalog mutation and requires a separately authorized promotion batch.
export const V80_PROMOTED_V42_SKILL_NAMES: readonly string[] = [];

const promotedNameSet = new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);

export const V80_PROMOTED_V42_SKILL_SEEDS = V80_V42_SHADOW_SEEDS
  .filter(seed => promotedNameSet.has(seed.n))
  .map(seed => ({
    name: seed.n,
    description: `Promoted v4.2 KROM skill for ${seed.a}: ${seed.n}.`,
    sha256: seed.h,
    domains: [seed.a],
    preferredAgents: [...new Set([seed.p, seed.v])]
  }));

export const V80_PROMOTED_V42_SKILL_COUNT = V80_PROMOTED_V42_SKILL_SEEDS.length;

export function auditPromotedV42SkillSeedsV80() {
  const duplicateNames = V80_PROMOTED_V42_SKILL_NAMES
    .filter((name, index, items) => items.indexOf(name) !== index);
  const unknownNames = V80_PROMOTED_V42_SKILL_NAMES
    .filter(name => !V80_V42_SHADOW_SEEDS.some(seed => seed.n === name));
  const invalidHashes = V80_PROMOTED_V42_SKILL_SEEDS
    .filter(seed => !/^[a-f0-9]{64}$/.test(seed.sha256))
    .map(seed => seed.name);

  return {
    release: 'v80',
    phase: 'real-catalog-promotion-registry',
    status: duplicateNames.length || unknownNames.length || invalidHashes.length ? 'FAIL' : 'PASS',
    promotedCount: V80_PROMOTED_V42_SKILL_COUNT,
    duplicateNames,
    unknownNames,
    invalidHashes,
    executionClaim: false
  } as const;
}
