import test from 'node:test';
import assert from 'node:assert/strict';
import type { Document } from 'mongodb';
import {searchQuerySchema,searchResponseSchema,searchRuleSchema} from '@almina/contracts/search';
import {SearchService} from '../apps/api/src/modules/search/search-service';
import {emptySuggestions} from '../apps/api/src/modules/search/atlas-provider';
import {lexicalStage} from '../apps/api/src/modules/search/atlas-provider';
import {readSearchEnvironment} from '../apps/api/src/modules/search/config';
import {seedSynonyms} from '../apps/api/src/modules/search/synonyms';
import {knownBrands} from '../apps/api/src/modules/search/query-intent';
import {searchProducts,withCategory} from './fixtures/search/catalog';
import type {SearchProvider,Candidate} from '../apps/api/src/modules/search/search-types';
const candidate=(index:number,tier=4):Candidate=>({product:withCategory(searchProducts[index]!),tier,lexicalRank:index+1,matchedFields:['fixture']});
function provider(overrides:Partial<SearchProvider>={}):SearchProvider{return {search:async()=>[candidate(0)],semanticSearch:async()=>[],suggest:async()=>emptySuggestions(),hydrate:async()=>[] as Document[],...overrides};}
const configuration=async()=>({synonyms:seedSynonyms,rules:[],brands:knownBrands});
test('the service returns the public contract and strips embeddings, metadata and private supplier data',async()=>{
 const p=candidate(0);p.product.searchEmbedding={vector:[1,2]};p.product.supplierSecret='private';
 const {response}=await new SearchService(provider({search:async()=>[p]}),configuration).search(searchQuerySchema.parse({q:'cerave'}));
 assert.ok(searchResponseSchema.safeParse(response).success);assert.equal(Object.hasOwn(response.products[0]!,'supplierSecret'),false);assert.equal(Object.hasOwn(response.products[0]!,'searchEmbedding'),false);assert.equal(Object.hasOwn(response.products[0]!,'searchDocument'),false);
 assert.equal(response.brands[0]!.name,'CeraVe');assert.equal(response.pagination.resultCount,1);
});
test('correction is advisory, preserves useful fuzzy results and supports literal opt-out',async()=>{
 const service=new SearchService(provider({search:async()=>[{...candidate(2,6),matchedFields:['brand']}]}),configuration);
 assert.equal((await service.search(searchQuerySchema.parse({q:'cetaphill'}))).response.correction,'Cetaphil');
 assert.equal((await service.search(searchQuerySchema.parse({q:'cetaphill',literal:'true'}))).response.correction,null);
});
test('controlled relaxation excludes clinical products, retains original query and never relaxes identifiers',async()=>{
 const calls:string[]=[];
 const service=new SearchService(provider({search:async request=>{calls.push(request.text);return request.text==='baby shampoo'?[candidate(6)]:[];}}),configuration);
 const result=await service.search(searchQuerySchema.parse({q:'baby shampoo 900ml'}));assert.equal(result.response.relaxed,true);assert.equal(result.response.interpretedQuery,'baby shampoo');assert.equal(result.response.query,'baby shampoo 900ml');
 calls.length=0;await service.search(searchQuerySchema.parse({q:'PD1945'}));assert.deepEqual(calls,['PD1945']);
 const clinical=candidate(0);clinical.product.productType='otc';const restricted=new SearchService(provider({search:async r=>r.text==='baby shampoo'? [clinical]:[]}),configuration);assert.equal((await restricted.search(searchQuerySchema.parse({q:'baby shampoo 900ml'}))).response.products.length,0);
});
test('autocomplete never invokes vector retrieval; failures return an explicit unavailable response',async()=>{
 let vectors=0;const service=new SearchService(provider({suggest:async()=>{throw Error('offline');},semanticSearch:async()=>{vectors++;return [];}}),configuration);
 assert.equal((await service.suggest(searchQuerySchema.parse({q:'cer'}))).unavailable,true);assert.equal(vectors,0);
});
test('Atlas failures use only the exact-identifier fallback and no regex recovery',async()=>{
 let fallback=0;const service=new SearchService(provider({search:async()=>{throw Error('Atlas offline');},exactFallback:async()=>{fallback++;return [withCategory(searchProducts[0]!)];}}),configuration);
 assert.equal((await service.search(searchQuerySchema.parse({q:'PD1945'}))).response.products.length,1);assert.equal(fallback,1);
 assert.equal((await service.search(searchQuerySchema.parse({q:'unknown'}))).response.products.length,0);assert.equal(fallback,1);
});
test('curation hides only eligible candidates and cannot insert a foreign product or outrank exact matches',async()=>{
 const hidden=searchRuleSchema.parse({key:'hide-first',query:'cream',type:'hide',productId:String(searchProducts[0]!._id),enabled:true});
 const service=new SearchService(provider({search:async()=>[candidate(0),candidate(2)]}),async()=>({...await configuration(),rules:[hidden]}));
 assert.deepEqual((await service.search(searchQuerySchema.parse({q:'cream'}))).response.products.map(p=>p.product_id),[searchProducts[2]!.product_id]);
});
test('Atlas query separates fuzzy and synonym operators and keeps identifier matching exact',()=>{
 const env=readSearchEnvironment({SEARCH_PROVIDER:'atlas'}),request={input:searchQuerySchema.parse({q:'cetaphill'}),text:'cetaphill',intent:{concerns:[]},expansions:[]};
 assert.ok(JSON.stringify(lexicalStage(env,request,'fuzzy')).includes('fuzzy'));
 assert.ok(!JSON.stringify(lexicalStage(env,request,'synonym')).includes('fuzzy'));
 const id=lexicalStage(env,{...request,intent:{concerns:[],identifier:'PD1945'}});assert.ok(!JSON.stringify(id).includes('fuzzy'));assert.ok(!JSON.stringify(id).includes('$regex'));
});
