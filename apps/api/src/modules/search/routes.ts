import type { Router,Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { searchQuerySchema,searchResponseSchema,searchSuggestionsSchema,searchEventSchema,synonymSchema,searchRuleSchema,searchEnrichmentSchema } from '@almina/contracts/search';
import type { Staff } from '@almina/contracts';
import { emptyQuerySchema } from '@almina/contracts';
import type { GetDb } from '../../database.js';
import { validate,noBody } from '../../http/validation.js';
import { verifyBrowserMutation } from '../auth/cookies.js';
import { HttpError } from '../../errors.js';
import { searchService,invalidateSearchConfiguration,searchConfiguration } from './runtime.js';
import { readSearchEnvironment } from './config.js';
import { saveSearchContext,recordSearchEvent,searchAnalytics } from './analytics.js';
import { seedSynonyms,atlasSynonym } from './synonyms.js';
import {semanticHash} from './enrichment.js';
import {queryHashInput} from './query-normalizer.js';
import { searchDocument } from './enrichment.js';
import { ObjectId,type Document } from 'mongodb';
import type { SearchDiagnostic } from './search-types.js';
export function installSearchRoutes(router:Router,getDb:GetDb,origins:string[],identity:(req:Request,admin?:boolean)=>Promise<Staff>,observe?:(measurement:SearchDiagnostic)=>void){
 const limit=rateLimit({windowMs:60000,limit:100,standardHeaders:'draft-8',legacyHeaders:false,handler:(_req,_res,next)=>next(new HttpError(429,'RATE_LIMITED'))});
 router.get('/search',limit,async(req,res)=>{noBody(req);const input=validate(searchQuerySchema,req.query),db=await getDb();const result=await searchService(db,measurement=>observe?.({...measurement,requestId:res.locals.requestId})).search(input);
 await saveSearchContext(db,result.response,input.locale).catch(()=>{});res.json({data:searchResponseSchema.parse(result.response),requestId:res.locals.requestId});});
 router.get('/search/suggest',limit,async(req,res)=>{noBody(req);const input=validate(searchQuerySchema,req.query);if(input.q.length<2)throw new HttpError(400,'INVALID_REQUEST');const db=await getDb();const result=await searchService(db,measurement=>observe?.({...measurement,requestId:res.locals.requestId})).suggest(input);
 if(readSearchEnvironment(process.env).SEARCH_ANALYTICS_ENABLED){const since=new Date(Date.now()-30*86400000);result.popular=(await db.collection('search_popular').find({prefixes:input.q.toLowerCase(),count:{$gte:10},updatedAt:{$gte:since}},{projection:{query:1},maxTimeMS:500}).sort({count:-1}).limit(3).toArray().catch(()=>[])).map(row=>({name:String(row.query),href:'/search?'+new URLSearchParams({q:String(row.query)})}));}
 res.json({data:searchSuggestionsSchema.parse(result),requestId:res.locals.requestId});});
 router.post('/search/events',limit,async(req,res)=>{verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);
 if(!readSearchEnvironment(process.env).SEARCH_ANALYTICS_ENABLED||req.headers['x-search-consent']!=='1'||req.headers.dnt==='1'||req.headers['sec-gpc']==='1')throw new HttpError(403,'FORBIDDEN');
 await recordSearchEvent(await getDb(),validate(searchEventSchema,req.body));res.status(204).end();});
 router.get('/admin/search',async(req,res)=>{noBody(req);await identity(req,true);validate(emptyQuerySchema,req.query);const db=await getDb();const config=await searchConfiguration(db);res.json({data:{synonyms:config.synonyms,rules:config.rules,analytics:await searchAnalytics(db),provider:readSearchEnvironment(process.env).SEARCH_PROVIDER},requestId:res.locals.requestId});});
 router.get('/admin/search/test',async(req,res)=>{noBody(req);await identity(req,true);const input=validate(searchQuerySchema,req.query);const result=await searchService(await getDb()).search(input);
 res.json({data:{response:searchResponseSchema.parse(result.response),diagnostic:result.diagnostic,explanation:result.candidates.slice(0,30).map(c=>({productId:String(c.product._id),name:String(c.product.name),tier:c.tier,matchedFields:c.matchedFields,lexicalRank:c.lexicalRank??null,semanticRank:c.semanticRank??null,fusion:c.fusion??0,businessBoost:c.business??0}))},requestId:res.locals.requestId});});
 for(const kind of ['synonyms','rules','enrichment'] as const)router.post('/admin/search/'+kind,async(req,res)=>{
 const actor=await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const db=await getDb();
 if(kind==='enrichment'){
 const data=validate(searchEnrichmentSchema,req.body),id=new ObjectId(data.productId),product=await db.collection('products').findOne({_id:id,archivedAt:{$exists:false}},{maxTimeMS:1000});if(!product)throw new HttpError(404,'NOT_FOUND');
 if(data.reviewed&&(data.concerns.length||data.useCases.length||data.features.length)&&(product.productType!=='general'||product.contentReviewed!==true))throw new HttpError(409,'CATALOG_REVIEW_REQUIRED');
 const category=await db.collection('categories').findOne({_id:product.category},{projection:{name:1},maxTimeMS:1000});
 await db.collection('products').updateOne({_id:id,updatedAt:product.updatedAt??{$exists:false},searchMetadataRevision:product.searchMetadataRevision??{$exists:false}},{$set:{searchEnrichment:data,searchDocument:searchDocument({...product,searchEnrichment:data},String(category?.name??'')),searchEnrichmentAudit:{actorId:actor.id,updatedAt:new Date()}},$inc:{searchMetadataRevision:1}},{maxTimeMS:1000}).then(result=>{if(!result.matchedCount)throw new HttpError(409,'CATALOG_REVIEW_REQUIRED');});
 }else if(kind==='synonyms'){
 const data=validate(synonymSchema,req.body);if(!await db.collection<Document&{_id:string}>('search_synonyms').findOne({_id:data.key},{projection:{_id:1},maxTimeMS:1000})&&await db.collection('search_synonyms').countDocuments({},{limit:500,maxTimeMS:1000})>=500)throw new HttpError(413,'PAYLOAD_TOO_LARGE');await db.collection<Document&{_id:string}>('search_synonyms').replaceOne({_id:data.key},{_id:data.key,...data},{upsert:true,maxTimeMS:1000});
 // Disabled records have no valid synonym mapping in the separate Atlas source.
 if(data.enabled)await db.collection<Document&{_id:string}>('search_synonyms_atlas').replaceOne({_id:data.key},{_id:data.key,...atlasSynonym(data)},{upsert:true,maxTimeMS:1000});
 else await db.collection<Document&{_id:string}>('search_synonyms_atlas').deleteOne({_id:data.key},{maxTimeMS:1000});
 }else{const data=validate(searchRuleSchema,req.body);if(!await db.collection<Document&{_id:string}>('search_rules').findOne({_id:data.key},{projection:{_id:1},maxTimeMS:1000})&&await db.collection('search_rules').countDocuments({},{limit:200,maxTimeMS:1000})>=200)throw new HttpError(413,'PAYLOAD_TOO_LARGE');await db.collection<Document&{_id:string}>('search_rules').replaceOne({_id:data.key},{_id:data.key,...data},{upsert:true,maxTimeMS:1000});}
 invalidateSearchConfiguration(db);res.json({data:{saved:true},requestId:res.locals.requestId});});
 router.post('/admin/search/query',async(req,res)=>{await identity(req,true);verifyBrowserMutation(req,origins);validate(emptyQuerySchema,req.query);const input=validate(z.object({q:z.string().trim().min(3).max(80),locale:z.enum(['en','ar']).default('en')}).strict(),req.body);const hash=semanticHash(queryHashInput(input.q,input.locale));
 await(await getDb()).collection<Document&{_id:string}>('search_query_queue').updateOne({_id:hash},{$set:{queryHash:hash,query:input.q,locale:input.locale,state:'pending',reviewed:true,expiresAt:new Date(Date.now()+7*86400000)}},{upsert:true,maxTimeMS:1000});res.json({data:{saved:true},requestId:res.locals.requestId});});
 router.get('/admin/search/defaults',async(req,res)=>{noBody(req);await identity(req,true);validate(z.object({}).strict(),req.query);res.json({data:seedSynonyms,requestId:res.locals.requestId});});
 for(const path of ['/search','/search/suggest','/search/events','/admin/search','/admin/search/test','/admin/search/synonyms','/admin/search/rules','/admin/search/enrichment','/admin/search/query'])router.all(path,(_req,res,next)=>{res.set('Allow',path.endsWith('/events')||/\/(synonyms|rules|enrichment|query)$/.test(path)?'POST':'GET, HEAD');next(new HttpError(405,'METHOD_NOT_ALLOWED'));});
}
