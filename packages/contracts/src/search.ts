import { z } from 'zod';
import {productContentFields} from './product-content';
import {productFamilyFields} from './product-family';
const id = z.string().regex(/^[a-f0-9]{24}$/i);
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).regex(/[\p{L}\p{N}]/u), locale: z.enum(['en','ar']).default('en'),
  page: z.coerce.number().int().min(1).max(300).default(1), limit: z.coerce.number().int().min(1).max(30).default(30),
  offset:z.coerce.number().int().min(0).max(299).optional(),groupFamilies:z.enum(['true','false']).default('true').transform(v=>v==='true'),
  category: id.optional(), brand: z.string().trim().min(1).max(100).optional(),
  form:z.string().trim().min(1).max(120).optional(),size:z.string().trim().min(1).max(150).optional(),audience:z.string().trim().min(1).max(40).optional(),bodyArea:z.string().trim().min(1).max(40).optional(),concern:z.string().trim().min(1).max(100).optional(),feature:z.string().trim().min(1).max(100).optional(),
  inStock: z.enum(['true','false']).transform(v=>v==='true').optional(),
  minPrice: z.coerce.number().finite().min(0).max(999999).optional(), maxPrice: z.coerce.number().finite().min(0).max(999999).optional(),
  sort: z.enum(['relevance','price-asc','price-desc','name']).default('relevance'),
  stock:z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),featured:z.enum(['true','false']).transform(v=>v==='true').optional(),
  offers: z.enum(['true','false']).transform(v=>v==='true').optional(),
  literal: z.enum(['true','false']).transform(v=>v==='true').optional(),
}).strict().refine(v=>(v.offset??(v.page-1)*v.limit)<300).refine(v=>v.minPrice===undefined||v.maxPrice===undefined||v.minPrice<=v.maxPrice);
export type SearchInput = z.infer<typeof searchQuerySchema>;
export const searchSuggestionSchema = z.object({name:z.string().max(160),href:z.string().max(500).startsWith('/')}).strict();
export const searchSuggestionsSchema = z.object({
  products:z.array(searchSuggestionSchema).max(8),categories:z.array(searchSuggestionSchema).max(3),
  brands:z.array(searchSuggestionSchema).max(3),collections:z.array(searchSuggestionSchema).max(3),
  popular:z.array(searchSuggestionSchema).max(3),related:z.array(searchSuggestionSchema).max(3), unavailable:z.boolean().default(false),
}).strict();
export type SearchSuggestions = z.infer<typeof searchSuggestionsSchema>;
export const searchInterpretationSchema = z.object({
  category:id.optional(),categoryName:z.string().max(200).optional(),features:z.array(z.string().max(80)).max(5).optional(),
  identifier:z.string().max(80).optional(),brand:z.string().max(100).optional(),productKind:z.string().max(80).optional(),
  form:z.string().max(80).optional(),size:z.string().max(40).optional(),quantity:z.number().int().positive().max(1000).optional(),
  audience:z.string().max(40).optional(),bodyArea:z.string().max(40).optional(),concerns:z.array(z.string().max(80)).max(5),
  minPrice:z.number().nonnegative().optional(),maxPrice:z.number().nonnegative().optional(),priceIntent:z.literal('low').optional(),
  inStock:z.boolean().optional(),offers:z.boolean().optional(),
}).strict();
const facet = z.object({value:z.string().max(160),count:z.number().int().nonnegative()});
const timestamp=z.union([z.string().max(80),z.date().transform(v=>v.toISOString())]).optional();
export const searchProductSchema=z.object({...productContentFields,...productFamilyFields,
 _id:id,product_id:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),name:z.string().min(1).max(300),
 category:z.object({_id:id,name:z.string().min(1).max(200)}),price:z.number().finite().nonnegative(),stock:z.number().int().nonnegative(),
 image:z.string().max(1000).optional(),images:z.array(z.string().max(2000)).max(100).optional(),cloudinaryImages:z.array(z.string().max(2000)).max(8).optional(),
 gdriveFileId:z.string().max(200).optional(),gdriveFileIds:z.array(z.string().max(200)).max(100).optional(),description:z.string().max(20000).optional(),
 disabled:z.boolean().optional(),published:z.boolean().optional(),sale:z.boolean().optional(),featured:z.boolean().optional(),vat:z.boolean().optional(),
 salePrice:z.number().finite().nonnegative().optional(),salePercent:z.number().finite().optional(),saleBadge:z.string().max(200).optional(),saleType:z.string().max(100).optional(),
 familyOptionCount:z.number().int().min(1).max(60).optional(),familyPriceVaries:z.boolean().optional(),
 catalogManaged:z.boolean().optional(),websiteStockProposed:z.number().optional(),stockReviewedAt:timestamp,createdAt:timestamp,updatedAt:timestamp,mediaRevision:z.number().int().nonnegative().optional(),
});
export const searchResponseSchema = z.object({
  searchId:z.uuid(),query:z.string().max(80),normalizedQuery:z.string().max(160), interpretedQuery:z.string().max(160),
  interpretation:searchInterpretationSchema,correction:z.string().max(160).nullable(),relaxed:z.boolean(),unavailable:z.boolean(),
  products:z.array(searchProductSchema).max(30),
  categories:z.array(searchSuggestionSchema).max(3),brands:z.array(searchSuggestionSchema).max(3),collections:z.array(searchSuggestionSchema).max(3),
  querySuggestions:z.array(searchSuggestionSchema).max(5),alternatives:z.array(searchSuggestionSchema).max(6),
  facets:z.object({scope:z.literal('bounded-relevant-candidates'),categories:z.array(facet).max(20),brands:z.array(facet).max(20),forms:z.array(facet).max(20),sizes:z.array(facet).max(20),audiences:z.array(facet).max(20),bodyAreas:z.array(facet).max(20),concerns:z.array(facet).max(20),features:z.array(facet).max(20),inStock:z.number().int().nonnegative(),price:z.object({min:z.number(),max:z.number()}).nullable()}),
  pagination:z.object({page:z.number().int(),hasNext:z.boolean(),resultCount:z.number().int(),bounded:z.boolean()}),
}).strict();
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export const synonymSchema = z.object({
  key:z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),type:z.enum(['equivalent','one_way','customer_language','brand_alias','category_alias','product_type_alias']),
  inputs:z.array(z.string().trim().min(2).max(80)).min(1).max(12),outputs:z.array(z.string().trim().min(2).max(80)).min(1).max(12),
  enabled:z.boolean(),locale:z.enum(['en','ar','both']).default('both'),
}).strict();
export type SearchSynonym = z.infer<typeof synonymSchema>;
export const searchRuleSchema = z.object({
  key:z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),query:z.string().trim().min(2).max(80),
  type:z.enum(['pin','boost','hide','navigation']),productId:id.optional(),
  name:z.string().trim().max(100).optional(),href:z.string().max(300).regex(/^\/(?:offers|categories|collections|search)(?:[/?][^\s\\]*)?$/).optional(),
  boost:z.number().min(0).max(0.05).default(0),position:z.number().int().min(1).max(10).default(1),
  enabled:z.boolean(),startsAt:z.iso.datetime().nullable().default(null),endsAt:z.iso.datetime().nullable().default(null),
}).strict().refine(v=>v.type==='navigation'?Boolean(v.href&&v.name):Boolean(v.productId)).refine(v=>!v.startsAt||!v.endsAt||v.startsAt<v.endsAt);
export type SearchRule = z.infer<typeof searchRuleSchema>;
const terms=z.array(z.string().trim().min(1).max(100)).max(20).default([]);
export const searchEnrichmentSchema=z.object({
  productId:id,aliases:terms,searchKeywords:terms,concerns:terms,useCases:terms,features:terms,
  audience:z.string().trim().max(40).default(''),bodyArea:z.string().trim().max(40).default(''),
  productKind:z.string().trim().max(80).default(''),
  provenance:z.enum(['curated','verified','ai-draft']),reviewed:z.boolean(),version:z.literal(1),
}).strict().refine(v=>v.provenance!=='ai-draft'||!v.reviewed);
export type SearchEnrichment=z.infer<typeof searchEnrichmentSchema>;
export const searchEventSchema=z.object({
  searchId:z.uuid(),previousSearchId:z.uuid().optional(),event:z.enum(['search_performed','search_result_impression','search_result_clicked','search_add_to_cart','search_checkout','search_exited']),
  items:z.array(z.object({productId:id,position:z.number().int().min(1).max(300)}).strict()).max(30),
  query:z.string().trim().min(1).max(80).optional(),locale:z.enum(['en','ar']).optional(),
}).strict();
export type SearchEvent=z.infer<typeof searchEventSchema>;
export const searchAttributionSchema=z.array(z.object({searchId:z.uuid(),productId:id,position:z.number().int().min(1).max(300)}).strict()).max(50);
const searchQueryMetricSchema=z.object({query:z.string().max(160),count:z.number(),zero:z.number(),matched:z.number(),relaxed:z.number(),corrected:z.number(),clicks:z.number(),carts:z.number(),checkouts:z.number(),purchases:z.number(),revenueMinor:z.number(),reformulated:z.number(),exits:z.number(),ctr:z.number()}).strict();
export const searchAnalyticsSchema=z.object({days:z.number().int(),retentionDays:z.literal(7),queries:z.array(searchQueryMetricSchema).max(50),zeroQueries:z.array(searchQueryMetricSchema).max(50),lowCtrQueries:z.array(searchQueryMetricSchema).max(50),convertingQueries:z.array(searchQueryMetricSchema).max(50),events:z.array(z.object({event:z.string(),count:z.number(),revenueMinor:z.number()})).max(10),summary:z.object({searches:z.number(),usageRate:z.number(),zeroResultRate:z.number(),ctr:z.number(),firstResultCtr:z.number(),cartRate:z.number(),checkoutRate:z.number(),purchaseRate:z.number(),revenuePerSearchMinor:z.number(),reformulationRate:z.number(),exitAfterSearchRate:z.number()})}).strict();
export const searchAdminSchema=z.object({synonyms:z.array(synonymSchema).max(500),rules:z.array(searchRuleSchema).max(200),analytics:searchAnalyticsSchema,provider:z.enum(['legacy','atlas'])}).strict();
export const searchDiagnosticSchema=z.object({searchId:z.uuid(),requestId:z.uuid().optional(),locale:z.enum(['en','ar']),queryHash:z.string().regex(/^[a-f0-9]{64}$/),operation:z.enum(['search','suggest']),lexical:z.number(),semantic:z.number(),resultCount:z.number(),relaxed:z.boolean(),corrected:z.boolean(),unavailable:z.boolean(),parseMs:z.number(),lexicalMs:z.number(),vectorMs:z.number(),fusionMs:z.number(),durationMs:z.number()}).strict();
export const searchTestSchema=z.object({response:searchResponseSchema,diagnostic:searchDiagnosticSchema,explanation:z.array(z.object({productId:z.string(),name:z.string(),tier:z.number(),matchedFields:z.array(z.string()),lexicalRank:z.number().nullable(),semanticRank:z.number().nullable(),fusion:z.number(),businessBoost:z.number()})).max(30)}).strict();
