import 'server-only';
export async function boundedBody(request:Request,limit:number){
 if(request.headers.get('content-encoding'))throw new Error('Encoded bodies are not supported');
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing request body');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw new Error('Request too large');}chunks.push(part.value);}
 return Buffer.concat(chunks).toString('utf8');
}
