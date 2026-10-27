import { z } from 'zod';
import type { SearchEnvironment } from './config.js';
export interface EmbeddingProvider{embed(text:string,kind:'document'|'query'):Promise<number[]>;}
export function geminiEmbeddings(env:SearchEnvironment,key:string,send:typeof fetch=fetch):EmbeddingProvider{
 if(!key)throw Error('Embedding credentials required');
 return {async embed(text,kind){
 for(let attempt=0;attempt<3;attempt++){
 const response=await send(`https://generativelanguage.googleapis.com/v1beta/models/${env.EMBEDDING_MODEL}:embedContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({model:`models/${env.EMBEDDING_MODEL}`,content:{parts:[{text:text.slice(0,4000)}]},taskType:kind==='query'?'RETRIEVAL_QUERY':'RETRIEVAL_DOCUMENT',outputDimensionality:env.SEARCH_EMBEDDING_DIMENSIONS}),signal:AbortSignal.timeout(20000),redirect:'error'});
 if((response.status===429||response.status>=500)&&attempt<2){await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,500*2**attempt));continue;}
 if(!response.ok){await response.body?.cancel();throw Error('Embedding provider unavailable');}
 const parsed=z.object({embedding:z.object({values:z.array(z.number().finite()).length(env.SEARCH_EMBEDDING_DIMENSIONS)})}).safeParse(await response.json());
 if(!parsed.success)throw Error('Invalid embedding response');const vector=parsed.data.embedding.values,norm=Math.sqrt(vector.reduce((sum,v)=>sum+v*v,0));if(!norm)throw Error('Invalid zero embedding');return vector.map(v=>v/norm);
 }throw Error('Embedding retry bound exceeded');
 }};
}
