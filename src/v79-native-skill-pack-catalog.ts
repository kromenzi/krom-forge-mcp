// Generated from the user-approved KROM Native Skill Pack archives.
// Adds imported skill metadata only; public MCP tools and the 5,333 capability baseline are unchanged.
// Total after v3 integration: 1,465 skills (165 original + 300 prior native + 1,000 combined v3).

import { V79_NATIVE_SKILL_SEEDS_0 } from './v79-native-skill-seeds-part-0';
import { V79_NATIVE_SKILL_SEEDS_1 } from './v79-native-skill-seeds-part-1';
import { V79_NATIVE_SKILL_SEEDS_2 } from './v79-native-skill-seeds-part-2';
import { V79_COMBINED_1000_SKILL_SEEDS } from './v79-combined-1000-skill-seeds';

type V79NativeSkillSeed = {
  name: string;
  description: string;
  sha256: string;
  domains: readonly string[];
  preferredAgents: readonly string[];
};

export type V79NativeSkillMetadata = {
  name: string;
  description: string;
  sha256: string;
  domains: string[];
  preferredAgents: string[];
  instructionContract: string[];
  evidenceExpectations: string[];
};

const BASE_INSTRUCTIONS = [
  'Inspect current evidence before proposing destructive or state-changing work.',
  'Separate observed facts, assumptions, recommendations and execution claims.',
  'Use search → describe → dispatch for internal KROM capabilities; never invent capability names.',
  'Validate host authorization, approval requirements and input schemas before side effects.',
  'Require build, test, runtime or deployment evidence before claiming implementation success.',
  'For enterprise domain work, separate WHAT TO BUILD from engineering HOW TO BUILD IT.',
  'Keep jurisdiction-specific requirements evidence-bound and configurable rather than hard-coded.'
];

const BASE_EVIDENCE = [
  'Host-supplied source, configuration, policy or project evidence.',
  'Version and scope identity for the artifact or system under review.',
  'Changed-file or diff evidence for implementation claims.',
  'Focused test evidence for changed behavior.',
  'Runtime or deployment evidence before production-success claims.'
];

const SEEDS: readonly V79NativeSkillSeed[] = [
  ...V79_NATIVE_SKILL_SEEDS_0,
  ...V79_NATIVE_SKILL_SEEDS_1,
  ...V79_NATIVE_SKILL_SEEDS_2,
  ...V79_COMBINED_1000_SKILL_SEEDS
];

export const V79_NATIVE_SKILL_PACK_INDEX: readonly V79NativeSkillMetadata[] = SEEDS.map(seed => ({
  name: seed.name,
  description: seed.description,
  sha256: seed.sha256,
  domains: [...seed.domains],
  preferredAgents: [...seed.preferredAgents],
  instructionContract: [...BASE_INSTRUCTIONS, `Operate within the declared skill domains: ${seed.domains.join(', ')}.`],
  evidenceExpectations: [...BASE_EVIDENCE]
}));

export const V79_NATIVE_SKILL_PACK_NAMES = V79_NATIVE_SKILL_PACK_INDEX.map(skill => skill.name);
export const V79_NATIVE_SKILL_PACK_COUNT = V79_NATIVE_SKILL_PACK_INDEX.length;