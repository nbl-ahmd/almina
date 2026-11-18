'use client';

import type { FormEvent, ReactNode } from 'react';
import type { Locale } from '../lib/i18n';
import { shopText } from '../lib/i18n-storefront';

/** Native GET navigation; this island only validates the relationship between bounds. */
export function CatalogFilterForm({ children, className, locale }: { children: ReactNode; className?: string | undefined; locale: Locale }) {
  function upperBound(form: HTMLFormElement) {
    const field = form.elements.namedItem('maxPrice');
    return field instanceof HTMLInputElement ? field : null;
  }
  function validate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget, lower = form.elements.namedItem('minPrice'), upper = upperBound(form);
    if (!(lower instanceof HTMLInputElement) || !upper || !lower.value || !upper.value) return;
    if (lower.valueAsNumber > upper.valueAsNumber) {
      event.preventDefault();
      upper.setCustomValidity(locale === 'ar' ? 'يجب أن يكون السعر الأعلى مساوياً للسعر الأدنى أو أكبر منه.' : 'The maximum price must be at least the minimum price.');
      upper.setAttribute('aria-invalid', 'true');
      upper.reportValidity();
    }
  }
  return <form className={className} method="get" role="search" aria-label={shopText(locale, 'Filter products')}
    onSubmit={validate} onInput={event => { const upper = upperBound(event.currentTarget); upper?.setCustomValidity(''); upper?.removeAttribute('aria-invalid'); }}>
    {children}
  </form>;
}
