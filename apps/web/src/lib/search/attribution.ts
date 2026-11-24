'use client';
import { usageChoice,privacyBlocked } from '../telemetry/browser';
import type { SearchEvent } from '@almina/contracts/search';
import { searchAttributionsFrom } from '../browser-validation';
const key='almina.search-attribution.v1';
export const searchConsentKey='almina.optional-search-usage.v1';
let storageFailure=false;
export function searchUsageAllowed(){try{return !storageFailure&& usageChoice()==='allowed'&&!privacyBlocked()&&localStorage.getItem(searchConsentKey)==='allowed';}catch{return false;}}
const active=new Set<AbortController>();let listening=false,minute=-1,sent=0;
function listen(){if(listening)return;listening=true;const changed=()=>{if(searchUsageAllowed())return;for(const controller of active)controller.abort();active.clear();try{sessionStorage.removeItem(key);sessionStorage.removeItem('almina.last-search.v1');}catch{/* Optional storage. */}};window.addEventListener('storage',changed);window.addEventListener('almina-usage-change',changed);}
export function chooseSearchUsage(allowed:boolean){try{localStorage.setItem(searchConsentKey,allowed?'allowed':'declined');storageFailure=false;window.dispatchEvent(new Event('almina-usage-change'));return true;}catch{storageFailure=true;window.dispatchEvent(new Event('almina-usage-change'));return false;}}
export function reportSearchEvent(event:SearchEvent){
 if(!searchUsageAllowed())return;listen();const current=Math.floor(Date.now()/60000);if(current!==minute){minute=current;sent=0;}if(sent>=60||active.size>=4)return;sent++;const controller=new AbortController();active.add(controller);const timeout=setTimeout(()=>controller.abort(),2500);
 void fetch('/api/search/events',{method:'POST',keepalive:true,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1','X-Search-Consent':'1'},body:JSON.stringify(event),signal:controller.signal}).catch(()=>{}).finally(()=>{clearTimeout(timeout);active.delete(controller);});
}
export function searchAttributions(){if(!searchUsageAllowed()){try{sessionStorage.removeItem(key);}catch{/* Optional attribution. */}return [];}
 try{const raw=JSON.parse(sessionStorage.getItem(key)??'null') as {expires?:number;items?:unknown}|null;if(!raw?.expires||raw.expires<Date.now())return [];return searchAttributionsFrom(raw.items)??[];}catch{return [];}}
export function rememberSearch(searchId:string,productId:string,position:number){if(!searchUsageAllowed())return;try{const items=[...searchAttributions().filter(row=>row.productId!==productId),{searchId,productId,position}].slice(-50);sessionStorage.setItem(key,JSON.stringify({expires:Date.now()+3600000,items}));}catch{/* Commerce does not depend on attribution storage. */}}
export function attributeCart(productId:string){const row=searchAttributions().find(item=>item.productId===productId);if(row)reportSearchEvent({searchId:row.searchId,event:'search_add_to_cart',items:[{productId,position:row.position}]});}
