import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient,type Document} from 'mongodb';
import {searchQuerySchema,searchResponseSchema,searchSuggestionsSchema} from '@almina/contracts/search';
import {readSearchEnvironment} from '../apps/api/src/modules/search/config';
import {searchIndexDefinitions} from '../apps/api/src/modules/search/index-definition';
import {AtlasSearchProvider} from '../apps/api/src/modules/search/atlas-provider';
import {SearchService} from '../apps/api/src/modules/search/search-service';
import {searchConfiguration} from '../apps/api/src/modules/search/runtime';
import {goldenQueries} from './fixtures/search/catalog';
const enabled=process.env.SEARCH_ATLAS_TEST_ENABLED==='true';
test('opt-in staging Atlas acceptance, query execution and golden relevance',{skip:!enabled},async t=>{
 assert.ok(process.env.SEARCH_ATLAS_TEST_URI&&process.env.SEARCH_ATLAS_TEST_DATABASE,'Set explicit staging Atlas test credentials; application credentials are never inherited');
 const client=await new MongoClient(process.env.SEARCH_ATLAS_TEST_URI!,{serverSelectionTimeoutMS:3000}).connect();
 try{const db=client.db(process.env.SEARCH_ATLAS_TEST_DATABASE),env=readSearchEnvironment({...process.env,SEARCH_PROVIDER:'atlas'}),indexes=await db.collection('products').aggregate<Document>([{$listSearchIndexes:{}}]).toArray();
 for(const definition of searchIndexDefinitions(env))assert.ok(indexes.some(i=>i.name===definition.name&&i.type===definition.type&&i.status==='READY'&&i.queryable===true),`Index ${definition.name} must be READY`);
 for(const row of goldenQueries)await t.test(row.query,async()=>{const service=new SearchService(new AtlasSearchProvider(db,env),()=>searchConfiguration(db));const {response}=await service.search(searchQuerySchema.parse({q:row.query}));assert.ok(searchResponseSchema.safeParse(response).success);assert.equal(response.unavailable,false);
 if(row.expectedProducts.length)assert.ok(response.products.slice(0,5).some(p=>row.expectedProducts.includes(String(p.product_id))),'Expected relevant product in top five');
 const suggestions=await service.suggest(searchQuerySchema.parse({q:row.query.slice(0,5)}));assert.ok(searchSuggestionsSchema.safeParse(suggestions).success);assert.equal(suggestions.unavailable,false);
 });
 }finally{await client.close();}
});
