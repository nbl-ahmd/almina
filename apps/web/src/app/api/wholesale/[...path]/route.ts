import { createHash } from 'node:crypto';
import { type NextRequest,NextResponse } from 'next/server';
import { quoteDtoSchema } from '@almina/contracts';
import { getWebEnvironment } from '../../../../lib/server/env';
import { boundedBody } from '../../../../lib/server/bounded-body';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
async function handle(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const path=(await params).path.join('/'),env=getWebEnvironment(),admin=path.startsWith('admin/');
 const read=admin?['admin/types','admin/accounts','admin/terms','admin/products']:['access','catalog','account','orders'];
 const write=admin?['admin/types','admin/accounts','admin/terms','admin/invite']:['accept','quote','checkout'];
 if(!(request.method==='GET'?read:write).includes(path))return NextResponse.json({error:'Not found'},{status:404,headers});
 if(request.method==='POST'&&(request.nextUrl.search||request.headers.get('origin')!==env.WEB_ORIGIN||request.headers.get('x-csrf-protection')!=='1'||request.headers.get('sec-fetch-site')==='cross-site'))return NextResponse.json({error:'Access denied'},{status:403,headers});
 if(['quote','checkout'].includes(path)&&!env.CHECKOUT_ENABLED)return NextResponse.json({error:'Ordering unavailable'},{status:503,headers});
 const name=env.APP_ENV==='development'?(admin?'almina_session':'almina_customer'):(admin?'__Host-almina_session':'__Host-almina_customer');
 const values=request.cookies.getAll(name);if(values.length!==1||!/^[A-Za-z0-9_-]{43}$/.test(values[0]!.value))return NextResponse.json({error:'Sign in required'},{status:401,headers});
 try{
  const body=request.method==='POST'?await boundedBody(request,64000):undefined;
  const upstream=await fetch(new URL('/api/v1/'+(admin?'admin/wholesale/'+path.slice(6):'wholesale/'+path)+request.nextUrl.search,env.API_ORIGIN),{method:request.method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{cookie:name+'='+values[0]!.value,origin:env.WEB_ORIGIN,'x-csrf-protection':'1','Content-Type':'application/json'},...(body?{body}:{})});
  const result=await upstream.json();
  if(!upstream.ok)return NextResponse.json({error:'Unable to complete this request.',code:result.error?.code},{status:upstream.status,headers});
  if(path==='quote'){const quote=quoteDtoSchema.parse(result.data);return NextResponse.json({data:quote,quoteHash:createHash('sha256').update(JSON.stringify(quote)).digest('hex')},{headers});}
  return NextResponse.json(result,{status:upstream.status,headers});
 }catch{return NextResponse.json({error:'Wholesale service unavailable. Please try again.'},{status:503,headers});}
}
export const GET=handle;export const POST=handle;
