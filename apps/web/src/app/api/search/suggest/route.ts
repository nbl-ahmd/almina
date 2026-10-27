import { searchSuggestions } from '../../../../lib/server/search';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'};
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,q=params.get('q')?.trim()??'',locale=params.get('locale')??'en';
 if(new Set(params.keys()).size!==[...params.keys()].length||q.length>80||!['en','ar'].includes(locale)||[...params.keys()].some(k=>!['q','locale'].includes(k)))return Response.json({error:'Invalid search'},{status:400,headers});
 if(q.length<2)return Response.json({products:[],categories:[],brands:[],collections:[],popular:[],related:[],unavailable:false},{headers});
 try{return Response.json(await searchSuggestions(q,locale),{headers});}
 catch{return Response.json({products:[],categories:[],brands:[],collections:[],popular:[],related:[],unavailable:true},{headers});}
}
