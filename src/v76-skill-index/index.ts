import { V76_SKILL_INDEX_0 } from './part-0';
import { V76_SKILL_INDEX_1 } from './part-1';
import { V76_SKILL_INDEX_2 } from './part-2';
import { V76_SKILL_INDEX_3 } from './part-3';
import { V76_SKILL_INDEX_4 } from './part-4';
import { V75_SKILL_NAMES } from '../v75-agent-capability-fabric';

export type V76SkillMetadata = {
  name: string;
  description: string;
  sha256: string;
};

export const V76_SKILL_INDEX: readonly V76SkillMetadata[] = [
  ...V76_SKILL_INDEX_0,
  ...V76_SKILL_INDEX_1,
  ...V76_SKILL_INDEX_2,
  ...V76_SKILL_INDEX_3,
  ...V76_SKILL_INDEX_4
];

const SKILL_MAP = new Map(V76_SKILL_INDEX.map(skill => [skill.name, skill]));

export function getSkillMetadataV76(name: string) {
  return SKILL_MAP.get(name) ?? null;
}

export function listSkillMetadataV76() {
  return V76_SKILL_INDEX.map(skill => ({ ...skill }));
}

export function auditSkillIndexV76() {
  const names = V76_SKILL_INDEX.map(x => x.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  const expected = new Set<string>(V75_SKILL_NAMES as readonly string[]);
  const actual = new Set<string>(names);
  const missing = [...expected].filter(name => !actual.has(name));
  const extra = [...actual].filter(name => !expected.has(name));
  const invalidHashes = V76_SKILL_INDEX
    .filter(skill => !/^[a-f0-9]{64}$/.test(skill.sha256))
    .map(skill => skill.name);
  const emptyDescriptions = V76_SKILL_INDEX
    .filter(skill => !skill.description.trim())
    .map(skill => skill.name);

  return {
    release: 'v76',
    status: duplicateNames.length || missing.length || extra.length || invalidHashes.length ? 'FAIL' : 'PASS',
    expectedCount: V75_SKILL_NAMES.length,
    actualCount: V76_SKILL_INDEX.length,
    duplicateNames,
    missing,
    extra,
    invalidHashes,
    emptyDescriptions,
    digestCoverage: V76_SKILL_INDEX.length - invalidHashes.length,
    descriptionCoverage: V76_SKILL_INDEX.length - emptyDescriptions.length,
    source: 'User-provided SKILL.md archives',
    integrityModel: 'SHA-256 of normalized original SKILL.md content'
  };
}
