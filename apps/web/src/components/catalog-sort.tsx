'use client';
import { NativeSelect } from './ui/native-select';
import type { Locale } from '../lib/i18n';
export function CatalogSort({sort,query,locale}:{sort:string;query:Record<string,string>;locale:Locale}) {
 const ar=locale==='ar';
 return <form method="get" className="flex min-w-0 items-center gap-2">
  {Object.entries(query).map(([key,value])=><input key={key} type="hidden" name={key} value={value} />)}
  <label htmlFor="catalog-sort" className="shrink-0 text-xs text-muted">{ar?'ترتيب حسب':'Sort by'}</label>
  <NativeSelect id="catalog-sort" name="sort" defaultValue={sort} onChange={event=>event.currentTarget.form?.requestSubmit()} className="min-h-11 w-auto max-w-[190px] text-xs">
   <option value="relevance">{query.q?(ar?'الأكثر صلة':'Best match'):(ar?'المميزة والمتوفرة':'Featured & available')}</option>
   <option value="price-asc">{ar?'السعر: من الأقل للأعلى':'Price: low to high'}</option><option value="price-desc">{ar?'السعر: من الأعلى للأقل':'Price: high to low'}</option><option value="name">{ar?'الاسم':'Name'}</option>
  </NativeSelect>
  <noscript><button type="submit">{ar?'تطبيق':'Apply'}</button></noscript>
 </form>;
}
