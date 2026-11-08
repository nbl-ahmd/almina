import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { deliveryPointSchema, deliveryPolygonSchema } from '@almina/contracts';
import { administrator } from '../auth/administration.js';
import { HttpError } from '../../errors.js';
import { readLocationOptions, type LocationOptions } from './reverse.js';
export const placeSearchInput=z.object({q:z.string().trim().min(3).max(100)}).strict();
export const placeSearchResults=z.array(z.object({name:z.string().max(1000),point:deliveryPointSchema,geometry:deliveryPolygonSchema.nullable()}).strict()).max(5);
const query={maxTimeMS:3000};
/** Explicit admin searches only. Shares the reverse geocoder's global lease and daily quota. */
export async function searchDeliveryPlaces(db:Db,raw:unknown,actor:string,supplied?:LocationOptions & {searchEndpoint?:string}){
 await administrator(db,actor);const value=placeSearchInput.safeParse(raw);if(!value.success)throw new HttpError(400,'INVALID_REQUEST');
 let options:LocationOptions;try{options=supplied??readLocationOptions(process.env);}catch{throw new HttpError(503,'SERVICE_UNAVAILABLE');}if(!options.enabled)throw new HttpError(503,'SERVICE_UNAVAILABLE');
 let url:URL;try{const endpoint=supplied?.searchEndpoint??process.env.GEOCODING_SEARCH_URL??options.endpoint.replace(/\/reverse$/,'/search');url=new URL(endpoint);if(!url.pathname.endsWith('/search')||url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error();}catch{throw new HttpError(503,'SERVICE_UNAVAILABLE');}
 const now=options.now??Date.now,time=now(),cache=db.collection<Document&{_id:string}>('geocoding_cache');
 const key=createHash('sha256').update(`place:${url.href}:${value.data.q.toLowerCase()}:ae`).digest('hex');
 const cached=await cache.findOne({_id:key,expiresAt:{$gt:new Date(time)}},query);if(cached){const parsed=placeSearchResults.safeParse(cached.places);if(parsed.success)return parsed.data;}
 const limits=db.collection<Document&{_id:string}>('geocoding_limits');
 await limits.updateOne({_id:'provider'},{$setOnInsert:{leaseUntil:new Date(0),nextAllowedAt:new Date(0)}},{...query,upsert:true});
 const owner=randomUUID(),instant=options.now?new Date(time):'$$NOW';
 const lease=await limits.findOneAndUpdate({_id:'provider',$expr:{$and:[{$lte:['$leaseUntil',instant]},{$lte:['$nextAllowedAt',instant]}]}},[{$set:{owner,leaseUntil:{$add:[instant,15000]},nextAllowedAt:{$add:[instant,1100]}}}],{...query,returnDocument:'after'});
 if(!lease)throw new HttpError(429,'RATE_LIMITED');let cooldown=1100;
 try{
  const day=Math.floor(time/86400000),usage=await limits.findOneAndUpdate({_id:`day:${day}`},{$inc:{count:1},$setOnInsert:{expiresAt:new Date((day+2)*86400000)}},{...query,upsert:true,returnDocument:'after'});if(!usage||usage.count>options.dailyLimit)throw new HttpError(429,'RATE_LIMITED');
  if(options.provider==='geoapify'){url.searchParams.set('text',value.data.q);url.searchParams.set('filter','countrycode:ae');url.searchParams.set('format','json');url.searchParams.set('apiKey',options.apiKey!);}
  else{url.searchParams.set('q',value.data.q);url.searchParams.set('countrycodes','ae');url.searchParams.set('format','jsonv2');url.searchParams.set('addressdetails','1');url.searchParams.set('polygon_geojson','1');url.searchParams.set('polygon_threshold','0.0001');}
  url.searchParams.set('limit','5');
  const response=await (options.fetch??fetch)(url,{headers:{Accept:'application/json','User-Agent':options.userAgent},signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'});
  if(!response.ok){cooldown=response.status===429?60000:10000;throw new HttpError(response.status===429?429:503,response.status===429?'RATE_LIMITED':'SERVICE_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw new HttpError(503,'SERVICE_UNAVAILABLE');const chunks:Uint8Array[]=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>262144){await reader.cancel();throw new HttpError(503,'SERVICE_UNAVAILABLE');}chunks.push(part.value);}
  const data:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const rows=options.provider==='geoapify'?z.object({results:z.array(z.unknown()).max(5)}).parse(data).results:z.array(z.unknown()).max(5).parse(data);
  const places=rows.flatMap(raw=>{
   const row=z.object({display_name:z.string().optional(),formatted:z.string().optional(),lat:z.union([z.string(),z.number()]),lon:z.union([z.string(),z.number()]),address:z.object({country_code:z.string()}).optional(),country_code:z.string().optional(),geojson:z.unknown().optional()}).safeParse(raw);
   if(!row.success||(row.data.address?.country_code??row.data.country_code)?.toLowerCase()!=='ae')return[];
   const point=deliveryPointSchema.safeParse({latitude:Number(row.data.lat),longitude:Number(row.data.lon)}),name=row.data.display_name??row.data.formatted,geometry=deliveryPolygonSchema.safeParse(row.data.geojson);if(!point.success||!name||name.length>1000)return[];
   return[{name,point:point.data,geometry:geometry.success?geometry.data:null}];
  });
  const result=placeSearchResults.parse(places);await cache.updateOne({_id:key},{$set:{places:result,expiresAt:new Date(now()+86400000)}},{...query,upsert:true});return result;
 }catch(error){if(error instanceof HttpError)throw error;cooldown=10000;throw new HttpError(503,'SERVICE_UNAVAILABLE');}
 finally{const finished=options.now?new Date(now()):'$$NOW';await limits.updateOne({_id:'provider',owner},[{$set:{leaseUntil:new Date(0),nextAllowedAt:{$add:[finished,cooldown]}}},{$unset:'owner'}],query);}
}
