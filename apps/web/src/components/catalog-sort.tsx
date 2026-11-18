'use client';

import { NativeSelect } from './ui/native-select';
import { Button } from './ui/button';
import type { Locale } from '../lib/i18n';

export function CatalogSort({ sort, query, locale, className }: {
  sort: string; query: Record<string, string>; locale: Locale; className?: string | undefined;
}) {
  const ar = locale === 'ar';
  return (
    <form method="get" className={className}>
      {Object.entries(query).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <label htmlFor="catalog-sort" className="sr-only">{ar ? 'ترتيب حسب' : 'Sort by'}</label>
      <NativeSelect id="catalog-sort" name="sort" defaultValue={sort} size="sm" onChange={event => event.currentTarget.form?.requestSubmit()}>
        <option value="relevance">{query.q ? (ar ? 'الأكثر صلة' : 'Best match') : (ar ? 'المميزة والمتوفرة' : 'Featured & available')}</option>
        <option value="price-asc">{ar ? 'الأرخص أولاً' : 'Price: low to high'}</option>
        <option value="price-desc">{ar ? 'الأغلى أولاً' : 'Price: high to low'}</option>
        <option value="name">{ar ? 'الاسم' : 'Name'}</option>
      </NativeSelect>
      <noscript><Button type="submit" variant="outline" size="sm">{ar ? 'تطبيق الترتيب' : 'Apply sort'}</Button></noscript>
    </form>
  );
}
