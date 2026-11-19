'use client';

import { useState } from 'react';
import { ShareIcon } from '@heroicons/react/24/outline';
import type { Locale } from '../lib/i18n';
import { Icon } from './icon';
import styles from './product-detail.module.css';

export function ProductShare({ title, url, locale }: { title: string; url: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const ar = locale === 'ar';
  const label = ar ? 'مشاركة المنتج' : 'Share product';
  const confirmation = ar ? 'تم نسخ رابط المنتج' : 'Product link copied';

  async function share() {
    setCopied(false);
    setManual(false);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setManual(true);
    }
  }

  return <div className={styles.share}>
    <button type="button" onClick={() => { void share(); }} aria-label={label} title={label}>
      {copied ? <span data-store-feedback="true"><Icon name="check" /></span> : <ShareIcon aria-hidden="true" />}
    </button>
    <p role="status" className={copied ? styles.shareNotice : 'sr-only'}>{copied ? confirmation : ''}</p>
    {manual ? <input className={styles.shareNotice} dir="ltr" readOnly value={url}
      aria-label={ar ? 'رابط المنتج' : 'Product link'} onFocus={event => event.currentTarget.select()} /> : null}
  </div>;
}
