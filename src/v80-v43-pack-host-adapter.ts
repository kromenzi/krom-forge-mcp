import { z } from 'zod';
import { loadV43InstructionV80, loadV43InstructionBundleV80 } from './v80-v43-instruction-loader';
import type { V80BenchmarkHostAdapter } from './v80-host-benchmark-executor';
const executionResultSchema=z.object({outcome:z.enum(['PASS','FAIL','BLOCKED']),validatorPass:z.boolean(),securityPass:z.boolean(),unsupportedClaim:z.boolean(),regressionDetected:z.boolean(),semanticSimilarity:z.number().min(0).max(1),proceduralSimilarity:z.number().min(0).max(1),specializationDistinct:z.boolean(),artifacts:z.array(z.object({kind:z.string().trim().min(1),content:z.string().trim().min(1)})).min(1).max(100)});
export type V80TrustedHostExecutor=(input:{skillName:string;instruction:string;benchmarkCase:unknown;signal:AbortSignal})=>Promise<z.infer<typeof executionResultSchema>>;
/** Adapter delegates only to a caller-supplied host executor; no skill text is executed by the loader. */
export function createV43PackHostAdapterV80(executor:V80TrustedHostExecutor):V80BenchmarkHostAdapter{
 return {evidenceOrigin:'HOST_EXECUTION',loadInstruction:loadV43InstructionV80,loadInstructionBundle:loadV43InstructionBundleV80,execute:async({benchmarkCase,instruction,signal})=>executionResultSchema.parse(await executor({skillName:benchmarkCase.skillName,instruction,benchmarkCase,signal}))};
}
export const createV42PackHostAdapterV80=createV43PackHostAdapterV80;
