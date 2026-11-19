import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const read=(path:string)=>readFileSync(path,'utf8');
const guide=read('apps/web/DESIGN.md');
const fm=guide.split(/^---\s*$/m)[1]!;
const bindings=JSON.parse(read('apps/web/docs/design/system-bindings.json')) as {source:string;colors:Record<string,string>;rounded:Record<string,string>;spacing:Record<string,string>;typography:Record<string,Record<string,string>>;components:string[]};
const side=JSON.parse(read('apps/web/.impeccable/design.json')) as {schemaVersion:number;extensions:{colorMeta:Record<string,unknown>;motion:{name:string;value:string}[];shadows:{name:string;value:string}[]};components:{name:string;refersTo:string;html:string;css:string}[];tokens?:unknown;narrative:{overview:string;rules:{name:string;body:string}[]}};
const css=read(bindings.source);
function flat(name:string){const block=fm.match(new RegExp(`^${name}:\\n((?: +[^\\n]*\\n)*)`,'m'))?.[1];assert.ok(block,`Missing ${name}`);return Object.fromEntries([...block.matchAll(/^ {2}([\w-]+): (.+)$/gm)].map(m=>[m[1]!,JSON.parse(m[2]!) as string]));}
const definitions=new Map([...css.matchAll(/(--store-[\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1]!,m[2]!.trim()]));
function value(key:string,path:string[]=[]):string{assert.ok(!path.includes(key),`Cycle ${key}`);const v=definitions.get(key);assert.ok(v,`Missing ${key}`);return v.replace(/var\((--store-[\w-]+)\)/g,(_m,child:string)=>value(child,[...path,key]));}
test('active guide projections match the single accepted runtime source',()=>{
 assert.equal(bindings.source,'apps/web/src/components/storefront-system/tokens.module.css');
 for(const kind of ['colors','rounded','spacing'] as const){const actual=flat(kind);assert.deepEqual(Object.keys(actual).sort(),Object.keys(bindings[kind]).sort());for(const[key,role]of Object.entries(bindings[kind]))assert.equal(actual[key],value(role),`${kind}.${key}`);}
 for(const[role,fields]of Object.entries(bindings.typography)){const block=fm.match(new RegExp(`^  ${role}:\\n((?:    [^\\n]*\\n)*)`,'m'))?.[1];assert.ok(block,role);for(const[key,token]of Object.entries(fields)){const encoded: string | undefined = block.match(new RegExp(`^    ${key}: (.+)$`,'m'))?.[1];assert.ok(encoded,`${role}.${key}`);assert.equal(String(JSON.parse(encoded)),value(token),`${role}.${key}`);}}
 assert.equal(side.extensions.motion.find(m=>m.name==='feedback-duration')?.value,value('--store-motion-feedback'));
 assert.equal(side.extensions.motion.find(m=>m.name==='feedback-easing')?.value,value('--store-motion-easing'));
 assert.equal(side.extensions.shadows[0]?.value,value('--store-elevation-overlay'));
 assert.deepEqual([...guide.matchAll(/^## ([^\n]+)$/gm)].map(m=>m[1]),['Overview','Colors','Typography','Layout','Elevation & Depth','Shapes','Components',"Do's and Don'ts"]);
 assert.equal(side.schemaVersion,2);assert.equal(side.tokens,undefined);assert.deepEqual(Object.keys(side.extensions.colorMeta).sort(),Object.keys(flat('colors')).sort());
 const allowed=new Set([...css.matchAll(/#[\da-f]{3,8}\b/gi)].map(m=>m[0].toLowerCase()));
 assert.equal(side.narrative.overview,guide.split('## Overview\n\n')[1]!.split('**Key Characteristics:**')[0]!.split('\n\n').slice(1).join('\n\n').trim());
 for(const rule of side.narrative.rules)assert.ok(guide.includes(`**${rule.name}** ${rule.body}`));
 assert.equal(side.components.length,10);
 for(const component of side.components){assert.ok(bindings.components.includes(component.refersTo),component.name);assert.match(component.html,/class="ds-/);assert.doesNotMatch(component.html,/<script|on(?:click|load)=|https?:\/\//i);for(const m of component.css.matchAll(/#[\da-f]{3,8}\b/gi))assert.ok(allowed.has(m[0].toLowerCase()),`Unapproved snippet colour ${component.name}: ${m[0]}`);}
});
test('former active guide and metadata are retained as explicitly excluded history',()=>{
 assert.equal(existsSync('apps/web/.impeccable/surfaces/apps-web-src-components-homepage-tsx.md'),false);
 assert.match(read('apps/web/docs/design/archive/superseded-reference02-homepage-surface.md'),/^> Superseded in P6-01/);
 const folder='apps/web/docs/design/archive/2026-11-18-pre-p2-05';const manifest=JSON.parse(read(folder+'/manifest.json')) as {status:string;records:{archive:string;sourceSha256:string}[]};assert.match(manifest.status,/superseded/);
 for(const entry of manifest.records){const content=read(folder+'/'+entry.archive);const original=entry.archive.endsWith('.md')?content.slice(content.indexOf('\n\n')+2):content;assert.equal(createHash('sha256').update(original).digest('hex'),entry.sourceSha256,entry.archive);if(entry.archive.endsWith('.md'))assert.match(content.split('\n')[0]!,/SUPERSEDED/);assert.notEqual(entry.archive,'DESIGN.md');assert.notEqual(entry.archive,'design.json');}
 for(const file of ['references.md','reference-review-2026-11-17.md','system-review-2026-11-17.md','storefront-direction-plan-2026-11-17.md'])assert.match(read('apps/web/docs/design/'+file).split('\n')[0]!,/Historical analysis/);
 for(const file of ['apps/web/AGENTS.md','.agents/skills/almina-project-profile/SKILL.md']){const text=read(file);assert.match(text,/storefront-system\/tokens\.module\.css/);assert.doesNotMatch(text,/Runtime tokens live in the customer-scoped storefront-tokens\.css|storefront-tokens\.css owns its runtime/);}
});
function localLinks(text:string){const out:string[]=[];let start=0;while((start=text.indexOf('](',start))>=0){let i=start+2,depth=1;for(;i<text.length&&depth;i++){if(text[i]==='(')depth++;if(text[i]===')')depth--;}if(depth===0)out.push(text.slice(start+2,i-1));start=i;}return out;}
test('active authority links resolve to reviewable local records',()=>{
 for(const file of ['apps/web/DESIGN.md','apps/web/PRODUCT.md','apps/web/DESIGN-BRIEF.md','apps/web/docs/design/decisions.md','apps/web/docs/design/screen-directions.md','apps/web/docs/design/archive/2026-11-18-pre-p2-05/README.md'])for(const target of localLinks(read(file))){if(/^(https?:|#)/.test(target))continue;const path=target.split('#')[0]!.replace(/^<|>$/g,'');assert.ok(existsSync(resolve(dirname(file),path)),`${file} -> ${target}`);}
});
