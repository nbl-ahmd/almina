import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSavedAccount,resetSavedAccount,currentSaved,changeSaved } from '../apps/web/src/lib/catalog/saved-account';
test('late account GET and POST responses cannot restore a signed-out saved list',async()=>{
 const previousFetch=globalThis.fetch,previousWindow=globalThis.window,previousStorage=globalThis.localStorage;
 Object.assign(globalThis,{window:new EventTarget(),localStorage:{getItem:()=>null,setItem:()=>{}}});
 const a='a'.repeat(24),b='b'.repeat(24);
 let resolveGet!:(value:Response)=>void;
 try{
 resetSavedAccount();globalThis.fetch=()=>new Promise(resolve=>{resolveGet=resolve;});
 const old=loadSavedAccount();resetSavedAccount();resolveGet(Response.json({data:{ids:[a]}}));await old;assert.deepEqual(currentSaved(),[]);
 globalThis.fetch=async()=>Response.json({data:{ids:[b]}});await loadSavedAccount();assert.deepEqual(currentSaved(),[b]);
 let resolvePost!:(value:Response)=>void;globalThis.fetch=()=>new Promise(resolve=>{resolvePost=resolve;});const post=changeSaved(a,false);await Promise.resolve();await Promise.resolve();resetSavedAccount();resolvePost(Response.json({data:{ids:[a,b]}}));await post;assert.deepEqual(currentSaved(),[]);
 }finally{globalThis.fetch=previousFetch;Object.assign(globalThis,{window:previousWindow,localStorage:previousStorage});}
});
