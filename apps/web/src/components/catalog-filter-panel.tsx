'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { Button } from './ui/button';
import { AdjustmentsHorizontalIcon, XMarkIcon } from './storefront-icons';
import type { Locale } from '../lib/i18n';

function subscribe(callback: () => void) {
  const media = window.matchMedia('(width < 900px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function CatalogFilterPanel({ children, summary, locale }: {
  children: ReactNode;
  summary: ReactNode;
  locale: Locale;
}) {
  const mobile = useSyncExternalStore(subscribe, () => window.matchMedia('(width < 900px)').matches, () => null);
  const [open, setOpen] = useState(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dismiss = () => setOpen(false);
    window.addEventListener('popstate', dismiss);
    return () => window.removeEventListener('popstate', dismiss);
  }, []);

  function changeOpen(next: boolean) {
    if (next) {
      window.history.pushState({ ...window.history.state, alminaFilterSheet: true }, '');
      setOpen(true);
    } else {
      setOpen(false);
      if (window.history.state?.alminaFilterSheet) window.history.back();
    }
  }

  const label = locale === 'ar' ? 'الفلاتر' : 'Filters';

  function clearDraft() {
    const form = content.current?.querySelector('form');
    if (!form) return;
    for (const field of Array.from(form.elements)) {
      if (field instanceof HTMLInputElement && !['sort', 'category'].includes(field.name)) field.value = '';
      if (field instanceof HTMLSelectElement && !field.disabled) field.value = '';
    }
    for (const checkbox of form.querySelectorAll<HTMLButtonElement>('button[role="checkbox"][aria-checked="true"]')) checkbox.click();
    form.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (!mobile) return <details id="catalog-filters" className="catalog-filters group max-lg:open:col-span-2" open={mobile === false}>
    {summary}
    {children}
  </details>;

  return <div className="catalog-mobile-filters order-1 self-center" ref={setContainer}>
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-0 bg-subtle px-2.5 py-0 text-xs! font-semibold! text-teal hover:bg-accent">
          <AdjustmentsHorizontalIcon aria-hidden="true" className="size-4" />
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="shop-modal-scrim" />
        <Dialog.Content className="shop-filter-sheet" dir={locale === 'ar' ? 'rtl' : 'ltr'} ref={content}>
          <div className="filter-sheet-heading">
            <Dialog.Title>{label}</Dialog.Title>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label={locale === 'ar' ? 'إغلاق الفلاتر' : 'Close filters'}><XMarkIcon aria-hidden="true" /></Button></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{locale === 'ar' ? 'اختر الفلاتر ثم طبقها لعرض المنتجات.' : 'Choose filters, then apply them to update products.'}</Dialog.Description>
          {children}
          <div className="filter-sheet-footer">
            <Button variant="outline" onClick={clearDraft}>{locale === 'ar' ? 'إعادة تعيين' : 'Reset'}</Button>
            <Dialog.Close asChild><Button variant="ghost">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</Button></Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
