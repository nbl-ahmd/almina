'use client';
import Link from './app-link';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, Popover } from 'radix-ui';
import { Bars3Icon, ChevronDownIcon, ArrowUpRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/button';
import { LanguageSwitcher } from './language-switcher';
import { businessContact } from '../lib/policies';
import { t, type Locale } from '../lib/i18n';
function MenuSection({ mobile, title, children, className = '' }: { mobile: boolean; title: string; children: ReactNode; className?: string }) {
 return mobile ? <details className={`menu-group ${className}`}><summary>{title}<ChevronDownIcon aria-hidden="true" /></summary>{children}</details> : <div className={className}><h2 className="mb-2 px-3 text-base font-semibold">{title}</h2>{children}</div>;
}
export type MenuCategory={name:string;href:string};
export function StorefrontMenu({categories,locale='en',mobile=false,acceptedChrome=false}:{categories:MenuCategory[];locale?:Locale;mobile?:boolean;acceptedChrome?:boolean}) {
 const [open,setOpen]=useState(false),[value,setValue]=useState('');
 const [pointerEntry, setPointerEntry] = useState(false);
 const [container,setContainer]=useState<HTMLElement|null>(null);
 const pathname=usePathname();
 useEffect(()=>{
  const media=window.matchMedia('(min-width:768px)');
  const change=()=>{setOpen(false);setValue('');};
  media.addEventListener('change',change);
  return()=>media.removeEventListener('change',change);
 },[]);
 const ar=locale==='ar';
 const inCategories = pathname === '/categories' || pathname.startsWith('/categories/');
 const collections=[{name:ar?'العناية بالبشرة':'Skincare essentials',href:'/collections/skin-essentials'}, {name:ar?'العناية بالأطفال':'Baby & family care',href:'/collections/baby-care'}, {name:ar?'العناية اليومية':'Everyday personal care',href:'/collections/daily-care'}, {name:ar?'٥٠ درهماً وأقل':'AED 50 & under',href:'/collections/under-50'}];
 function menuLink(name:string,href:string){return <Link key={href} href={href} aria-current={pathname===href?'page':undefined} onClick={()=>{setOpen(false);setValue('');}} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{name}</Link>;}
 const content=<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.9fr] md:gap-8">
  <div><h2 className="mb-2 px-3 text-base font-semibold">{ar?'تسوق حسب الفئة':'Shop by category'}</h2><div className="grid grid-cols-2 gap-x-2">{categories.slice(0,12).map(category=>menuLink(category.name,category.href))}</div>{menuLink(t(locale,'linkCategories'),'/categories')}</div>
  <MenuSection mobile={mobile} title={ar?'العناية لكل يوم':'Care for every day'}>{collections.map(item=>menuLink(item.name,item.href))}{menuLink(t(locale,'linkShopBrands'),'/brands')}</MenuSection>
  <MenuSection mobile={mobile} title={ar?'قريبون منك':'Your local care team'} className="rounded-xl bg-accent p-2 md:hidden lg:block"><p className="mb-3 text-sm leading-6 text-ocean">{ar?'تواصل معنا للاستفسار عن المنتجات والتوصيل والطلبات.':'Questions about a product or your order? We’re here to help.'}</p>{menuLink(t(locale,'linkContact'),'/contact')}{mobile ? <a href={businessContact.whatsapp} target="_blank" rel="noopener noreferrer"
    className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink hover:bg-subtle">
    <span>{ar ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}</span><ArrowUpRightIcon className="size-3.5 shrink-0 text-muted rtl:-rotate-90" aria-hidden="true" />
  </a> : null}{menuLink(t(locale,'linkGuides'),'/health-guides')}{menuLink(t(locale,'linkOffers'),'/offers')}</MenuSection>
 </div>;
 if(mobile)return <div className="contents" ref={setContainer}><Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button variant="ghost" size="icon" aria-label={ar?'افتح قائمة التسوق':'Open shopping menu'} className="rounded-full text-ink hover:bg-subtle md:hidden" onClick={event => setPointerEntry(event.detail > 0)}><Bars3Icon className="size-5" aria-hidden="true" /></Button></Dialog.Trigger><Dialog.Portal container={container}><Dialog.Overlay className="fixed inset-0 z-50 bg-ink/35" /><Dialog.Content dir={ar?'rtl':'ltr'} data-pointer-entry={pointerEntry || undefined} className="storefront-menu-sheet fixed inset-y-0 start-0 z-[60] flex w-[min(92vw,420px)] flex-col bg-white text-ink shadow-raised outline-none"><div className="flex items-center justify-between border-b border-border p-4"><Dialog.Title className="m-0 text-xl font-semibold">{ar?'تسوق من صيدلية الميناء':'Explore Al Mina'}</Dialog.Title><Dialog.Close asChild><Button variant="outline" size="icon" aria-label={ar?'أغلق قائمة التسوق':'Close shopping menu'}><XMarkIcon /></Button></Dialog.Close></div><Dialog.Description className="sr-only">{ar?'الفئات والمجموعات وخدمات الصيدلية':'Browse departments, care collections and pharmacy services.'}</Dialog.Description><nav aria-label={ar?'قائمة التسوق':'Shopping menu'} className="flex-1 overflow-y-auto overscroll-contain p-4">{menuLink(t(locale,'linkAllProducts'),'/products')}{content}</nav><div className="flex items-center justify-between gap-3 border-t border-border p-4">{menuLink(t(locale,'linkAccount'),'/account')}<LanguageSwitcher locale={locale} label={t(locale,'language')} /></div></Dialog.Content></Dialog.Portal></Dialog.Root></div>;
 return <nav ref={setContainer} className="relative z-40 min-w-0 flex-1" aria-label={t(locale,'shopNavigationAria')} dir={ar?'rtl':'ltr'}><div className="flex flex-wrap items-center gap-1" data-department-links={acceptedChrome || undefined}><Popover.Root open={value==='categories'} onOpenChange={next=>setValue(next?'categories':'')}><Popover.Trigger asChild><Button variant="ghost" data-department-trigger={acceptedChrome || undefined} data-section-current={acceptedChrome && inCategories || undefined} className="min-h-12 rounded-full bg-accent px-4 text-ink enabled:hover:bg-accent enabled:hover:text-ink data-[state=open]:bg-accent">{ar?'جميع الفئات':'All categories'}<ChevronDownIcon aria-hidden="true" className="transition-transform duration-150 motion-reduce:transition-none [[data-state=open]>&]:rotate-180" /></Button></Popover.Trigger><Popover.Portal container={container}><Popover.Content side="bottom" align="start" sideOffset={1} collisionPadding={16} aria-label={ar?'تصفح الفئات والمجموعات':'Browse categories and collections'} className="storefront-mega-panel z-40 w-[min(1000px,calc(100vw-48px))] rounded-b-2xl border border-border bg-white p-6 text-ink shadow-raised outline-none lg:p-7">{content}</Popover.Content></Popover.Portal></Popover.Root>{[{name:ar?'العناية اليومية':'Everyday care',href:'/collections/daily-care'},{name:t(locale,'navOffers'),href:'/offers'},{name:t(locale,'linkShopBrands'),href:'/brands'},{name:t(locale,'linkGuides'),href:'/health-guides'}].map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?'page':undefined} onClick={()=>setValue('')} className="group relative inline-flex min-h-12 items-center gap-2 whitespace-nowrap px-3 text-[length:var(--store-type-13,0.8125rem)] font-medium text-ink transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-brand after:transition-[transform,background-color] after:duration-200 hover:text-teal hover:after:scale-x-100 hover:after:bg-brand/40 focus-visible:outline-2 focus-visible:outline-ink aria-[current=page]:font-semibold aria-[current=page]:after:scale-x-100 aria-[current=page]:after:bg-brand motion-reduce:after:transition-none">{item.name}</Link>)}</div></nav>;
}
