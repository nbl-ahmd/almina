'use client';

import { useEffect, useState } from 'react';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { currentSaved, loadSavedAccount, changeSaved } from '../lib/catalog/saved-account';
import { HeartIcon } from './storefront-icons';

export function SaveProduct({ id, name, locale = 'en', iconOnly = false }: {
  id: string;
  name: string;
  locale?: Locale;
  iconOnly?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function update() {
      try { setSaved(currentSaved().includes(id)); } catch { /* Optional storage. */ }
    }
    update();
    void loadSavedAccount().then(update);
    window.addEventListener('almina-saved-change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('almina-saved-change', update);
      window.removeEventListener('storage', update);
    };
  }, [id]);

  async function toggle() {
    try {
      await changeSaved(id, saved);
      setError('');
    } catch {
      setError(u(locale, 'Unable to update your saved list. Please try again.'));
    }
  }

  const label = locale === 'ar'
    ? saved ? `إزالة ${name} من المنتجات المحفوظة` : `حفظ ${name}`
    : saved ? `Remove ${name} from saved products` : `Save ${name}`;

  return <>
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      onClick={() => void toggle()}
      className={iconOnly
        ? 'grid size-11 place-items-center rounded-full border border-solid border-border bg-white p-0 text-teal hover:bg-accent'
        : 'flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium'}
    >
      <HeartIcon aria-hidden="true" weight={saved ? 'fill' : 'regular'} className={iconOnly ? 'size-5' : 'size-4'} />
      {!iconOnly && u(locale, saved ? 'Saved' : 'Save for later')}
    </button>
    {error && <p role="status" className={iconOnly
      ? 'absolute end-0 top-full z-10 w-32 rounded-md bg-white p-2 text-xs text-sale shadow-sm'
      : 'text-xs'}>{error}</p>}
  </>;
}
