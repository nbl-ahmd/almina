'use client';

import { useSyncExternalStore } from 'react';
import Link from './app-link';
import { Icon } from './icon';
import type { Locale } from '../lib/i18n';
import { productReturnDestination, returnToProductSource, subscribeProductReturn } from '../lib/catalog/product-return';

export function ProductReturnLink({ categoryHref, locale, className, contextOnly = false }: {
  categoryHref: string; locale: Locale; className?: string | undefined; contextOnly?: boolean;
}) {
  const source = useSyncExternalStore(subscribeProductReturn, productReturnDestination, () => null);
  if (contextOnly && !source) return null;
  const label = source
    ? locale === 'ar' ? 'العودة إلى النتائج' : 'Back to results'
    : locale === 'ar' ? 'العودة إلى الفئة' : 'Back to category';
  return <Link href={source ?? categoryHref} aria-label={label} className={className} scroll={!source}
    onNavigate={event => { if (source && returnToProductSource(source)) event.preventDefault(); }}>
    <Icon name="back" />
    {contextOnly ? label : null}
  </Link>;
}
