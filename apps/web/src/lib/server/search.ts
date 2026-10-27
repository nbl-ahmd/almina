import 'server-only';
import { searchQuerySchema,searchResponseSchema,searchSuggestionsSchema,type SearchResponse } from '@almina/contracts/search';
import { getWebEnvironment } from './env';
import { readProduct } from '../catalog/model';
export async function searchProducts(raw:Record<string,unknown>){
 const input=searchQuerySchema.parse(raw),env=getWebEnvironment(),params=new URLSearchParams();
 for(const [key,value] of Object.entries(input))if(value!==undefined)params.set(key,String(value));
 const response=await fetch(new URL('/api/v1/search?'+params,env.API_ORIGIN),{cache:'no-store',signal:AbortSignal.timeout(8000),redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Search unavailable');const body:unknown=await response.json();const result=searchResponseSchema.parse((body as {data?:unknown}).data);
 return {products:result.products.map(readProduct).filter(p=>p!==null),hasNext:result.pagination.hasNext,page:result.pagination.page,searchUnavailable:false,search:result};
}
export async function searchSuggestions(q:string,locale='en'){
 const env=getWebEnvironment(),response=await fetch(new URL('/api/v1/search/suggest?'+new URLSearchParams({q,locale}),env.API_ORIGIN),{cache:'no-store',signal:AbortSignal.timeout(2500),redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Suggestions unavailable');const body:unknown=await response.json();return searchSuggestionsSchema.parse((body as {data?:unknown}).data);
}
export type SearchMetadata=SearchResponse;
