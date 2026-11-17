import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file='apps/web/src/components/storefront-system/tokens.module.css';
const tokens=readFileSync(file,'utf8');
const consumer=readFileSync('apps/web/src/components/design-proof/proof.module.css','utf8');
const refs=(value:string)=>Array.from(value.matchAll(/var\((--[\w-]+)/g),m=>m[1]!);
test('accepted storefront token references resolve without cycles or global theme leakage',()=>{
 const definitions=new Map<string,string[]>();
 for(const m of tokens.matchAll(/(--store-[\w-]+)\s*:\s*([^;]+);/g))definitions.set(m[1]!,[...(definitions.get(m[1]!)??[]),m[2]!]);
 const external=new Set(['--font-storefront-latin','--font-storefront-arabic']);
 for(const ref of refs(tokens+consumer).filter(r=>r.startsWith('--store-')||r.startsWith('--font-storefront-')))assert.ok(definitions.has(ref)||external.has(ref),`Missing ${ref}`);
 function walk(key:string,path:string[]){assert.ok(!path.includes(key),`Token cycle: ${[...path,key].join(' → ')}`);for(const value of definitions.get(key)??[])for(const child of refs(value))if(definitions.has(child))walk(child,[...path,key]);}
 for(const key of definitions.keys())walk(key,[]);
 assert.doesNotMatch(tokens.replace(/\/\*[\s\S]*?\*\//g,''),/:root|\.storefront-shell|\.admin-app|@theme/);
 assert.doesNotMatch(consumer,/#[0-9a-f]{3,8}\b|--proof-(?:accent|ink|muted|ground|line)\s*:/i);
 for(const key of ['--store-card-radius','--store-search-radius','--store-purchase-surface','--store-page-gutter','--store-layout-container','--store-icon-size','--store-motion-feedback'])assert.ok(consumer.includes(`var(${key})`),`Unconsumed role ${key}`);
});
