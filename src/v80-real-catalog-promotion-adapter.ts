import { createHash } from 'node:crypto';
import { z } from 'zod';
import { V76_SKILL_INDEX } from './v76-skill-index';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import {
  V80_PROMOTED_V42_SKILL_NAMES,
  V80_PROMOTED_V42_SKILL_COUNT
} from './v80-promoted-v42-skill-seeds';

const candidateByName=new Map<string,(typeof V80_V42_SHADOW_SEEDS)[number]>(
  V80_V42_SHADOW_SEEDS.map(seed=>[seed.n,seed])
);
const promotedNameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);

export function digestRealSkillCatalogV80(){
  const canonical=V76_SKILL_INDEX
    .map(skill=>({
      name:skill.name,
      sha256:skill.sha256,
      domains:[...skill.domains].sort(),
      preferredAgents:[...skill.preferredAgents].sort()
    }))
    .sort((a,b)=>a.name.localeCompare(b.name));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export const v80StablePromotionReceiptSchema=z.object({
  skillName:z.string().min(1),
  transactionId:z.string().regex(/^[a-f0-9]{64}$/),
  status:z.literal('COMMITTED_TO_SUPPLIED_STATE'),
  targetLifecycle:z.literal('STABLE'),
  beforeDigest:z.string().regex(/^[a-f0-9]{64}$/),
  afterDigest:z.string().regex(/^[a-f0-9]{64}$/),
  authorizationId:z.string().min(1),
  approvalEvidenceRefs:z.array(z.string().min(1)).min(1).max(100),
  postApplyEvidenceRefs:z.array(z.string().min(1)).min(1).max(100)
});

export const v80PrepareRealCatalogPromotionSchema=z.object({
  expectedCatalogDigest:z.string().regex(/^[a-f0-9]{64}$/),
  catalogAuthorization:z.boolean(),
  catalogAuthorizationId:z.string().min(1),
  catalogApprovalEvidenceRefs:z.array(z.string().min(1)).min(1).max(100),
  receipts:z.array(v80StablePromotionReceiptSchema).min(1).max(25)
});

function renderPromotedRegistrySource(names:string[]){
  const sorted=[...new Set(names)].sort();
  const literal=sorted.length
    ? sorted.map(name=>`  '${name}'`).join(',\n')
    : '';
  return `import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';

// Phase 8 real catalog promotion registry.
// Every name in this list must have an evidence-bound STABLE promotion receipt
// and explicit repository/catalog authorization.
export const V80_PROMOTED_V42_SKILL_NAMES: readonly string[] = [
${literal}
];

const promotedNameSet = new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);

export const V80_PROMOTED_V42_SKILL_SEEDS = V80_V42_SHADOW_SEEDS
  .filter(seed => promotedNameSet.has(seed.n))
  .map(seed => ({
    name: seed.n,
    description: \`Promoted v4.2 KROM skill for \${seed.a}: \${seed.n}.\`,
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
`;
}

function futureCatalogDigest(names:string[]){
  const added=names
    .filter(name=>!promotedNameSet.has(name))
    .map(name=>{
      const seed=candidateByName.get(name)!;
      return {
        name:seed.n,
        sha256:seed.h,
        domains:[seed.a],
        preferredAgents:[...new Set([seed.p,seed.v])].sort()
      };
    });

  const canonical=[
    ...V76_SKILL_INDEX.map(skill=>({
      name:skill.name,
      sha256:skill.sha256,
      domains:[...skill.domains].sort(),
      preferredAgents:[...skill.preferredAgents].sort()
    })),
    ...added
  ].sort((a,b)=>a.name.localeCompare(b.name));

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function prepareV42RealCatalogPromotionV80(input:z.input<typeof v80PrepareRealCatalogPromotionSchema>){
  const parsed=v80PrepareRealCatalogPromotionSchema.parse(input);
  const currentCatalogDigest=digestRealSkillCatalogV80();

  const duplicateReceiptSkills=[...new Set(
    parsed.receipts
      .map(receipt=>receipt.skillName)
      .filter((name,index,items)=>items.indexOf(name)!==index)
  )].sort();

  const unknownCandidates=parsed.receipts
    .map(receipt=>receipt.skillName)
    .filter(name=>!candidateByName.has(name))
    .sort();

  const alreadyPromoted=parsed.receipts
    .map(receipt=>receipt.skillName)
    .filter(name=>promotedNameSet.has(name))
    .sort();

  const invalidReceipts=parsed.receipts
    .filter(receipt=>
      receipt.status!=='COMMITTED_TO_SUPPLIED_STATE' ||
      receipt.targetLifecycle!=='STABLE' ||
      receipt.beforeDigest===receipt.afterDigest ||
      !receipt.approvalEvidenceRefs.length ||
      !receipt.postApplyEvidenceRefs.length
    )
    .map(receipt=>receipt.skillName)
    .sort();

  const blockers:string[]=[];
  if(!parsed.catalogAuthorization) blockers.push('CATALOG_AUTHORIZATION_REQUIRED');
  if(parsed.expectedCatalogDigest!==currentCatalogDigest) blockers.push('EXPECTED_CATALOG_DIGEST_MISMATCH');
  if(duplicateReceiptSkills.length) blockers.push('DUPLICATE_RECEIPT_SKILLS');
  if(unknownCandidates.length) blockers.push('UNKNOWN_V42_CANDIDATES');
  if(alreadyPromoted.length) blockers.push('ALREADY_PROMOTED');
  if(invalidReceipts.length) blockers.push('INVALID_STABLE_RECEIPTS');

  const requestedNames=parsed.receipts.map(receipt=>receipt.skillName);
  const nextNames=[...new Set([...V80_PROMOTED_V42_SKILL_NAMES,...requestedNames])].sort();
  const replacementSource=renderPromotedRegistrySource(nextNames);
  const rollbackSource=renderPromotedRegistrySource([...V80_PROMOTED_V42_SKILL_NAMES]);
  const nextCatalogDigest=blockers.length?currentCatalogDigest:futureCatalogDigest(requestedNames);

  return {
    release:'v80',
    phase:'real-catalog-promotion-adapter',
    status:blockers.length?'BLOCKED':'PATCH_READY',
    blockers,
    currentCatalogDigest,
    expectedCatalogDigest:parsed.expectedCatalogDigest,
    nextCatalogDigest,
    currentStableSkillCount:V76_SKILL_INDEX.length,
    currentPromotedV42Count:V80_PROMOTED_V42_SKILL_COUNT,
    requestedPromotionCount:parsed.receipts.length,
    expectedStableSkillCountAfter:blockers.length
      ? V76_SKILL_INDEX.length
      : V76_SKILL_INDEX.length+requestedNames.length,
    duplicateReceiptSkills,
    unknownCandidates,
    alreadyPromoted,
    invalidReceipts,
    patch:{
      path:'src/v80-promoted-v42-skill-seeds.ts',
      replacementSource,
      rollbackSource
    },
    authorization:{
      catalogAuthorization:parsed.catalogAuthorization,
      catalogAuthorizationId:parsed.catalogAuthorizationId,
      catalogApprovalEvidenceRefs:parsed.catalogApprovalEvidenceRefs
    },
    receiptEvidence:parsed.receipts.map(receipt=>({
      skillName:receipt.skillName,
      transactionId:receipt.transactionId,
      authorizationId:receipt.authorizationId,
      approvalEvidenceRefs:receipt.approvalEvidenceRefs,
      postApplyEvidenceRefs:receipt.postApplyEvidenceRefs
    })),
    repositoryMutationRequired:blockers.length===0,
    repositoryMutationApplied:false,
    runtimeCatalogMutationApplied:false,
    deploymentMutationApplied:false,
    executionClaim:false
  } as const;
}

export const v80VerifyRealCatalogPatchSchema=z.object({
  proposedPromotedNames:z.array(z.string().min(1)).max(500),
  expectedStableSkillCount:z.number().int().min(1465),
  expectedCatalogDigest:z.string().regex(/^[a-f0-9]{64}$/)
});

export function verifyV42RealCatalogPatchV80(input:z.input<typeof v80VerifyRealCatalogPatchSchema>){
  const parsed=v80VerifyRealCatalogPatchSchema.parse(input);
  const duplicates=parsed.proposedPromotedNames
    .filter((name,index,items)=>items.indexOf(name)!==index);
  const unknown=parsed.proposedPromotedNames.filter(name=>!candidateByName.has(name));
  const expectedCount=1465+parsed.proposedPromotedNames.length;

  const proposedSeeds=parsed.proposedPromotedNames.map(name=>candidateByName.get(name)).filter(Boolean);
  const proposedCatalog=[
    ...V76_SKILL_INDEX
      .filter(skill=>!promotedNameSet.has(skill.name))
      .map(skill=>({
        name:skill.name,
        sha256:skill.sha256,
        domains:[...skill.domains].sort(),
        preferredAgents:[...skill.preferredAgents].sort()
      })),
    ...proposedSeeds.map(seed=>({
      name:seed!.n,
      sha256:seed!.h,
      domains:[seed!.a],
      preferredAgents:[...new Set([seed!.p,seed!.v])].sort()
    }))
  ].sort((a,b)=>a.name.localeCompare(b.name));

  const digest=createHash('sha256').update(JSON.stringify(proposedCatalog)).digest('hex');
  const failures:string[]=[];
  if(duplicates.length) failures.push('DUPLICATE_PROMOTED_NAMES');
  if(unknown.length) failures.push('UNKNOWN_PROMOTED_NAMES');
  if(parsed.expectedStableSkillCount!==expectedCount) failures.push('STABLE_SKILL_COUNT_MISMATCH');
  if(parsed.expectedCatalogDigest!==digest) failures.push('CATALOG_DIGEST_MISMATCH');

  return {
    release:'v80',
    phase:'real-catalog-promotion-adapter',
    status:failures.length?'FAIL':'PASS',
    failures,
    duplicateNames:[...new Set(duplicates)].sort(),
    unknownNames:[...new Set(unknown)].sort(),
    expectedStableSkillCount:expectedCount,
    computedCatalogDigest:digest,
    executionClaim:false
  } as const;
}

export function auditV42RealCatalogPromotionAdapterV80(){
  const candidate=V80_V42_SHADOW_SEEDS[0];
  const currentDigest=digestRealSkillCatalogV80();
  const receipt={
    skillName:candidate.n,
    transactionId:'1'.repeat(64),
    status:'COMMITTED_TO_SUPPLIED_STATE' as const,
    targetLifecycle:'STABLE' as const,
    beforeDigest:'2'.repeat(64),
    afterDigest:'3'.repeat(64),
    authorizationId:'audit-phase7-stable',
    approvalEvidenceRefs:['audit:phase7:approval'],
    postApplyEvidenceRefs:['audit:phase7:post']
  };

  const denied=prepareV42RealCatalogPromotionV80({
    expectedCatalogDigest:currentDigest,
    catalogAuthorization:false,
    catalogAuthorizationId:'audit-denied',
    catalogApprovalEvidenceRefs:['audit:catalog:denied'],
    receipts:[receipt]
  });
  const mismatch=prepareV42RealCatalogPromotionV80({
    expectedCatalogDigest:'0'.repeat(64),
    catalogAuthorization:true,
    catalogAuthorizationId:'audit-mismatch',
    catalogApprovalEvidenceRefs:['audit:catalog:mismatch'],
    receipts:[receipt]
  });
  const ready=prepareV42RealCatalogPromotionV80({
    expectedCatalogDigest:currentDigest,
    catalogAuthorization:true,
    catalogAuthorizationId:'audit-ready',
    catalogApprovalEvidenceRefs:['audit:catalog:ready'],
    receipts:[receipt]
  });

  const verification=ready.status==='PATCH_READY'
    ? verifyV42RealCatalogPatchV80({
        proposedPromotedNames:[candidate.n],
        expectedStableSkillCount:1466,
        expectedCatalogDigest:ready.nextCatalogDigest
      })
    : null;

  const checks={
    currentPromotedRegistryEmpty:V80_PROMOTED_V42_SKILL_COUNT===0,
    currentStableCount1465:V76_SKILL_INDEX.length===1465,
    authorizationRequired:denied.status==='BLOCKED'&&denied.blockers.includes('CATALOG_AUTHORIZATION_REQUIRED'),
    catalogDigestProtected:mismatch.status==='BLOCKED'&&mismatch.blockers.includes('EXPECTED_CATALOG_DIGEST_MISMATCH'),
    stableReceiptProducesPatch:ready.status==='PATCH_READY'&&ready.expectedStableSkillCountAfter===1466,
    repositoryNotMutated:ready.repositoryMutationApplied===false&&ready.runtimeCatalogMutationApplied===false,
    rollbackSourcePresent:ready.patch.rollbackSource.includes('V80_PROMOTED_V42_SKILL_NAMES'),
    patchVerifies:verification?.status==='PASS'
  };

  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return {
    release:'v80',
    phase:'real-catalog-promotion-adapter',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    currentCatalogDigest:currentDigest,
    executionClaim:false
  } as const;
}
