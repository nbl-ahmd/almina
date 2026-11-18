'use client';

import { useEffect, useState } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { changeSaved, currentSaved, loadSavedAccount } from '../lib/catalog/saved-account';

export function SaveProduct({ id, name, locale = 'en', compact = false, card = false }: {
  id: string; name: string; locale?: Locale; compact?: boolean; card?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => {
      try { setSaved(currentSaved().includes(id)); } catch { /* Optional storage. */ }
    };
    update();
    void loadSavedAccount().then(update);
    window.addEventListener('almina-saved-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('almina-saved-change', update);
      window.removeEventListener('storage', update);
    };
  }, [id]);

  const label = locale === 'ar'
    ? `${saved ? 'إزالة' : 'حفظ'} ${name}${saved ? ' من المنتجات المحفوظة' : ''}`
    : `${saved ? 'Remove' : 'Save'} ${name}${saved ? ' from saved products' : ''}`;
  async function toggle() {
    try {
      await changeSaved(id, saved);
      setError('');
    } catch {
      setError(u(locale, 'Unable to update your saved list. Please try again.'));
    }
  }

  return (
    <>
      <button type="button" data-store-control={card ? 'save' : undefined} aria-pressed={saved} aria-label={label}
        onClick={() => void toggle()} className={card ? 'card-save' : compact ? 'save-product-compact'
          : 'flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-teal hover:bg-subtle hover:text-teal'}>
        <HeartIcon aria-hidden="true" className={`size-4 ${saved && !card ? 'fill-brand' : ''}`} />
        <span className={compact ? 'sr-only' : undefined}>{saved ? u(locale, 'Saved') : u(locale, 'Save for later')}</span>
      </button>
      {error ? <p role="status" className={card ? 'card-save-error' : 'text-xs text-muted'}>{error}</p> : null}
    </>
  );
}
