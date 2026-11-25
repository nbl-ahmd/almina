'use client';
import { useEffect, useRef } from 'react';
import type { Locale } from '../lib/i18n';
import { burst, haptic, playChime, prefersReducedMotion } from '../lib/ui/celebration';

/** Zomato / Swiggy "order placed" moment: a green screen, a tick that draws itself, a chime, a short haptic and one
 *  confetti burst, then it fades to reveal the receipt underneath. It never takes focus or pointer events, so the
 *  confirmation heading (already focused) and its actions stay usable while it plays. Seen once per order. */
export function OrderPlacedCelebration({ locale, orderId, onDone }: { locale: Locale; orderId: string; onDone: () => void }) {
  const mark = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced = prefersReducedMotion();
    playChime('order');
    haptic([14, 70, 28]);
    const confetti = window.setTimeout(() => { if (mark.current) burst(mark.current, { count: 42, spread: 2.2, power: 1.5 }); }, 420);
    const done = window.setTimeout(onDone, reduced ? 1100 : 2100);
    return () => { window.clearTimeout(confetti); window.clearTimeout(done); };
  }, [onDone]);
  const ar = locale === 'ar';
  return <div className="qc-celebration" aria-hidden="true">
    <div className="qc-celebration-mark" ref={mark}>
      <svg viewBox="0 0 120 120" width="132" height="132" focusable="false"><circle className="ring" cx="60" cy="60" r="54" /><circle className="disc" cx="60" cy="60" r="46" /><path d="M38 62l15 15 30-32" /></svg>
    </div>
    <p className="qc-celebration-title">{ar ? 'تم تقديم طلبك!' : 'Order placed!'}</p>
    <p className="qc-celebration-sub">{ar ? `الطلب ${orderId}` : `Order ${orderId}`}</p>
  </div>;
}
