'use client';
import Link from 'next/link';
import { useEffect,useId,useRef,useState,type KeyboardEvent } from 'react';
import { MagnifyingGlassIcon,ArrowRightIcon,XMarkIcon } from '@heroicons/react/24/outline';
type Suggestion={name:string;href:string};
const recentKey='almina.recent-searches.v1';
export function SearchBox(){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[items,setItems]=useState<Suggestion[]>([]),[recent,setRecent]=useState<string[]>([]),[active,setActive]=useState(-1);
 const ref=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 useEffect(()=>{
  const controller=new AbortController();if(query.trim().length<2)return()=>controller.abort();
  const timer=setTimeout(()=>{void fetch('/api/search/suggest?'+new URLSearchParams({q:query}),{signal:controller.signal,cache:'no-store'}).then(response=>response.json()).then((data:{products:Suggestion[];categories:Suggestion[]})=>{if(controller.signal.aborted)return;setItems([...data.categories,...data.products].slice(0,8));setActive(-1);}).catch(()=>{});},220);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query]);
 const choices=query.trim().length>=2?items:recent.map(name=>({name,href:'/search?'+new URLSearchParams({q:name})}));
 function focus(){setOpen(true);try{const value:unknown=JSON.parse(localStorage.getItem(recentKey)||'[]');if(Array.isArray(value))setRecent(value.filter((item):item is string=>typeof item==='string'&&item.length<=80).slice(0,5));}catch{/* Search works without storage. */}}
 function remember(){if(!query.trim())return;try{const value=[query.trim(),...recent.filter(item=>item!==query.trim())].slice(0,5);localStorage.setItem(recentKey,JSON.stringify(value));setRecent(value);}catch{/* Optional device-only history. */}setOpen(false);}
 function keys(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Escape'){setOpen(false);setActive(-1);}if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setActive(value=>Math.min(value+1,choices.length-1));}if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>Math.max(value-1,0));}if(event.key==='Enter'&&open&&active>=0&&choices[active]){event.preventDefault();window.location.assign(choices[active]!.href);}}
 return <div ref={ref} className="relative col-span-full row-start-2 min-w-0 md:col-span-1 md:row-auto">
  <form action="/search" role="search" aria-label="Product search" className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-[#f6f7fb] px-4 py-1" onSubmit={remember}>
   <MagnifyingGlassIcon className="size-5 shrink-0 text-muted" /><label className="sr-only" htmlFor={id}>Search products</label>
   <input id={id} type="search" name="q" autoComplete="off" value={query} maxLength={80} onChange={event=>{setQuery(event.target.value);setItems([]);setActive(-1);setOpen(true);}} onFocus={focus} onKeyDown={keys} role="combobox" aria-expanded={open&&choices.length>0} aria-controls={id+'-results'} aria-autocomplete="list" aria-activedescendant={active>=0?id+'-'+active:undefined} placeholder="Search products, brands & essentials" className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-normal focus-visible:outline-offset-0" />
   <button type="submit" className="flex size-10 min-h-10 shrink-0 items-center justify-center rounded-full p-2" aria-label="Search"><ArrowRightIcon className="size-5" /></button>
  </form>
  {open&&choices.length?<div className="absolute inset-x-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-raised"><div className="flex items-center justify-between px-3 text-xs text-muted"><span>{query.length>=2?'Suggestions':'Recent searches on this device'}</span>{query.length<2?<button type="button" className="min-h-9 border-0 bg-transparent p-1 text-muted hover:bg-subtle" onClick={()=>{try{localStorage.removeItem(recentKey);setRecent([]);}catch{/* Optional device history. */}}} aria-label="Clear recent searches"><XMarkIcon className="size-4" /></button>:null}</div><ul id={id+'-results'} role="listbox" className="m-0 list-none p-0">{choices.map((item,index)=><li key={item.href} id={id+'-'+index} role="option" aria-selected={index===active}><Link href={item.href} onClick={()=>setOpen(false)} className={`flex min-h-11 items-center rounded-xl px-3 text-sm text-ink hover:bg-subtle ${index===active?'bg-subtle':''}`}>{item.name}</Link></li>)}</ul></div>:null}
 </div>;
}
