import { ObjectId,type Db,type Document } from 'mongodb';
import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { indexPlan } from '../../apps/api/src/database/indexes.js';
import { readSearchEnvironment } from '../../apps/api/src/modules/search/config.js';
import { searchIndexDefinitions } from '../../apps/api/src/modules/search/index-definition.js';
import { seedSynonyms,atlasSynonym } from '../../apps/api/src/modules/search/synonyms.js';
import { searchDocument,semanticText,semanticHash } from '../../apps/api/src/modules/search/enrichment.js';
import { geminiEmbeddings } from '../../apps/api/src/modules/search/embedding-provider.js';
import { semanticSeedQueries } from '../../apps/api/src/modules/search/embedding-worker.js';
import { queryHashInput } from '../../apps/api/src/modules/search/query-normalizer.js';
const [operation,...args]=process.argv.slice(2),apply=args.includes('--apply'),env=readSearchEnvironment(process.env);
const value=(name:string)=>args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
const batch=Number(value('--limit')??100),cursor=value('--cursor');
if(!Number.isInteger(batch)||batch<1||batch>200||cursor&&!/^[a-f0-9]{24}$/i.test(cursor)||args.some(a=>a!=='--apply'&&!/^--(?:limit|cursor)=/.test(a)))throw Error('Invalid search job arguments');
const operations=['indexes','verify','synonyms','backfill','embeddings-missing','embeddings-rebuild','query-vectors','signals'];
async function main(){
 if(!operation||!operations.includes(operation))throw Error('Invalid operation');
 if(!apply&&operation!=='verify'){console.log(JSON.stringify({operation,mode:'plan',batch,cursor:cursor??null,...(operation==='indexes'?{indexes:searchIndexDefinitions(env),ordinaryIndexes:Object.fromEntries(Object.entries(indexPlan).filter(([name])=>name.startsWith('search_')||name==='products').map(([name,indexes])=>[name,name==='products'?indexes.filter(index=>index.name?.startsWith('search_')):indexes]))}:{}),...(operation==='synonyms'?{seed:seedSynonyms}:{})},null,2));return;}
 const config=readApiEnvironment(process.env);if(config.database.mode!=='enabled')throw Error('Database disabled');const database=createDatabase(config.database);
 try{const db=await database.getDb();
 if(operation==='indexes'){
  const collection=db.collection('products'),existing=await collection.aggregate<Document>([{$listSearchIndexes:{}}]).toArray();
  for(const definition of searchIndexDefinitions(env)){
   const prior=existing.find(index=>index.name===definition.name);
   if(prior){if(prior.type!==definition.type)throw Error('Index type conflict; use a new versioned index name');await collection.updateSearchIndex(definition.name,definition.definition);}
   else await collection.createSearchIndex(definition);
  }
  for(const [name,indexes] of Object.entries(indexPlan))if(name.startsWith('search_'))await db.collection(name).createIndexes([...indexes],{maxTimeMS:60000});
  await collection.createIndexes([...(indexPlan.products??[])].filter(index=>index.name?.startsWith('search_')),{maxTimeMS:60000});
  console.log(JSON.stringify({event:'search_indexes_submitted',note:'Run verify; asynchronous index build is not readiness.'}));
 }else if(operation==='verify'){
  const indexes=await db.collection('products').aggregate<Document>([{$listSearchIndexes:{}}]).toArray();const required=searchIndexDefinitions(env);const status=required.map(def=>({name:def.name,type:def.type,ready:indexes.some(i=>i.name===def.name&&i.type===def.type&&i.status==='READY'&&i.queryable===true)}));console.log(JSON.stringify({indexes:status}));if(status.some(i=>!i.ready))process.exitCode=1;
 }else if(operation==='synonyms'){
  for(const item of seedSynonyms){await db.collection<Document&{_id:string}>('search_synonyms').updateOne({_id:item.key},{$setOnInsert:{...item}},{upsert:true,maxTimeMS:3000});}
  const actual=await db.collection('search_synonyms').find({},{projection:{_id:0},maxTimeMS:3000}).limit(500).toArray();
  const {synonymSchema}=await import('@almina/contracts/search');for(const row of actual){const item=synonymSchema.parse(row);if(item.enabled)await db.collection<Document&{_id:string}>('search_synonyms_atlas').replaceOne({_id:item.key},{_id:item.key,...atlasSynonym(item)},{upsert:true,maxTimeMS:3000});else await db.collection<Document&{_id:string}>('search_synonyms_atlas').deleteOne({_id:item.key});}
  console.log(JSON.stringify({event:'search_synonyms_seeded',count:actual.length}));
 }else if(operation==='signals'){await signals(db);}
 else if(operation==='query-vectors'){
  const provider=geminiEmbeddings(env,process.env.SEARCH_EMBEDDING_API_KEY??'');
  const seeds=semanticSeedQueries;
  for(const query of seeds){const locale=/[\u0600-\u06ff]/.test(query)?'ar':'en',queryHash=semanticHash(queryHashInput(query,locale));await db.collection<Document&{_id:string}>('search_query_queue').updateOne({_id:queryHash},{$setOnInsert:{queryHash,query,locale,state:'pending',expiresAt:new Date(Date.now()+7*86400000)}},{upsert:true,maxTimeMS:1000});}
  const queries=await db.collection('search_query_queue').find({state:'pending',expiresAt:{$gt:new Date()}},{maxTimeMS:3000}).sort({_id:1}).limit(batch).toArray();let processed=0;
  for(const row of queries){const prior=await db.collection('search_query_vectors').findOne({queryHash:row.queryHash,model:env.EMBEDDING_MODEL,version:1,expiresAt:{$gt:new Date()}},{projection:{_id:1}});
   if(!prior){const vector=await provider.embed(String(row.query),'query');await db.collection<Document&{_id:string}>('search_query_vectors').updateOne({_id:String(row.queryHash)},{$set:{queryHash:row.queryHash,vector,model:env.EMBEDDING_MODEL,version:1,updatedAt:new Date(),expiresAt:new Date(Date.now()+7*86400000)}},{upsert:true,maxTimeMS:3000});}
   await db.collection('search_query_queue').updateOne({_id:row._id},{$set:{state:'complete'}},{maxTimeMS:1000});processed++;}
  console.log(JSON.stringify({event:'query_vectors_prepared',processed}));
 }else{
  const rows=await db.collection('products').aggregate<Document>([{$match:{archivedAt:{$exists:false},...(cursor?{_id:{$gt:new ObjectId(cursor)}}:{})}},{$sort:{_id:1}},{$limit:batch},{$lookup:{from:'categories',localField:'category',foreignField:'_id',as:'category',pipeline:[{$project:{name:1}}]}},{$unwind:{path:'$category',preserveNullAndEmptyArrays:true}}],{maxTimeMS:3000}).toArray();let processed=0,changed=0;
  const provider=operation.startsWith('embeddings')?geminiEmbeddings(env,process.env.SEARCH_EMBEDDING_API_KEY??''):null;
  for(const row of rows){const categoryName=String(row.category?.name??''),document=searchDocument(row,categoryName);let update:Document={searchDocument:document};
   if(provider){if(row.productType!=='general'||row.contentReviewed!==true){processed++;continue;}const text=semanticText(row,categoryName),hash=semanticHash(text);
    if(operation==='embeddings-missing'&&row.searchEmbedding?.semanticTextHash===hash&&row.searchEmbedding?.model===env.EMBEDDING_MODEL&&row.searchEmbedding?.version===1&&row.searchEmbedding?.vector?.length===env.SEARCH_EMBEDDING_DIMENSIONS){processed++;continue;}
    const vector=await provider.embed(text,'document');update={...update,searchEmbedding:{vector,model:env.EMBEDDING_MODEL,version:1,updatedAt:new Date(),semanticTextHash:hash}};
   }
   const result=await db.collection('products').updateOne({_id:row._id,updatedAt:row.updatedAt??{$exists:false},searchMetadataRevision:row.searchMetadataRevision??{$exists:false}},{$set:update},{maxTimeMS:3000});changed+=result.modifiedCount;processed++;
  }
  console.log(JSON.stringify({event:'search_batch_complete',operation,processed,changed,nextCursor:rows.length===batch?String(rows.at(-1)!._id):null}));
 }
 }finally{await database.close();}
}
async function signals(db:Db){
 const since=new Date(Date.now()-30*86400000);
 const rows=await db.collection('search_events').aggregate<Document>([{$match:{createdAt:{$gte:since},productId:{$regex:'^[a-f0-9]{24}$'}}},{$set:{weight:{$exp:{$multiply:[-1,{$divide:[{$subtract:[new Date(),'$createdAt']},14*86400000]}]}}}},{$group:{_id:'$productId',views:{$sum:{$cond:[{$eq:['$event','search_result_impression']},'$weight',0]}},clicks:{$sum:{$cond:[{$eq:['$event','search_result_clicked']},'$weight',0]}},carts:{$sum:{$cond:[{$eq:['$event','search_add_to_cart']},'$weight',0]}},sales:{$sum:{$cond:[{$eq:['$event','search_purchase']},'$weight',0]}}}},{$sort:{_id:1}},{$limit:20000}],{maxTimeMS:10000,allowDiskUse:false}).toArray();
 for(let i=0;i<rows.length;i+=200)await db.collection('products').bulkWrite(rows.slice(i,i+200).map(row=>({updateOne:{filter:{_id:new ObjectId(String(row._id))},update:{$set:{searchSignals:{popularity:Math.min(1,Math.log1p(row.clicks+row.carts*2+row.sales*4)/10),conversion:Math.min(1,row.sales/Math.max(20,row.views)),updatedAt:new Date()}}}}})),{ordered:false,maxTimeMS:3000});
 const trends=await db.collection('search_query_daily').aggregate<Document>([
  {$match:{day:{$gte:since.toISOString().slice(0,10)},query:{$type:'string'}}},
  {$group:{_id:'$query',count30d:{$sum:'$count'},count7d:{$sum:{$cond:[{$gte:['$day',new Date(Date.now()-7*86400000).toISOString().slice(0,10)]},'$count',0]}},count24h:{$sum:{$cond:[{$gte:['$day',new Date(Date.now()-86400000).toISOString().slice(0,10)]},'$count',0]}}}},
  {$match:{count7d:{$gte:10}}},{$sort:{count7d:-1,_id:1}},{$limit:100},
 ],{maxTimeMS:3000}).toArray();
 for(const trend of trends){const query=String(trend._id),prefixes=Array.from({length:Math.min(79,query.length-1)},(_,i)=>query.slice(0,i+2));await db.collection<Document&{_id:string}>('search_popular').updateOne({_id:semanticHash(query)},{$set:{query,prefixes,count:trend.count7d,count24h:trend.count24h,count7d:trend.count7d,count30d:trend.count30d,updatedAt:new Date(),expiresAt:new Date(Date.now()+86400000)}},{upsert:true,maxTimeMS:1000});}
 console.log(JSON.stringify({event:'search_signals_aggregated',products:rows.length}));
}
void main().catch(()=>{console.error(JSON.stringify({event:'search_operation_failed',operation,mode:apply?'apply':'read',note:'Check configuration, permissions and index status; provider errors are redacted.'}));process.exitCode=1;});
