import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {readApiEnvironment} from '@almina/config/env';
import {createDatabase} from '../../apps/api/src/database.js';
import {legacyInventory,legacyPath,mappedTarget} from '../../apps/api/src/modules/media/legacy-migration.js';
import type {Document} from 'mongodb';
const manifestSchema=z.array(z.object({path:z.string().regex(legacyPath),target:z.string().url()}).strict()).max(50000);
async function bytes(url:string){const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok||!/^image\/(webp|png|jpeg|gif|avif)(;|$)/.test(response.headers.get('content-type')??''))throw Error('Invalid raster');let size=0;const chunks:Uint8Array[]=[];if(!response.body)throw Error('Empty image');for await(const chunk of response.body){size+=chunk.length;if(size>5*1024*1024)throw Error('Image exceeds migration limit');chunks.push(chunk);}if(!size)throw Error('Empty image');return createHash('sha256').update(Buffer.concat(chunks)).digest('hex');}
async function copyOriginal(path:string,cloud:string){
 const key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
 if(!key||!secret)throw Error('Cloudinary upload credentials required');
 const publicId='almina/legacy/'+createHash('sha256').update(path).digest('hex');
 const endpoint=`https://api.cloudinary.com/v1_1/${cloud}`;
 // Reconcile an existing deterministic asset before uploading; never overwrite it.
 const lookup=await fetch(`${endpoint}/resources/image/upload/${encodeURIComponent(publicId)}`,{headers:{Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64')},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(lookup.ok){const existing=await lookup.json();const target=mappedTarget(existing.secure_url,cloud);if(!target)throw Error('Invalid existing provider asset');return target;}
 if(lookup.status!==404)throw Error('Provider lookup failed');
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHash('sha1').update(`overwrite=false&public_id=${publicId}&timestamp=${timestamp}`+secret).digest('hex');
 const body=new FormData();for(const [name,value]of Object.entries({api_key:key,timestamp,signature,public_id:publicId,overwrite:'false',file:'https://cloudinary-proxy.nabeelkerala2000.workers.dev'+path}))body.set(name,value);
 const response=await fetch(`${endpoint}/image/upload`,{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Provider copy failed');
 const asset=await response.json(),target=mappedTarget(asset.secure_url,cloud);if(!target)throw Error('Invalid copied provider asset');return target;
}
async function main(){
 const [action,file]=process.argv.slice(2);if(!['inventory','copy','verify','apply'].includes(action??'')||!file||process.argv.length!==5)throw Error('Usage: legacy-media.ts inventory|copy|verify|apply manifest.json');
 const env=readApiEnvironment(process.env);if(env.database.mode!=='enabled')throw Error('Database disabled');const database=createDatabase(env.database);
 try{const db=await database.getDb();const inventory=await legacyInventory(db);
 if(action==='inventory'){await writeFile(file,JSON.stringify({...inventory,mappings:inventory.paths.map(path=>({path,target:''}))},null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({references:inventory.paths.length,fingerprint:inventory.fingerprint})+'\n');return;}
 if(action==='copy'){
 const cloud=process.env.CLOUDINARY_CLOUD_NAME;if(!cloud||!/^[A-Za-z0-9_-]{1,100}$/.test(cloud))throw Error('Pharmacy Cloudinary account required');
 const mappings=[];for(const path of inventory.paths){await bytes('https://cloudinary-proxy.nabeelkerala2000.workers.dev'+path);const target=await copyOriginal(path,cloud);mappings.push({path,target});}
 await writeFile(file,JSON.stringify({...inventory,mappings},null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({copied:mappings.length,verified:false})+'\n');return;
 }
 const input=z.object({fingerprint:z.string().regex(/^[a-f0-9]{64}$/),mappings:manifestSchema}).passthrough().parse(JSON.parse(await readFile(file,'utf8')));
 if(input.fingerprint!==inventory.fingerprint||new Set(input.mappings.map(row=>row.path)).size!==input.mappings.length||input.mappings.length!==inventory.paths.length||input.mappings.some(row=>!inventory.paths.includes(row.path)))throw Error('Inventory changed or coverage incomplete; regenerate manifest');
 for(const row of input.mappings){const target=mappedTarget(row.target,process.env.CLOUDINARY_CLOUD_NAME);if(!target)throw Error('Target must be an original versioned image in the configured pharmacy account');const [sourceHash,targetHash]=await Promise.all([bytes('https://cloudinary-proxy.nabeelkerala2000.workers.dev'+row.path),bytes(target)]);if(sourceHash!==targetHash)throw Error('Source and target differ');if(action==='apply'){await db.collection<Document & {_id:string}>('legacy_media_mappings').updateOne({_id:row.path},{$set:{target,verified:true,sha256:sourceHash,verifiedAt:new Date(),inventoryFingerprint:inventory.fingerprint}},{upsert:true});}}
 const current=await legacyInventory(db);if(current.fingerprint!==inventory.fingerprint)throw Error('Inventory changed during verification; existing verified mappings retained, cutover blocked');
 process.stdout.write(JSON.stringify({verified:input.mappings.length,applied:action==='apply',fingerprint:current.fingerprint,retired:false})+'\n');
 }finally{await database.close();}
}
void main().catch(()=>{process.stderr.write('Legacy media migration failed. Review manifest coverage, provider copies and connection configuration. No source assets were deleted.\n');process.exitCode=1;});
