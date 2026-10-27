import { z } from 'zod';
import { ConfigurationError, type EnvironmentSource } from '@almina/config/env';
export const searchLimits={ candidates:300,vectorCandidates:160,vectorLimit:30,autocomplete:8,facets:20,timeoutMs:1800,rrfK:60,commercialCap:0.05,semanticThreshold:0.78,popularMinimum:10,configTtlMs:30000 } as const;
export function readSearchEnvironment(source:EnvironmentSource){
  const parsed=z.object({SEARCH_PROVIDER:z.enum(['legacy','atlas']).default('legacy'),
    ATLAS_SEARCH_PRODUCT_INDEX:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).default('products_search'),
    ATLAS_VECTOR_PRODUCT_INDEX:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).default('products_vector'),
    SEARCH_SEMANTIC_ENABLED:z.enum(['true','false']).default('false').transform(v=>v==='true'),
    EMBEDDING_PROVIDER:z.enum(['gemini']).default('gemini'),EMBEDDING_MODEL:z.string().regex(/^[a-zA-Z0-9_.-]{1,100}$/).default('gemini-embedding-001'),
    SEARCH_EMBEDDING_DIMENSIONS:z.coerce.number().int().min(128).max(3072).default(768),
    SEARCH_ANALYTICS_ENABLED:z.enum(['true','false']).default('false').transform(v=>v==='true'),
  }).safeParse(source);
  if(!parsed.success)throw new ConfigurationError([...new Set(parsed.error.issues.map(i=>i.path.join('.')))]);
  return parsed.data;
}
export type SearchEnvironment=ReturnType<typeof readSearchEnvironment>;
export const searchTuning={
 fieldBoosts:{name:12,'searchDocument.normalizedName':12,brand:7,'searchDocument.aliases':6,'searchDocument.categoryName':4,productForm:3},
 phraseBoost:15,exactNameBoost:50,exactIdentifierScore:1000,fuzzyPrefixLength:1,fuzzyMaxExpansions:25,autocompleteMaxExpansions:15,
 fuzzyMinimumTermLengthForTwoEdits:7,autocompleteFuzzyMinimumLength:4,semanticMinimumTerms:3,
} as const;
