'use client';
import { useEffect, useRef, useState } from 'react';
import { publicCouponListSchema, type PublicCoupon } from '@almina/contracts';
import type { Locale } from '../lib/i18n';
import { money } from '../lib/catalog/model';
import { ChevronRightIcon, TagIcon, XMarkIcon } from './storefront-icons';

/** 1mg "Coupons & offers": a row under the coupon box opens a sheet of the codes staff chose to list.
 *  Listing is information only; applying still goes through the server preview and the checkout quote. */
export function CouponOffers({ locale, onApply, disabled = false }: { locale: Locale; onApply: (code: string) => void; disabled?: boolean }) {
  const ar = locale === 'ar';
  const [offers, setOffers] = useState<PublicCoupon[] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/growth/coupons', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
      .then(response => response.ok ? response.json() : null)
      .then(body => { const parsed = publicCouponListSchema.safeParse(body?.data); setOffers(parsed.success ? parsed.data.items : []); })
      .catch(() => { if (!controller.signal.aborted) setOffers([]); });
    return () => controller.abort();
  }, []);
  if (!offers?.length) return null;
  const value = (offer: PublicCoupon) => offer.discount.type === 'percent'
    ? `${offer.discount.basisPoints / 100}%${offer.discount.capMinor !== null ? (ar ? ` حتى ${money(offer.discount.capMinor / 100, locale)}` : ` up to ${money(offer.discount.capMinor / 100, locale)}`) : ''}`
    : money(offer.discount.amountMinor / 100, locale);
  const date = (iso: string) => new Intl.DateTimeFormat(ar ? 'ar-AE' : 'en-AE', { day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' }).format(new Date(iso));
  return <>
    <button type="button" className="coupon-offers-row" disabled={disabled} onClick={() => dialog.current?.showModal()}>
      <TagIcon className="coupon-offers-icon" aria-hidden="true" />
      <span><strong>{ar ? 'عرض العروض المتاحة' : 'View available offers'}</strong><small>{ar ? `${offers.length} من الرموز المتاحة` : `${offers.length} ${offers.length === 1 ? 'code' : 'codes'} you can use`}</small></span>
      <ChevronRightIcon className="pdp-info-chevron rtl:rotate-180" aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="qc-sheet coupon-offers-sheet" aria-labelledby="coupon-offers-title" onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <button type="button" className="qc-sheet-close" onClick={() => dialog.current?.close()} aria-label={ar ? 'إغلاق' : 'Close'}><XMarkIcon className="icon" /></button>
      <div className="qc-sheet-body">
        <div aria-hidden="true" className="qc-sheet-grabber" />
        <h2 id="coupon-offers-title" className="qc-sheet-title">{ar ? 'الكوبونات والعروض' : 'Coupons & offers'}</h2>
        <ul className="coupon-offer-list">{offers.map(offer => <li key={offer.code} className="coupon-offer">
          <div className="coupon-offer-head">
            <strong className="coupon-offer-title">{offer.title || (ar ? `خصم ${value(offer)}` : `${value(offer)} off`)}</strong>
            <button type="button" className="coupon-offer-apply" disabled={disabled} onClick={() => { dialog.current?.close(); onApply(offer.code); }} aria-label={ar ? `تطبيق ${offer.code}` : `Apply ${offer.code}`}>{ar ? 'تطبيق' : 'Apply'}</button>
          </div>
          {offer.description ? <p className="coupon-offer-text">{offer.description}</p> : null}
          <p className="coupon-offer-meta">
            <bdi dir="ltr" className="coupon-offer-code">{offer.code}</bdi>
            <span>{[offer.minimumMinor > 0 ? (ar ? `الحد الأدنى ${money(offer.minimumMinor / 100, locale)}` : `Min. spend ${money(offer.minimumMinor / 100, locale)}`) : '', offer.scope !== 'all' ? (ar ? 'على منتجات مختارة' : 'On selected items') : '', offer.endsAt ? (ar ? `ينتهي ${date(offer.endsAt)}` : `Ends ${date(offer.endsAt)}`) : ''].filter(Boolean).join(' · ')}</span>
          </p>
        </li>)}</ul>
      </div>
    </dialog>
  </>;
}
