'use client';
import { t, type Locale } from '../lib/i18n';
import Link from './app-link';
import { useEffect,useId,useRef,useState,type KeyboardEvent } from 'react';
import { MagnifyingGlassIcon,ArrowRightIcon,XMarkIcon,ClockIcon,ArrowUpRightIcon,Squares2X2Icon } from '@heroicons/react/24/outline';
type Suggestion={name:string;href:string;kind?:'category'|'product'|'brand'|'collection'|'popular'|'related'};
const recentKey='almina.recent-searches.v1';
const browseTones=['bg-subtle','bg-accent','bg-sale-surface','bg-warning-surface'];
export function SearchBox({ locale = 'en', mobileShell = false }: { locale?: Locale; mobileShell?: boolean }){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[items,setItems]=useState<Suggestion[]>([]),[recent,setRecent]=useState<string[]>([]),[active,setActive]=useState(-1),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false);
 const ref=useRef<HTMLDivElement>(null),id=useId(),ar=locale==='ar',trimmed=query.trim(),searching=trimmed.length>=2;
 useEffect(() => {
  const close = () => { setOpen(false); setActive(-1); };
  const outside = (event: PointerEvent) => {
   if (!ref.current?.contains(event.target as Node)) close();
  };
  document.addEventListener('pointerdown', outside);
  window.addEventListener('popstate', close);
  return () => {
   document.removeEventListener('pointerdown', outside);
   window.removeEventListener('popstate', close);
  };
 }, []);

 function closeSearch({ dismissKeyboard = false } = {}) {
  // A tap on Cancel returns focus to the form and dismisses the software keyboard.
  ref.current?.querySelector(dismissKeyboard ? 'form' : 'input')?.focus({ preventScroll: true });
  setOpen(false);
  setActive(-1);
 }

 function dismissWithEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open) return;
  event.preventDefault();
  event.stopPropagation();
  closeSearch();
 }
 useEffect(()=>{
  const controller=new AbortController();if(trimmed.length<2)return()=>controller.abort();
  const timer=setTimeout(()=>{void fetch('/api/search/suggest?'+new URLSearchParams({q:trimmed,locale}),{signal:controller.signal,cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Search unavailable');return response.json();}).then((data:{products:Suggestion[];categories:Suggestion[];brands?:Suggestion[];collections?:Suggestion[];popular?:Suggestion[];related?:Suggestion[];unavailable?:boolean})=>{if(controller.signal.aborted)return;setFailed(Boolean(data.unavailable));setItems([...(data.popular??[]).slice(0,1).map(item=>({...item,kind:'popular' as const})),...(data.brands??[]).slice(0,1).map(item=>({...item,kind:'brand' as const})),...(data.collections??[]).slice(0,1).map(item=>({...item,kind:'collection' as const})),...data.categories.slice(0,2).map(item=>({...item,kind:'category' as const})),...data.products.slice(0,4).map(item=>({...item,kind:'product' as const})),...(data.related??[]).slice(0,1).map(item=>({...item,kind:'related' as const}))].slice(0,8));setLoading(false);}).catch(()=>{if(!controller.signal.aborted){setLoading(false);setFailed(true);}});},220);
  return()=>{clearTimeout(timer);controller.abort();};
 },[trimmed,locale]);
 const browse=[{name:ar?'العناية بالبشرة':'Skincare essentials',href:'/collections/skin-essentials'},{name:ar?'العناية بالأطفال':'Baby & family care',href:'/collections/baby-care'},{name:ar?'العناية اليومية':'Everyday personal care',href:'/collections/daily-care'},{name:ar?'٥٠ درهماً وأقل':'AED 50 & under',href:'/collections/under-50'}];
 useEffect(()=>{if(open&&active>=0)document.getElementById(id+'-'+active)?.scrollIntoView({block:'nearest'});},[active,open,id]);
 const showBrowse=!trimmed&&!recent.length,showRecent=!trimmed&&recent.length>0;
 const choices:Suggestion[]=searching?items:showRecent?recent.map(name=>({name,href:'/search?'+new URLSearchParams({q:name})})):showBrowse?browse:[];
 function focus(){setOpen(true);try{const value:unknown=JSON.parse(localStorage.getItem(recentKey)||'[]');if(Array.isArray(value))setRecent(value.filter((item):item is string=>typeof item==='string'&&item.length<=80).slice(0,5));}catch{/* Search works without storage. */}}
 function remember(value=query){if(!value.trim())return;try{const next=[value.trim(),...recent.filter(item=>item!==value.trim())].slice(0,5);localStorage.setItem(recentKey,JSON.stringify(next));setRecent(next);}catch{/* Optional device-only history. */}setOpen(false);setActive(-1);}
 function keys(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Escape'){dismissWithEscape(event);return;}if(event.key==='ArrowDown'){event.preventDefault();setOpen(true);setActive(value=>Math.min(value+1,choices.length-1));}if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>Math.max(value-1,-1));}if(event.key==='Enter'&&open&&active>=0&&choices[active]){event.preventDefault();remember();window.location.assign(choices[active]!.href);}}
 const heading=searching?t(locale,'searchSuggestions'):showRecent?t(locale,'searchRecent'):(ar?'استكشف المتجر':'Explore the pharmacy');
 const rowBase='flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-ink';
 return <div ref={ref} className="sf-search" data-search-expanded={mobileShell && open ? true : undefined} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={dismissWithEscape}>
  <form action="/search" role="search" tabIndex={mobileShell ? -1 : undefined} aria-label={t(locale,'searchAria')} className="storefront-search-form" onSubmit={()=>remember()}>
   <MagnifyingGlassIcon className="size-[18px] shrink-0 text-muted" aria-hidden="true" /><label className="sr-only" htmlFor={id}>{t(locale,'searchProducts')}</label>
   <input data-slot="header-search-input" id={id} type="search" name="q" autoComplete="off" enterKeyHint="search" value={query} maxLength={80} onChange={event=>{const next=event.target.value;setQuery(next);setItems([]);setLoading(next.trim().length>=2);setFailed(false);setActive(-1);setOpen(true);}} onFocus={focus} onClick={()=>{if(!open)focus();}} onKeyDown={keys} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id+'-results':undefined} aria-autocomplete="list" aria-activedescendant={open&&active>=0?id+'-'+active:undefined} placeholder={t(locale,'searchPlaceholder')} className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-normal text-ink placeholder:text-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none" />
   {query?<button data-slot="search-clear" type="button" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-2 text-muted transition-colors hover:bg-subtle hover:text-ink" aria-label={ar?'مسح البحث':'Clear search'} onClick={()=>{setQuery('');setItems([]);setLoading(false);setActive(-1);ref.current?.querySelector('input')?.focus();}}><XMarkIcon className="size-4" /></button>:null}
   <button data-slot="search-submit" type="submit" className="sf-search-submit" aria-label={t(locale,'searchSubmit')}><span className="sf-search-label">{t(locale,'searchSubmit')}</span><ArrowRightIcon className="rtl:rotate-180 size-[18px]" aria-hidden="true" /></button>
  </form>
  {mobileShell && open && <button type="button" className="mobile-search-cancel" onClick={() => closeSearch({ dismissKeyboard: true })}>{ar ? 'إلغاء' : 'Cancel'}</button>}
  {open?<div data-slot="search-panel" className="storefront-search-panel">
   <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1"><span className={`text-xs font-semibold text-muted ${ar?'':'uppercase tracking-[0.08em]'}`}>{heading}</span>{showRecent?<button data-slot="recent-clear" type="button" className="min-h-11 rounded-lg border-0 bg-transparent px-2 text-xs font-medium text-ink transition-colors hover:bg-subtle" aria-label={t(locale,'searchClear')} onClick={()=>{try{localStorage.removeItem(recentKey);setRecent([]);}catch{/* Optional device history. */}}}>{t(locale,'searchClearShort')}</button>:null}</div>
   <ul id={id+'-results'} role="listbox" aria-label={t(locale,'searchSuggestions')} aria-busy={loading} className={`m-0 list-none ${showBrowse?'grid grid-cols-2 gap-2 px-3 pt-2 pb-3':showRecent||searching?'flex flex-col gap-0.5 p-2':'p-0'}`}>
    {showBrowse?browse.map((item,index)=><li key={item.href} id={id+'-'+index} role="option" aria-selected={index===active}><Link href={item.href} data-search-browse onClick={()=>setOpen(false)} className={`flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-snug font-medium text-ink ring-1 ring-transparent transition-[background-color,box-shadow] hover:bg-white hover:ring-ink/15 ${browseTones[index]} ${index===active?'ring-2 ring-ink/50':''}`}><span className="min-w-0">{item.name}</span><ArrowUpRightIcon className="size-3.5 shrink-0 text-ink/40 rtl:-scale-x-100" aria-hidden="true" /></Link></li>):choices.map((item,index)=><li key={item.href} id={id+'-'+index} role="option" aria-selected={index===active}><Link href={item.href} onClick={()=>{if(searching)remember();else setOpen(false);}} className={`${rowBase} min-h-12 ${index===active?'bg-accent':''}`}>{item.kind?<span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${item.kind==='category'?'bg-accent text-teal':'bg-page text-ocean'}`}>{item.kind==='category'?<Squares2X2Icon className="size-4" aria-hidden="true" />:<MagnifyingGlassIcon className="size-4" aria-hidden="true" />}</span>:<ClockIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />}<span className="min-w-0 flex-1"><span className="block break-words">{item.name}</span>{item.kind?<span className="mt-0.5 block text-xs leading-4 text-muted">{({category:t(locale,'navCategories'),product:t(locale,'navProducts'),brand:ar?'علامة تجارية':'Brand',collection:ar?'مجموعة':'Collection',popular:ar?'بحث شائع':'Popular search',related:ar?'بحث ذو صلة':'Related search'})[item.kind]}</span>:null}</span><ArrowUpRightIcon className="size-3.5 shrink-0 text-muted rtl:-scale-x-100" aria-hidden="true" /></Link></li>)}
   </ul>
   {searching&&loading?<div aria-hidden="true" className="flex flex-col gap-0.5 px-2 pb-3">{[0,1,2].map(item=><div key={item} className="flex min-h-12 items-center gap-3 px-3 py-2"><span className="size-8 shrink-0 rounded-lg bg-subtle motion-safe:animate-pulse" /><span className="h-3 w-2/3 rounded-full bg-subtle motion-safe:animate-pulse" /></div>)}</div>:null}
   <p role="status" className="sr-only">{!searching?'':loading?(ar?'جارٍ البحث…':'Finding matches…'):failed?(ar?'الاقتراحات غير متاحة. لا يزال بإمكانك البحث في المتجر.':'Suggestions are unavailable. You can still search the store.'):choices.length?(ar?`${choices.length} اقتراحات متاحة.`:`${choices.length} suggestions available.`):(ar?'لم نعثر على اقتراحات. جرّب اسم المنتج أو العلامة التجارية.':'No suggestions found. Try a product name or brand.')}</p>
   {searching&&!loading&&!choices.length?<div className="flex items-start gap-3 px-4 py-5 text-sm leading-6 text-muted"><MagnifyingGlassIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p className="m-0">{failed?(ar?'الاقتراحات غير متاحة. لا يزال بإمكانك البحث في المتجر.':'Suggestions are unavailable. You can still search the store.'):(ar?'لم نعثر على اقتراحات. جرّب اسم المنتج أو العلامة التجارية.':'No suggestions found. Try a product name or brand.')}</p></div>:null}
   {trimmed?<Link href={'/search?'+new URLSearchParams({q:trimmed})} onClick={()=>remember()} className="flex min-h-12 items-center justify-between gap-3 border-t border-border bg-page/60 px-4 text-sm font-semibold text-ink transition-colors hover:bg-subtle"><span className="min-w-0 truncate">{ar?'عرض نتائج البحث':'See all results'} “{trimmed}”</span><ArrowRightIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" /></Link>:null}
  </div>:null}
 </div>;
}
