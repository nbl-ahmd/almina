import { getWebEnvironment } from '../../../../lib/server/env';
import { legacyMediaResponse } from '../../../../lib/catalog/legacy-media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function respond(request:Request){
 const env=getWebEnvironment();
 let mapped:string|undefined,resolverReady=false;
 try{const lookup=new URL('/api/v1/catalog/legacy-media',env.API_ORIGIN);lookup.searchParams.set('path',new URL(request.url).pathname);
 const result=await fetch(lookup,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000)});
 if(result.ok){resolverReady=true;const body=await result.json();const target=body?.data?.target;if(typeof target==='string'){const url=new URL(target);if(url.protocol==='https:'&&url.hostname==='res.cloudinary.com'&&url.pathname.startsWith(`/${env.CLOUDINARY_CLOUD_NAME}/image/upload/v`)&&!url.search&&!url.hash&&!url.username&&!url.password&&!url.port)mapped=url.href;}}
 // Older API deployments have no resolver; keep old image URLs available during rollout.
 }catch{/* Mapping failure retains existing compatibility delivery. */}
 if(!mapped&&!env.LEGACY_MEDIA_FALLBACK_ENABLED){
  if(!resolverReady)return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});
  const match=/^\/cdn\/(products|categories|banners)\/([A-Za-z0-9][A-Za-z0-9_-]{0,179}\.(?:webp|png|jpe?g|gif|avif))$/i.exec(new URL(request.url).pathname);
  if(!match)return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  // Keep subsequent legacy category/banner uploads usable through the pharmacy API.
  // The personal compatibility host is no longer contacted in retirement mode.
  mapped=new URL(`/api/${match[1]==='categories'?'category':match[1]}/images/${match[2]}`,env.LEGACY_API_ORIGIN).href;
 }
 return legacyMediaResponse(request,fetch,mapped);
}
export function GET(request:Request){return respond(request);}
export function HEAD(request:Request){return respond(request);}
