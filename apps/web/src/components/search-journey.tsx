'use client';
import { useEffect,useRef,useState,type ReactNode } from 'react';
import { reportSearchEvent,rememberSearch,searchUsageAllowed } from '../lib/search/attribution';
export function SearchJourney({searchId,query,locale,page,products,children}:{searchId:string;query:string;locale:'en'|'ar';page:number;products:string[];children:ReactNode}){
 const [consentVersion,setConsentVersion]=useState(0);
 useEffect(()=>{const changed=()=>setConsentVersion(v=>v+1);window.addEventListener('almina-usage-change',changed);return()=>window.removeEventListener('almina-usage-change',changed);},[]);
 const ref=useRef<HTMLDivElement>(null),started=useRef(false),seen=useRef(new Set<string>());
 useEffect(()=>{let engaged=false;const interaction=(event:Event)=>{if((event.target as Element)?.closest('a,button,form'))engaged=true;};const exit=()=>{if(!engaged)reportSearchEvent({searchId,event:'search_exited',items:[]});};document.addEventListener('click',interaction);window.addEventListener('pagehide',exit);return()=>{document.removeEventListener('click',interaction);window.removeEventListener('pagehide',exit);};},[searchId]);
 useEffect(()=>{if(!searchUsageAllowed()||!ref.current)return;
 if(!started.current){let previousSearchId:string|undefined;try{const previous=JSON.parse(sessionStorage.getItem('almina.last-search.v1')??'null') as {id:string;at:number}|null;if(previous&&Date.now()-previous.at<300000&&previous.id!==searchId)previousSearchId=previous.id;sessionStorage.setItem('almina.last-search.v1',JSON.stringify({id:searchId,at:Date.now()}));}catch{/* Optional anonymous journey context. */}reportSearchEvent({searchId,event:'search_performed',items:[],query,locale,...(previousSearchId?{previousSearchId}:{})});started.current=true;}
 const pending:{productId:string;position:number}[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
 const flush=()=>{if(pending.length)reportSearchEvent({searchId,event:'search_result_impression',items:pending.splice(0,30)});};
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const id=entry.target.getAttribute('data-product-id'),index=id?products.indexOf(id):-1;
 if(entry.isIntersecting&&id&&index>=0&&!seen.current.has(id)){seen.current.add(id);pending.push({productId:id,position:(page-1)*30+index+1});observer.unobserve(entry.target);}}
 if(pending.length&&!timer)timer=setTimeout(()=>{flush();timer=undefined;},250);
 },{threshold:0.25});
 ref.current.querySelectorAll('[data-product-id]').forEach(node=>observer.observe(node));
 return()=>{observer.disconnect();if(timer)clearTimeout(timer);flush();};
 },[searchId,query,locale,page,products,consentVersion]);
 return <div ref={ref} onClick={event=>{const target=event.target as Element,article=target.closest('[data-product-id]'),id=article?.getAttribute('data-product-id'),position=id?products.indexOf(id)+1:0;
 if(id&&position>0&&target.closest('a')){rememberSearch(searchId,id,(page-1)*30+position);reportSearchEvent({searchId,event:'search_result_clicked',items:[{productId:id,position:(page-1)*30+position}]});}
 }} onPointerDown={event=>{const target=event.target as Element,id=target.closest('[data-product-id]')?.getAttribute('data-product-id'),position=id?products.indexOf(id)+1:0;if(id&&position>0)rememberSearch(searchId,id,(page-1)*30+position);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){const id=(event.target as Element).closest('[data-product-id]')?.getAttribute('data-product-id'),position=id?products.indexOf(id)+1:0;if(id&&position>0)rememberSearch(searchId,id,(page-1)*30+position);}}}>{children}</div>;
}
