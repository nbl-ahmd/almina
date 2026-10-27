import { searchEventSchema } from '@almina/contracts/search';
import { getWebEnvironment } from '../../../../lib/server/env';
import { boundedBody } from '../../../../lib/server/bounded-body';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
export async function POST(request:Request){
 const env=getWebEnvironment();
 if(!env.COMMERCE_TELEMETRY_ENABLED)return new Response(null,{status:404,headers});
 if(request.headers.get('origin')!==env.WEB_ORIGIN||request.headers.get('x-csrf-protection')!=='1'||request.headers.get('x-search-consent')!=='1'||request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('dnt')==='1'||request.headers.get('sec-gpc')==='1')return new Response(null,{status:403,headers});
 if(new URL(request.url).search||request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()!=='application/json'||request.headers.get('content-encoding'))return new Response(null,{status:400,headers});
 try{const body=await boundedBody(request,8192);const input=searchEventSchema.safeParse(JSON.parse(body));if(!input.success)return new Response(null,{status:400,headers});
 const response=await fetch(new URL('/api/v1/search/events',env.API_ORIGIN),{method:'POST',cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1','X-Search-Consent':'1',Origin:env.WEB_ORIGIN},body:JSON.stringify(input.data),signal:AbortSignal.timeout(2000)});await response.body?.cancel();return new Response(null,{status:response.status===204?204:503,headers});
 }catch{return new Response(null,{status:400,headers});}
}
