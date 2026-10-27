import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import {searchQuerySchema,searchEnrichmentSchema,searchRuleSchema} from '@almina/contracts/search';
import {normalizeSearch,exactIdentifier} from '../apps/api/src/modules/search/query-normalizer';
import {queryIntent,relaxationQueries} from '../apps/api/src/modules/search/query-intent';
import {seedSynonyms,expandSynonyms,atlasSynonym} from '../apps/api/src/modules/search/synonyms';
import {rankCandidates,businessBoost} from '../apps/api/src/modules/search/ranking';
import {searchDocument,semanticText,semanticHash} from '../apps/api/src/modules/search/enrichment';
import {readSearchEnvironment} from '../apps/api/src/modules/search/config';
import {searchIndexDefinitions} from '../apps/api/src/modules/search/index-definition';
import {queryCanBeRetained} from '../apps/api/src/modules/search/analytics';
import {searchProducts,withCategory} from './fixtures/search/catalog';
import type {Candidate} from '../apps/api/src/modules/search/search-types';
const input=(q:string)=>searchQuerySchema.parse({q});
test('normalization covers Unicode, apostrophes, Arabic and unit spacing without losing identifiers',()=>{
 assert.equal(normalizeSearch("  JOHNSON’S Sun-Cream 500ML  "),'johnsons sun cream 500 ml');
 assert.equal(normalizeSearch('إِبْرَة ـ ٥٠٠'),normalizeSearch('ابرة 500'));
 assert.equal(normalizeSearch('moisturiser'),normalizeSearch('moisturizer'));
 assert.equal(exactIdentifier('PD1945'),'PD1945');assert.equal(exactIdentifier('0000123456789'),'0000123456789');assert.equal(exactIdentifier('500ml'),undefined);assert.equal(exactIdentifier('B12'),undefined);assert.equal(exactIdentifier('Panadol500mg'),undefined);assert.equal(normalizeSearch('Panadol500mg'),'panadol 500 mg');
});
test('customer vocabulary expands directionally and never maps arbitrary milk to infant formula',()=>{
 assert.ok(expandSynonyms('nappy',seedSynonyms).includes('diaper'));assert.ok(expandSynonyms('diaper',seedSynonyms).includes('nappy'));
 assert.ok(expandSynonyms('sugar checking machine',seedSynonyms).includes('glucose monitor'));
 assert.ok(!expandSynonyms('glucose monitor',seedSynonyms).includes('sugar checking machine'));assert.deepEqual(expandSynonyms('milk',seedSynonyms),[]);
 assert.ok(expandSynonyms('واقي الشمس',seedSynonyms,'ar').includes('sunscreen'));
 assert.equal(atlasSynonym(seedSynonyms[3]!).mappingType,'explicit');
});
test('intent preserves explicit filters, extracts prices, size and brand and limits relaxation',()=>{
 const under=queryIntent(input('products under 50'));assert.equal(under.intent.maxPrice,50);assert.equal(under.text,'');
 const cheap=queryIntent(input('cheap cerave cleanser'));assert.equal(cheap.intent.brand,'CeraVe');assert.equal(cheap.intent.productKind,'cleanser');assert.equal(cheap.intent.priceIntent,'low');
 assert.equal(queryIntent(input('pampers size 4')).intent.size,'size 4');assert.equal(queryIntent(input('baby shampoo 900ml')).intent.audience,'baby');
 const phrase=queryIntent(input('johnsons baby shampoo 900ml'));assert.deepEqual(relaxationQueries(phrase.text,phrase.intent),['johnsons baby shampoo','johnsons shampoo','shampoo']);
 assert.deepEqual(relaxationQueries('PD1945',{concerns:[],identifier:'PD1945'}),[]);
 assert.equal(queryIntent({...input('under 50'),maxPrice:25}).intent.maxPrice,25);
});
test('external input is strict and bounded; unknown operators and extreme pages are rejected',()=>{
 for(const raw of [{q:{$ne:''}},{q:'x',page:11},{q:'x'.repeat(81)},{q:'x',filter:{$where:'x'}},{q:'x',minPrice:100,maxPrice:1},{q:'x',inStock:'anything'}])assert.equal(searchQuerySchema.safeParse(raw).success,false);
});
test('relevance tiers dominate semantic, stock, commercial signals and pins; boost is bounded',()=>{
 const exact:Candidate={product:withCategory({...searchProducts[0],stock:0}),tier:0,lexicalRank:1,matchedFields:['identifier']};
 const other:Candidate={product:withCategory({...searchProducts[2],featured:true,searchSignals:{popularity:100,conversion:100}}),tier:7,semanticRank:1,matchedFields:['vector']};
 assert.ok(businessBoost(other)<=0.05);assert.equal(rankCandidates([exact],[other],[])[0]!.tier,0);
 const rule=searchRuleSchema.parse({key:'pin-competitor',query:'cream',type:'pin',productId:String(other.product._id),enabled:true});
 assert.equal(rankCandidates([exact],[other],[rule])[0]!.product.product_id,exact.product.product_id);
 assert.equal(rankCandidates([exact],[other],[{...rule,type:'hide'}]).length,1);
});
test('families deduplicate and preserve the strongest exact variant while carrying option metadata',()=>{
 const family={familyKey:'cerave-cream',familyName:'CeraVe cream',familyBrand:'CeraVe',familyForm:'cream',familyStrength:'standard',variantSize:'454g'};
 const rows:Candidate[]=[{product:withCategory({...searchProducts[0],...family,stock:0}),tier:1,lexicalRank:1,matchedFields:['name']},
 {product:withCategory({...searchProducts[0],_id:new ObjectId(),...family,price:10}),tier:4,lexicalRank:2,matchedFields:['token']}];
 const ranked=rankCandidates(rows,[],[]);assert.equal(ranked.length,1);assert.equal(ranked[0]!.product.stock,0);assert.equal(ranked[0]!.product.familyOptionCount,2);assert.equal(ranked[0]!.product.familyPriceVaries,true);
});
test('unreviewed and AI-generated metadata never become authoritative search or clinical data',()=>{
 const raw=searchProducts[0]!;assert.ok(searchDocument(raw,'Skin').concerns.includes('dry skin'));
 const draft={...raw,searchEnrichment:{...raw.searchEnrichment,provenance:'ai-draft',reviewed:false,aliases:['invented treatment']}};
 assert.deepEqual(searchDocument(draft,'Skin').aliases,[]);assert.deepEqual(searchDocument({...raw,productType:'otc'},'Skin').concerns,[]);
 assert.equal(searchEnrichmentSchema.safeParse({...raw.searchEnrichment,provenance:'ai-draft'}).success,false);
 assert.equal(semanticHash(semanticText(raw,'Skin')),semanticHash(semanticText({...raw,price:1,stock:0},'Skin')));
 assert.notEqual(semanticHash(semanticText(raw,'Skin')),semanticHash(semanticText({...raw,name:'New name'},'Skin')));
});
test('indexes fit the two-index budget with one synonym mapping, identifier tokens and no dynamic indexing',()=>{
 const [lexical,vector]=searchIndexDefinitions(readSearchEnvironment({}));assert.equal(lexical!.definition.mappings!.dynamic,false);assert.equal(lexical!.definition.synonyms!.length,1);assert.ok(Buffer.byteLength(JSON.stringify(lexical!.definition))<=3072);assert.equal(lexical!.definition.mappings!.fields.product_id.type,'token');assert.equal(vector!.definition.fields!.filter(f=>f.type==='vector').length,1);
 assert.equal(readSearchEnvironment({}).SEARCH_PROVIDER,'legacy');assert.throws(()=>readSearchEnvironment({SEARCH_SEMANTIC_ENABLED:'yes'}));
});
test('obvious PII is excluded from retained query text',()=>{for(const q of ['email me a@b.com','call 0501234567','my diagnosed condition'])assert.equal(queryCanBeRetained(q),false);assert.equal(queryCanBeRetained('cream for dry skin'),true);});

test('offline embedding adapter bounds dimensions, selects retrieval task and normalizes vectors',async()=>{
 const {geminiEmbeddings}=await import('../apps/api/src/modules/search/embedding-provider');
 const env=readSearchEnvironment({SEARCH_EMBEDDING_DIMENSIONS:'128'});let body:Record<string,unknown>|undefined;
 const provider=geminiEmbeddings(env,'synthetic-test-key',async(_url,init)=>{body=JSON.parse(String(init?.body));assert.equal(new Headers(init?.headers).get('x-goog-api-key'),'synthetic-test-key');return Response.json({embedding:{values:Array(128).fill(1)}});});
 const vector=await provider.embed('Reviewed general-sale catalogue text','document');assert.equal(body!.taskType,'RETRIEVAL_DOCUMENT');assert.equal(vector.length,128);assert.ok(Math.abs(vector.reduce((sum,v)=>sum+v*v,0)-1)<1e-10);
 await provider.embed('Reviewed shopper vocabulary','query');assert.equal(body!.taskType,'RETRIEVAL_QUERY');
 await assert.rejects(geminiEmbeddings(env,'synthetic-test-key',async()=>Response.json({embedding:{values:[1]}})).embed('text','query'),/Invalid embedding response/);
});
