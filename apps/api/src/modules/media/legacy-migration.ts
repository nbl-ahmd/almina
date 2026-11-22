import {createHash} from 'node:crypto';
import type {Db,Document} from 'mongodb';
import { retainedBannerArtwork } from './compatibility-reads.js';
export const legacyPath=/^\/cdn\/(products|categories|banners)\/[A-Za-z0-9][A-Za-z0-9_-]{0,179}\.(webp|png|jpe?g|gif|avif)$/i;
export function mappedTarget(value:unknown,cloud:string|undefined):string|null{
 if(typeof value!=='string'||!cloud||!/^[A-Za-z0-9_-]{1,100}$/.test(cloud))return null;
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='res.cloudinary.com'&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&new RegExp(`^/${cloud}/image/upload/v[0-9]+/[A-Za-z0-9_/-]+\\.(webp|png|jpe?g|gif|avif)$`,'i').test(url.pathname)?url.href:null;}catch{return null;}
}
/** Include archived records and history. Scan projected media only; never export customer details. */
export async function legacyInventory(db:Db){
 const paths=new Set<string>();
 const collect=(value:unknown,kind?:string):void=>{if(typeof value==='string'){let path=value;try{if(value.startsWith('https://'))path=new URL(value).pathname;}catch{return;}if(legacyPath.test(path))paths.add(path);else if(kind&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,179}\.(webp|png|jpe?g|gif|avif)$/i.test(value))paths.add(`/cdn/${kind}/${value}`);}else if(Array.isArray(value))value.forEach(item=>collect(item,kind));else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(['gdriveFileId','gdriveFileIds'].includes(key))continue;collect(item,kind);}};
 for(const name of ['products','categories','banners','whatsappposters','media_history','orders']){
  const projection=name==='media_history'?{collection:1,previousAssets:1,nextAssets:1}:name==='orders'?{products:1,'totals.lines.image':1,'totals.lines.images':1}:{image:1,images:1,cloudinaryImages:1};
  for await(const row of db.collection(name).find({},{projection,maxTimeMS:30000})){const kind=name==='media_history'?row.collection:name;collect(row,['products','categories','banners'].includes(kind)?kind:undefined);}
 }
 const sorted=[...paths].sort();return {paths:sorted,fingerprint:createHash('sha256').update(JSON.stringify(sorted)).digest('hex')};
}
export async function resolveLegacyMapping(db:Db,path:string,cloud:string|undefined){
 if(!legacyPath.test(path))return null;
 const row=await db.collection<Document & {_id:string}>('legacy_media_mappings').findOne({_id:path,verified:true},{projection:{target:1},maxTimeMS:3000});
 const mapped = mappedTarget(row?.target,cloud);
 if (mapped || !path.startsWith('/cdn/banners/')) return mapped;
 return retainedBannerArtwork(db, path.slice('/cdn/banners/'.length), {}, cloud);
}
