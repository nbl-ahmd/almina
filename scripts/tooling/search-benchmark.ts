import { MongoClient,type Db } from 'mongodb';
import { searchQuerySchema } from '@almina/contracts/search';
import { readSearchEnvironment } from '../../apps/api/src/modules/search/config';
import { AtlasSearchProvider,emptySuggestions } from '../../apps/api/src/modules/search/atlas-provider';
import { SearchService } from '../../apps/api/src/modules/search/search-service';
import { searchConfiguration } from '../../apps/api/src/modules/search/runtime';
import { seedSynonyms } from '../../apps/api/src/modules/search/synonyms';
import { knownBrands } from '../../apps/api/src/modules/search/query-intent';
import type { SearchProvider } from '../../apps/api/src/modules/search/search-types';
import { searchProducts,withCategory,goldenQueries,lexicalFixtures } from '../../tests/fixtures/search/catalog';
export function relevanceMetrics(actual:string[],expected:string[],k=5){
 const found=new Set(expected),top=actual.slice(0,k),first=actual.findIndex(id=>found.has(id));
 const dcg=top.reduce((sum,id,index)=>sum+(found.has(id)?1/Math.log2(index+2):0),0),ideal=Array.from({length:Math.min(k,found.size)},(_,i)=>1/Math.log2(i+2)).reduce((sum,n)=>sum+n,0);
 return {mrr:expected.length?(first<0?0:1/(first+1)):null,precisionAtK:expected.length?top.filter(id=>found.has(id)).length/k:null,ndcgAtK:ideal?dcg/ideal:null,zeroResultCorrect:expected.length?null:actual.length===0};
}
type BenchmarkRow={query:string;expectedProducts:string[];actual:string[];unavailable:boolean}&ReturnType<typeof relevanceMetrics>;
const percentile=(values:number[],p:number)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*p)-1)]??0;
async function main(){
 const atlas=process.argv.includes('--atlas');let client:MongoClient|undefined;let service:SearchService;
 if(atlas){if(!process.env.SEARCH_ATLAS_TEST_URI||!process.env.SEARCH_ATLAS_TEST_DATABASE)throw Error('Explicit staging Atlas test configuration required');client=await new MongoClient(process.env.SEARCH_ATLAS_TEST_URI,{serverSelectionTimeoutMS:3000}).connect();const db:Db=client.db(process.env.SEARCH_ATLAS_TEST_DATABASE),env=readSearchEnvironment({...process.env,SEARCH_PROVIDER:'atlas'});service=new SearchService(new AtlasSearchProvider(db,env),()=>searchConfiguration(db));}
 else{const fixture:SearchProvider={search:async request=>{const key=Object.keys(lexicalFixtures).find(q=>q===request.input.q&&lexicalFixtures[q]!.length)||request.text;return (lexicalFixtures[key]??[]).map((index,rank)=>({product:withCategory(searchProducts[index]!),tier:4,lexicalRank:rank+1,matchedFields:['provider-fixture']}));},suggest:async()=>emptySuggestions(),hydrate:async()=>[],semanticSearch:async request=>request.input.q==='something gentle for dry skin'?[0,2,3].map((index,rank)=>({product:withCategory(searchProducts[index]!),tier:7,semanticRank:rank+1,matchedFields:['vector-provider-fixture']})):[]};service=new SearchService(fixture,async()=>({synonyms:seedSynonyms,rules:[],brands:knownBrands}));}
 try{const cases=[...new Map([...goldenQueries,{query:'PD1945',expectedProducts:['PD1945']},{query:'6291101234500',expectedProducts:['PD1945']},{query:'واقي الشمس',expectedProducts:['PD1952']},{query:'something gentle for dry skin',expectedProducts:['PD1945','PD1947','PD1948']},{query:'zzzz unknown product',expectedProducts:[]}].map(row=>[row.query,row])).values()];const times:number[]=[],suggestTimes:number[]=[],results:BenchmarkRow[]=[];
 for(const row of cases){const started=performance.now(),result=await service.search(searchQuerySchema.parse({q:row.query}));times.push(performance.now()-started);const actual=result.response.products.map(p=>String(p.product_id));results.push({query:row.query,expectedProducts:row.expectedProducts,actual,...relevanceMetrics(actual,row.expectedProducts),unavailable:result.response.unavailable});const suggestStarted=performance.now();await service.suggest(searchQuerySchema.parse({q:row.query}));suggestTimes.push(performance.now()-suggestStarted);}
 const mean=(key:'mrr'|'precisionAtK'|'ndcgAtK')=>{const values=results.flatMap(row=>row[key]===null?[]:[row[key]]);return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;};
 console.log(JSON.stringify({mode:atlas?'staging-atlas':'offline-provider-fixture',note:atlas?'Read-only Atlas benchmark; requires a fixture-equivalent staging catalogue.':'Service/ranker contract timings only. This does not measure Atlas retrieval, M0 latency or real catalogue relevance.',queries:results.length,latencyMs:{p50:percentile(times,.5),p95:percentile(times,.95),p99:percentile(times,.99)},autocompleteMs:{p50:percentile(suggestTimes,.5),p95:percentile(suggestTimes,.95),p99:percentile(suggestTimes,.99)},mean:{mrr:mean('mrr'),precisionAt5:mean('precisionAtK'),ndcgAt5:mean('ndcgAtK')},results},null,2));
 if(atlas&&results.some(row=>row.unavailable||row.expectedProducts.length&&!row.actual.some(id=>row.expectedProducts.includes(id))))process.exitCode=1;
 }finally{await client?.close();}
}
if(process.argv[1]?.endsWith('search-benchmark.ts'))void main().catch(()=>{console.error('Search benchmark failed; check explicit staging configuration and index readiness.');process.exitCode=1;});
