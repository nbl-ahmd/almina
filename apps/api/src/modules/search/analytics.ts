import type { Db,Document,ClientSession } from 'mongodb';
import { searchAttributionSchema,type SearchResponse,type SearchEvent } from '@almina/contracts/search';
import { normalizeSearch,queryHashInput } from './query-normalizer.js';
import { semanticHash } from './enrichment.js';
import { HttpError } from '../../errors.js';
import { readSearchEnvironment } from './config.js';
const options={maxTimeMS:1000};
const expires=(days:number)=>new Date(Date.now()+days*86400000);
export function queryCanBeRetained(query:string){return query.length>=2&&!/[@:/\\]|\d{7}|\b(?:my|i am|i have|diagnosed|patient|phone|email|address)\b/i.test(query);}
export async function saveSearchContext(db:Db,response:SearchResponse,locale:'en'|'ar'='en'){
 if(!readSearchEnvironment(process.env).SEARCH_ANALYTICS_ENABLED)return;
 await db.collection<Document&{_id:string}>('search_sessions').insertOne({_id:response.searchId,queryHash:semanticHash(normalizeSearch(response.query)),
  queryLength:response.query.length,intentTypes:Object.entries(response.interpretation).filter(([,value])=>value!==undefined&&(!Array.isArray(value)||value.length>0)).map(([key])=>key),resultCount:response.pagination.resultCount,relaxed:response.relaxed,corrected:Boolean(response.correction),locale,
  items:response.products.map((p,i)=>({productId:String(p._id),position:(response.pagination.page-1)*30+i+1})),createdAt:new Date(),expiresAt:expires(1/24)},options);
}
/** Anonymous, short-lived search journey. Never store customer/order identity, IP or cookies. */
export async function recordSearchEvent(db:Db,event:SearchEvent){
 const sessions=db.collection<Document&{_id:string}>('search_sessions');
 const context=await sessions.findOne({_id:event.searchId,expiresAt:{$gt:new Date()}},options);if(!context)throw new HttpError(400,'INVALID_REQUEST');
 if(event.items.some(item=>!context.items.some((allowed:{productId:string;position:number})=>allowed.productId===item.productId&&allowed.position===item.position)))throw new HttpError(400,'INVALID_REQUEST');
 const previous=event.previousSearchId?await sessions.findOne({_id:event.previousSearchId,consented:true,createdAt:{$gt:new Date(Date.now()-300000)},expiresAt:{$gt:new Date()}},options):null;
 const reformulated=Boolean(previous&&previous.queryHash!==context.queryHash);
 const query=event.query?normalizeSearch(event.query):undefined;
 if(query&&semanticHash(query)!==context.queryHash)throw new HttpError(400,'INVALID_REQUEST');
 const queryFields=query&&queryCanBeRetained(query)?{normalizedQuery:query}:{};
 await sessions.updateOne({_id:event.searchId},{$set:{consented:true,expiresAt:expires(7),...(reformulated?{reformulated:true}:{}),...queryFields},$addToSet:{events:event.event}},options);
 const rows=event.items.length?event.items:[{productId:'query',position:0}];
 const inserted=await db.collection<Document&{_id:string}>('search_events').bulkWrite(rows.map(item=>({updateOne:{filter:{_id:`${event.searchId}:${event.event}:${item.productId}`},update:{$setOnInsert:{searchId:event.searchId,event:event.event,...item,createdAt:new Date(),expiresAt:expires(30)}},upsert:true}})),{...options,ordered:false});
 if(event.event==='search_performed'&&inserted.upsertedCount){const day=new Date().toISOString().slice(0,10);
  const {searchConfiguration}=await import('./runtime.js');const config=await searchConfiguration(db);const allowed=new Set([...config.synonyms.filter(s=>s.enabled).flatMap(s=>[...s.inputs,...s.outputs]),...config.brands,...(config.navigation??[]).map(n=>n.name)].map(normalizeSearch));
  const label=query&&queryCanBeRetained(query)&&allowed.has(query)?query:undefined;
  await db.collection<Document&{_id:string}>('search_query_daily').updateOne({_id:`${day}:${context.queryHash}`},{$inc:{count:1,zero:context.resultCount===0?1:0},$set:{updatedAt:new Date()},$setOnInsert:{day,queryHash:context.queryHash,...(label?{query:label}:{}),expiresAt:expires(30)}},{...options,upsert:true});
 }
 if(query&&queryCanBeRetained(query)&&query.split(' ').length>=3){const queryHash=semanticHash(queryHashInput(query,event.locale??context.locale));await db.collection<Document&{_id:string}>('search_query_queue').updateOne({_id:queryHash},{$setOnInsert:{queryHash,query,locale:event.locale??context.locale,state:'review',createdAt:new Date(),expiresAt:expires(7)}},{...options,upsert:true});}
}
export async function verifiedSearchAttribution(db:Db,raw:unknown,productIds:string[],session?:ClientSession){
 const parsed=searchAttributionSchema.safeParse(raw);if(!parsed.success||!parsed.data.length)return [];
 const unique=[...new Map(parsed.data.map(row=>[row.productId,row])).values()].filter(row=>productIds.includes(row.productId));
 const contexts=await db.collection<Document&{_id:string}>('search_sessions').find({_id:{$in:unique.map(row=>row.searchId)},consented:true,expiresAt:{$gt:new Date()}},{...options,...(session?{session}:{}),projection:{items:1}}).limit(50).toArray();
 return unique.filter(row=>contexts.some(c=>String(c._id)===row.searchId&&c.items.some((item:{productId:string;position:number})=>item.productId===row.productId&&item.position===row.position)));
}
export async function searchAnalytics(db:Db,days=7){
 const since=new Date(Date.now()-days*86400000);
 const eventFlag=(name:string)=>({$sum:{$cond:[{$in:[name,{$ifNull:['$events',[]]}]},1,0]}});
 const counters={count:{$sum:1},zero:{$sum:{$cond:[{$eq:['$resultCount',0]},1,0]}},matched:{$sum:{$cond:[{$gt:['$resultCount',0]},1,0]}},
  relaxed:{$sum:{$cond:['$relaxed',1,0]}},corrected:{$sum:{$cond:['$corrected',1,0]}},clicks:eventFlag('search_result_clicked'),carts:eventFlag('search_add_to_cart'),
  checkouts:eventFlag('search_checkout'),exits:eventFlag('search_exited'),purchases:eventFlag('search_purchase'),revenueMinor:{$sum:{$ifNull:['$revenueMinor',0]}},reformulated:{$sum:{$cond:['$reformulated',1,0]}}};
 const queryGroup={$group:{_id:'$normalizedQuery',...counters}};
 const [faceted,events,first,pageViews]=await Promise.all([
 db.collection('search_sessions').aggregate<Document>([{$match:{consented:true,createdAt:{$gte:since},expiresAt:{$gt:new Date()}}},{$facet:{
  queries:[{$match:{normalizedQuery:{$type:'string'}}},queryGroup,{$sort:{count:-1,_id:1}},{$limit:50}],
  zero:[{$match:{normalizedQuery:{$type:'string'},resultCount:0}},queryGroup,{$sort:{count:-1,_id:1}},{$limit:50}],
  lowCtr:[{$match:{normalizedQuery:{$type:'string'}}},queryGroup,{$match:{count:{$gte:5}}},{$set:{ctr:{$divide:['$clicks','$count']}}},{$sort:{ctr:1,count:-1,_id:1}},{$limit:50}],
  conversion:[{$match:{normalizedQuery:{$type:'string'}}},queryGroup,{$match:{purchases:{$gt:0}}},{$sort:{purchases:-1,revenueMinor:-1,_id:1}},{$limit:50}],
  summary:[{$group:{_id:null,...counters}}],
 }}],{maxTimeMS:3000,allowDiskUse:false}).toArray(),
 db.collection('search_events').aggregate<Document>([{$match:{createdAt:{$gte:since}}},{$group:{_id:'$event',count:{$sum:1},revenueMinor:{$sum:{$ifNull:['$revenueMinor',0]}}}},{$sort:{_id:1}}],{maxTimeMS:3000}).toArray(),
 db.collection('search_events').aggregate<Document>([{$match:{createdAt:{$gte:since},position:1,event:{$in:['search_result_impression','search_result_clicked']}}},{$group:{_id:'$event',count:{$sum:1}}}],{maxTimeMS:1000}).toArray(),
 db.collection('growth_activity').aggregate<Document>([{$match:{event:'page_viewed',day:{$gte:since.toISOString().slice(0,10)}}},{$group:{_id:null,count:{$sum:'$count'}}}],{maxTimeMS:1000}).toArray(),
 ]);
 const groups=faceted[0]??{},total=groups.summary?.[0]??{},searches=Number(total.count??0),sum=(key:string)=>Number(total[key]??0),rate=(n:number)=>searches?n/searches:0;
 const firstClicks=Number(first.find(e=>e._id==='search_result_clicked')?.count??0),firstViews=Number(first.find(e=>e._id==='search_result_impression')?.count??0);
 const queries=(rows:Document[]=[])=>rows.map(q=>({query:String(q._id),count:q.count,zero:q.zero,matched:q.matched,relaxed:q.relaxed,corrected:q.corrected,clicks:q.clicks,carts:q.carts,checkouts:q.checkouts,purchases:q.purchases,revenueMinor:q.revenueMinor,reformulated:q.reformulated,exits:q.exits,ctr:q.count?q.clicks/q.count:0}));
 return {days,summary:{searches,usageRate:pageViews[0]?.count?searches/pageViews[0].count:0,zeroResultRate:rate(sum('zero')),ctr:rate(sum('clicks')),firstResultCtr:firstViews?firstClicks/firstViews:0,cartRate:rate(sum('carts')),checkoutRate:rate(sum('checkouts')),purchaseRate:rate(sum('purchases')),revenuePerSearchMinor:rate(sum('revenueMinor')),reformulationRate:rate(sum('reformulated')),exitAfterSearchRate:rate(sum('exits'))},queries:queries(groups.queries),zeroQueries:queries(groups.zero),lowCtrQueries:queries(groups.lowCtr),convertingQueries:queries(groups.conversion),events:events.map(e=>({event:String(e._id),count:e.count,revenueMinor:e.revenueMinor})),retentionDays:7 as const};
}
