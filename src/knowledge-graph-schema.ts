import { z } from 'zod';
export const knowledgeNodeSchema=z.object({id:z.string(),type:z.enum(['REQUIREMENT','COMPONENT','FILE','API','TEST','EVIDENCE','DECISION','RISK','INCIDENT','DEPLOYMENT','DATABASE','CONTROL','OTHER']),label:z.string(),attributes:z.record(z.string(),z.string()).default({})});
export const knowledgeEdgeSchema=z.object({from:z.string(),to:z.string(),relation:z.string(),evidenceRefs:z.array(z.string()).default([])});
export const knowledgeGraphSchema=z.object({project:z.string(),nodes:z.array(knowledgeNodeSchema).default([]),edges:z.array(knowledgeEdgeSchema).default([])});
export const graphQuerySchema=z.object({graph:knowledgeGraphSchema,nodeId:z.string(),depth:z.number().int().min(1).max(5).default(2)});
export const compareKnowledgeGraphsSchema=z.object({before:knowledgeGraphSchema,after:knowledgeGraphSchema});
