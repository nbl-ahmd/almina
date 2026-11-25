'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { z } from 'zod';
import { campaignImageUrl, growthPagePath, growthPageSchema, type GrowthPage } from '@almina/contracts';
import Link from './app-link';
import type { Locale } from '../lib/i18n';
import { XMarkIcon } from './storefront-icons';

// Offer / information popup (Life Pharmacy, Talabat): staff publish a campaign placed as "Popup". It loads after the page
// settles, never on purchase or account pages, never over another dialog (the delivery sheet asks first on a first visit),
// and each campaign revision is shown once per device.
const quiet = /^\/(cart|checkout|account|admin)(\/|$)/;
const seenKey = (page: GrowthPage) => `almina.popup.${page.locale}.${page.slug}.${page.revision}`;

export function OfferPopup({ locale, cloudName }: { locale: Locale; cloudName?: string | undefined }) {
  const path = usePathname() ?? '/';
  const [page, setPage] = useState<GrowthPage | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (quiet.test(path)) return;
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const start = setTimeout(() => {
      void fetch('/api/growth/campaigns?' + new URLSearchParams({ locale }), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
        .then(response => response.ok ? response.json() : null)
        .then(body => {
          const parsed = z.array(growthPageSchema).safeParse(body?.data);
          if (!active || !parsed.success) return;
          const next = parsed.data.find(item => item.homepagePlacement === 'popup' && (() => { try { return localStorage.getItem(seenKey(item)) !== '1'; } catch { return false; } })());
          if (!next) return;
          // Wait for any open dialog (delivery area, filters) to close; give up after ~20 seconds.
          let tries = 0;
          const attempt = () => {
            if (!active) return;
            if (document.querySelector('dialog[open], [role="dialog"][data-state="open"]')) { if (++tries < 40) timer = setTimeout(attempt, 500); return; }
            setPage(next);
          };
          attempt();
        }).catch(() => undefined);
    }, 2200);
    return () => { active = false; controller.abort(); clearTimeout(start); if (timer) clearTimeout(timer); };
  }, [path, locale]);
  useEffect(() => { if (page && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [page]);
  if (!page) return null;
  const close = () => { try { localStorage.setItem(seenKey(page), '1'); } catch { /* Shown again next visit. */ } dialog.current?.close(); setPage(null); };
  const art = campaignImageUrl(page.mobileImage || page.image, cloudName);
  const href = page.ctaHref || (page.productIds.length || page.body ? growthPagePath(page) : '');
  // Poster popups always have a destination when staff gave a button link or the campaign has its own page.
  const ar = locale === 'ar';
  return <dialog ref={dialog} className="qc-sheet qc-popup" aria-labelledby="offer-popup-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }} dir={ar ? 'rtl' : 'ltr'}>
    <button type="button" className="qc-sheet-close" onClick={close} aria-label={ar ? 'إغلاق' : 'Close'}><XMarkIcon className="icon" /></button>
    {page.popupLayout === 'image' && art ? <div className="qc-popup-poster">
      <h2 id="offer-popup-title" className="sr-only">{page.title}</h2>
      {href ? <Link href={href} onClick={close} className="qc-popup-poster-art" aria-label={page.imageAlt || page.title}><Image src={art} alt="" fill sizes="(max-width: 599px) 100vw, 420px" loading="eager" /></Link>
        : <div className="qc-popup-poster-art"><Image src={art} alt={page.imageAlt} fill sizes="(max-width: 599px) 100vw, 420px" loading="eager" /></div>}
      {href ? <Link className="button qc-popup-poster-cta" href={href} onClick={close}>{page.ctaLabel || (ar ? 'تسوق الآن' : 'Shop now')}</Link> : <button type="button" className="button qc-popup-poster-cta" onClick={close}>{ar ? 'حسناً' : 'Got it'}</button>}
    </div> : <div className="qc-popup-body">
      {art ? <div className="qc-popup-art"><Image src={art} alt={page.imageAlt} fill sizes="(max-width: 599px) 100vw, 480px" loading="eager" /></div> : null}
      <div className="qc-popup-copy">
        <h2 id="offer-popup-title">{page.title}</h2>
        {page.description ? <p>{page.description}</p> : null}
        <div className="qc-popup-actions">
          {href && page.ctaLabel ? <Link className="button" href={href} onClick={close}>{page.ctaLabel}</Link> : null}
          <button type="button" className={href && page.ctaLabel ? 'qc-popup-dismiss' : 'button'} onClick={close}>{href && page.ctaLabel ? (ar ? 'ليس الآن' : 'Not now') : (ar ? 'حسناً' : 'Got it')}</button>
        </div>
      </div>
    </div>}
  </dialog>;
}
