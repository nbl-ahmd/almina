import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const require=createRequire(import.meta.url);
test('patched Next DevTools retains real tool schemas and forwards structured runtime arguments', {timeout:20000}, async()=>{
  // Also exercise installation idempotence against the pinned distribution.
  execFileSync(process.execPath,['scripts/tooling/patch-next-devtools.mjs'],{stdio:'pipe'});
  const requests: {method:string;params?:{name?:string;arguments?:unknown}}[]=[];
  const server=createServer(async(req,res)=>{
    let body='';for await(const chunk of req)body+=String(chunk);
    const value=JSON.parse(body);requests.push(value);
    const result=value.method==='tools/list'?{tools:[{name:'get_routes',description:'Synthetic runtime tool',inputSchema:{type:'object'}}]}:{content:[{type:'text',text:JSON.stringify(value.params.arguments)}]};
    res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: '+JSON.stringify({jsonrpc:'2.0',id:value.id,result})+'\n\n');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const client=new Client({name:'almina-devtools-regression',version:'1.0.0'});
  try{
    const transport=new StdioClientTransport({command:process.execPath,args:[join(dirname(require.resolve('next-devtools-mcp/package.json')),'dist/index.js')],stderr:'pipe',env:{PATH:process.env.PATH??'',NEXT_TELEMETRY_DISABLED:'1',NEXT_DEVTOOLS_HOST:'127.0.0.1'}});
    await client.connect(transport);
    const listed=await client.listTools();assert.equal(listed.tools.length,4);
    const call=listed.tools.find(tool=>tool.name==='nextjs_call');assert.ok(call);
    const properties=call.inputSchema.properties as Record<string,{type?:string|string[]}>;
    assert.deepEqual(properties.port!.type,['string','number']);
    assert.equal(properties.args!.type,'object');assert.equal(properties.toolName!.type,'string');
    const args={category:'synthetic',limit:4,nested:{enabled:true}};
    const result=await client.callTool({name:'nextjs_call',arguments:{port:String(address.port),toolName:'get_routes',args}});
    assert.notEqual(result.isError,true);assert.match(JSON.stringify(result),/synthetic/);
    assert.deepEqual(requests.find(request=>request.method==='tools/call')?.params,{name:'get_routes',arguments:args});
  }finally{await client.close();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
