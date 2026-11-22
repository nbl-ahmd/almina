'use client';

import { useEffect, useState } from 'react';
import { appliedCouponSchema } from '@almina/contracts';
import { couponError, readCoupon, saveCoupon } from '../lib/checkout/coupon';
import { money, type CartLine } from '../lib/catalog/model';
import type { Locale } from '../lib/i18n';
import { CouponField } from './coupon-field';

export function CartCoupon({ lines, locale }: { lines: CartLine[]; locale: Locale }) {
  const [request, setRequest] = useState<{ code: string } | null>(() => {
    const code = readCoupon();
    return code ? { code } : null;
  });
  const [checked, setChecked] = useState<{ request: NonNullable<typeof request>; items: string; discount?: number; error?: string } | null>(null);
  const items = JSON.stringify(lines.map(line => ({ productId: line.id, quantity: line.quantity })));
  const current = checked?.request === request && checked.items === items ? checked : null;
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    async function validate(next: NonNullable<typeof request>) {
      try {
        const response = await fetch('/api/growth/coupon-preview', {
          method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
          body: JSON.stringify({ couponCode: next.code, items: JSON.parse(items) }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.code ?? 'SERVICE_UNAVAILABLE');
        const result = appliedCouponSchema.parse(body.data);
        if (controller.signal.aborted) return;
        setChecked({ request: next, items, discount: result.discountMinor });
        saveCoupon(result.code);
      } catch (cause) {
        if (controller.signal.aborted) return;
        const error = cause instanceof Error ? cause.message : '';
        setChecked({ request: next, items, error });
        if (error === 'COUPON_UNAVAILABLE' || error === 'COUPON_MINIMUM') saveCoupon('');
      }
    }
    void validate(request);
    return () => controller.abort();
  }, [items, request]);
  const ar = locale === 'ar';
  const busy = !!request && !current;
  const message = current?.error ? couponError(current.error, locale) || (ar ? 'تعذّر التحقق من الرمز. حاول مرة أخرى.' : 'Couldn’t check the coupon. Try again.') : '';
  return <>
    <CouponField locale={locale} code={current?.discount ? current.request.code : ''} busy={busy} disabled={busy} error={message}
      onApply={code => setRequest({ code })} onRemove={() => { setRequest(null); saveCoupon(''); }} />
    {current?.discount && <p role="status" className="m-0 mb-3 flex items-center justify-between gap-2 text-sm"><span>{ar ? 'خصم الرمز المقدّر' : 'Estimated coupon savings'}</span><strong>−{money(current.discount / 100, locale)}</strong></p>}
  </>;
}
