import { boundedBody } from '../../../../lib/server/bounded-body';
import { NextResponse, type NextRequest } from 'next/server';
import { getWebEnvironment } from '../../../../lib/server/env';
import { currentIdentity, sessionHeader } from '../../../../lib/server/admin/gateway';
const privateHeaders={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
async function handle(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const path=(await params).path.join('/');
  const admin=path.startsWith('admin/');
  const allowed=request.method==='GET'?['pages','page','profile','suggest','reviews','admin/pages','admin/profile','admin/delivery','admin/reviews','admin/rewards','admin/metrics','admin/products','admin/categories']:['admin/page','admin/profile','admin/search-index','admin/delivery','delivery','admin/review','admin/rewards','admin/delivered'];
  if(!allowed.includes(path))return NextResponse.json({error:'Not found'},{status:404,headers:privateHeaders});
  const env=getWebEnvironment();
  try{
    if(admin&&(await currentIdentity())?.role!=='admin')return NextResponse.json({error:'Access denied'},{status:403,headers:privateHeaders});
    if(request.method!=='GET'&&(request.headers.get('origin')!==env.WEB_ORIGIN||request.headers.get('x-csrf-protection')!=='1'||request.headers.get('sec-fetch-site')==='cross-site'||!request.headers.get('content-type')?.startsWith('application/json')))return NextResponse.json({error:'Access denied'},{status:403,headers:privateHeaders});
    const body=request.method==='GET'?undefined:await boundedBody(request,64000);
    if(body&&Buffer.byteLength(body)>64000)return NextResponse.json({error:'Too large'},{status:413,headers:privateHeaders});
    const target=admin?`/api/v1/admin/growth/${path.slice(6)}`:`/api/v1/growth/${path}`;
    const response=await fetch(new URL(target+request.nextUrl.search,env.API_ORIGIN),{method:request.method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',origin:env.WEB_ORIGIN,'x-csrf-protection':'1',...(admin?{cookie:await sessionHeader()}:{})},...(body?{body}:{})});
    return NextResponse.json(await response.json(),{status:response.status,headers:privateHeaders});
  }catch{return NextResponse.json({error:'Service unavailable'},{status:503,headers:privateHeaders});}
}
export const GET=handle;export const POST=handle;
