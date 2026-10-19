import { boundedBody } from '../../../../lib/server/bounded-body';
import { NextResponse,type NextRequest } from 'next/server';
import { getWebEnvironment } from '../../../../lib/server/env';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
async function handle(request:NextRequest,{params}:{params:Promise<{action:string}>}){
 const {action}=await params,env=getWebEnvironment(),development=env.APP_ENV==='development';
 const name=development?'almina_customer':'__Host-almina_customer';
 if(!(request.method==='GET'?['options','me','orders','addresses','saved','rewards']:['email','verify','google','logout','preferences','addresses','saved','review','redeem','referral-code','referral']).includes(action))return NextResponse.json({error:'Not found'},{status:404,headers});
 if(request.nextUrl.search)return NextResponse.json({error:'Invalid request'},{status:400,headers});
 if(request.method!=='GET'&&(request.headers.get('origin')!==env.WEB_ORIGIN||request.headers.get('x-csrf-protection')!=='1'||request.headers.get('sec-fetch-site')==='cross-site'))return NextResponse.json({error:'Access denied'},{status:403,headers});
 try{const values=request.cookies.getAll(name),token=values.length===1&&/^[A-Za-z0-9_-]{43}$/.test(values[0]!.value)?values[0]!.value:'';
 const body=request.method==='POST'?await boundedBody(request,12000):undefined;if(body&&Buffer.byteLength(body)>12000)return NextResponse.json({error:'Too large'},{status:413,headers});
 const upstream=await fetch(new URL('/api/v1/customers/'+action,env.API_ORIGIN),{method:request.method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{origin:env.WEB_ORIGIN,'x-csrf-protection':'1','Content-Type':'application/json',...(token?{cookie:name+'='+token}:{})},...(body?{body}:{})});
 const response=upstream.status===204?new NextResponse(null,{status:204,headers}):NextResponse.json(await upstream.json(),{status:upstream.status,headers});
 if(upstream.ok&&['verify','google','logout'].includes(action)){const raw=upstream.headers.getSetCookie().find(value=>value.startsWith(name+'='))?.split(';')[0]?.slice(name.length+1);if(action!=='logout'&&(!raw||!/^[A-Za-z0-9_-]{43}$/.test(raw)))throw new Error('Invalid session');response.cookies.set(name,raw??'',{httpOnly:true,secure:!development,sameSite:'lax',path:'/',maxAge:action==='logout'?0:30*86400});}
 return response;
 }catch{return NextResponse.json({error:'Account service unavailable. Guest checkout is still available.'},{status:503,headers});}
}
export const GET=handle;export const POST=handle;
