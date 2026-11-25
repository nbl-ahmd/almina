'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { burst, haptic, playChime } from '../lib/ui/celebration';
import { couponCodeSchema } from '@almina/contracts';
import type { Locale } from '../lib/i18n';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TagIcon } from './storefront-icons';

export function CouponField({ locale, code, disabled = false, busy = false, error = '', onApply, onRemove }: {
  locale: Locale;
  code: string;
  disabled?: boolean;
  busy?: boolean;
  error?: string;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const [entry, setEntry] = useState('');
  const [invalid, setInvalid] = useState(false);
  const ar = locale === 'ar';
  const applied = useRef<HTMLDivElement>(null);
  const previousCode = useRef(code);
  // Zomato "coupon applied": a small burst, a two-note chime and a haptic, only when a code is newly accepted here.
  useEffect(() => {
    if (code && !previousCode.current) { burst(applied.current ?? document.body, { count: 18, spread: 1.4, power: .8 }); playChime('small'); haptic(12); }
    previousCode.current = code;
  }, [code]);
  const label = ar ? 'رمز الخصم' : 'Coupon code';
  const issue = invalid ? (ar ? 'أدخل رمزًا صالحًا من 3 إلى 32 حرفًا أو رقمًا.' : 'Enter a valid code with 3 to 32 letters, numbers or hyphens.') : error;
  function apply() {
    const parsed = couponCodeSchema.safeParse(entry);
    setInvalid(!parsed.success);
    if (parsed.success) onApply(parsed.data);
  }
  return <div className="coupon-field my-4 grid gap-2">
    {code ? <div className="coupon-applied" ref={applied}>
      <TagIcon className="coupon-applied-icon" aria-hidden="true" /><span className="min-w-0"><bdi dir="ltr" className="coupon-applied-code">{code}</bdi><small>{ar ? 'تم تطبيق الرمز' : 'Coupon applied'}</small></span>
      <Button type="button" variant="ghost" className="coupon-remove min-h-11" disabled={disabled} onClick={() => { setEntry(''); setInvalid(false); onRemove(); }}>{ar ? 'إزالة الرمز' : 'Remove coupon'}</Button>
    </div> : <>
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="coupon-entry">
        <Input id={id} placeholder={ar ? 'أدخل رمز الخصم' : 'Enter coupon code'} dir="ltr" value={entry} maxLength={32} autoComplete="off" autoCapitalize="characters" spellCheck={false}
          aria-invalid={Boolean(issue)} aria-describedby={issue ? id+'-error' : undefined} className="min-h-11 min-w-0"
          disabled={disabled} onChange={event => { event.stopPropagation(); setEntry(event.target.value); setInvalid(false); }}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (!disabled) apply(); } }} />
        <Button type="button" variant="ghost" className="coupon-apply min-h-11 shrink-0" disabled={disabled || !entry.trim()} onClick={apply}>{ar ? 'تطبيق' : 'Apply'}</Button>
      </div>
    </>}
    {busy && <p role="status" className="m-0 text-xs">{ar ? 'جارٍ التحقق من الرمز…' : 'Checking coupon…'}</p>}
    {issue && <p role="alert" id={id+'-error'} className="m-0 text-xs">{issue}</p>}
  </div>;
}
