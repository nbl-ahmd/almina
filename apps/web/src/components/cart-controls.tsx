"use client";
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icon';
import { Button } from './ui/button';
import Link from './app-link';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { attributeCart } from '../lib/search/attribution';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { useRouter } from 'next/navigation';
import { ArrowPathIcon, ChevronRightIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
export function AddToCart({ id, stock, quantityPicker = false, name, priceLabel, locale = 'en', compact = false }: { id: string; stock: number; quantityPicker?: boolean; name?: string; priceLabel?: ReactNode; locale?: Locale; compact?: boolean }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const cartStateId = useId();
  const increase = useRef<HTMLButtonElement>(null);
  const [cartQuantity, setCartQuantity] = useState(0);
  useEffect(() => {
    if (!compact) return;
    let active = true;
    async function refresh() {
      try {
        const { storedCart } = await import('../lib/catalog/browser-cart');
        if (active) setCartQuantity(storedCart().find(line => line.id === id)?.quantity ?? 0);
      } catch { if (active) setCartQuantity(0); }
    }
    void refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('almina-cart-change', refresh);
    return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('almina-cart-change', refresh); };
  }, [compact, id]);
  async function changeQuantity(delta: number) {
    setPending(true); setMessage('');
    try {
      // Storage parsing/validation is needed only after an explicit cart interaction.
      const { saveCart, storedCart } = await import('../lib/catalog/browser-cart');
      const lines = storedCart();
      const previous = lines.find(line => line.id === id)?.quantity ?? 0;
      if (delta < 0 && previous === 0) return;
      const next = previous + delta;
      const error = next > 0 ? await checkAddition(id, next) : null;
      if (error) { setMessage(error); return; }
      // A different tab may have changed storage while the stock request was in flight.
      if (JSON.stringify(lines) !== JSON.stringify(storedCart())) { setMessage(u(locale,"Your cart changed. Please try again.")); return; }
      if (next === 0) {
        increase.current?.focus({ preventScroll: true });
        saveCart(lines.filter(line => line.id !== id));
      } else if (delta < 0) {
        saveCart(lines.map(line => line.id === id ? { id, quantity: next } : line));
      } else {
        saveCart([...lines.filter(line => line.id !== id), { id, quantity: next }]);
      }
      recordCommerceEvent('cart_updated');
      if (delta > 0) {
        attributeCart(id);
        setMessage(u(locale, "Added to cart."));
      }
    } catch { setMessage(u(locale,"Unable to save your cart in this browser.")); }
    finally { setPending(false); }
  }
  if (compact) {
    const state = stock <= 0 ? 'Out of stock' : pending ? 'Checking…' : 'Add to cart';
    const added = message === u(locale, 'Added to cart.');
    const count = new Intl.NumberFormat(locale === 'ar' ? 'ar-AE-u-nu-arab' : 'en-AE').format(cartQuantity);
    return (
      <div className="card-cart-controls">
        <div className={cartQuantity > 0 ? 'card-cart-stepper' : 'contents'} role={cartQuantity > 0 ? 'group' : undefined}
          aria-label={cartQuantity > 0 ? u(locale, 'Quantity') : undefined}>
          {cartQuantity > 0 ? <Button variant="ghost" size="icon-sm" type="button"
            aria-label={u(locale, 'Decrease purchase quantity')} aria-disabled={pending || undefined}
            onClick={() => { if (!pending) void changeQuantity(-1); }}><Icon name="minus" /></Button> : null}
          {cartQuantity > 0 ? <output id={cartStateId} className="card-cart-count">{count}</output> : null}
          <Button ref={increase} variant={cartQuantity > 0 ? 'ghost' : 'accent'} size="icon-sm" className="add-to-cart shadow-2xs" type="button"
            aria-label={name ? `${u(locale, state)}: ${name}` : u(locale, state)}
            aria-describedby={cartQuantity > 0 ? cartStateId : undefined} aria-busy={pending}
            data-in-cart={cartQuantity > 0} data-added={added} aria-disabled={pending || undefined}
            disabled={stock <= 0} onClick={() => { if (!pending) void changeQuantity(1); }}>
            {stock <= 0 ? <NoSymbolIcon aria-hidden="true" />
              : pending ? <ArrowPathIcon className="motion-safe:animate-spin" aria-hidden="true" />
              : <Icon name="plus" />}
          </Button>
        </div>
        <p role="status" data-added={added} className="card-cart-status" aria-atomic="true">{message}</p>
      </div>
    );
  }
  const added = message === u(locale, 'Added to cart.');
  const goToCart = quantityPicker && added;
  const label = goToCart ? (locale === 'ar' ? 'اذهب إلى السلة' : 'Go to cart') : stock <= 0 ? u(locale, 'Out of stock') : pending ? u(locale, 'Checking…') : u(locale, 'Add to cart');
  const max = Math.min(stock, 999);
  const quantityId = `quantity-${id}`;
  function updateQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(max, next)));
    setMessage('');
  }
  const feedback = <>
    <p role="status" data-added={added} className={goToCart ? "sr-only" : "status col-span-full text-xs text-teal empty:hidden"} aria-atomic="true">{message ? (
      <span data-store-feedback={added ? 'true' : undefined}>
        {added ? <Icon name="check" /> : null}
        {message}
      </span>
    ) : null}</p>
    {added && !goToCart ? <Link className="view-cart-link text-teal" href="/cart">{u(locale, 'View cart')}<ChevronRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link> : null}
  </>;
  return (
    <div className={`cart-controls ${quantityPicker ? 'purchase-controls' : ''}`}>
      <div className="purchase-control-row flex min-w-0 flex-wrap items-center gap-3">
        {quantityPicker && priceLabel ? <span className="pdp-unit-price">
          <span>{locale === 'ar' ? 'سعر الوحدة' : 'Unit price'}</span>{priceLabel}
        </span> : null}
        {quantityPicker && stock > 0 ? (
          <div className="purchase-quantity" data-store-control="stepper">
            <label className="sr-only" htmlFor={quantityId}>{u(locale, 'Quantity')}</label>
            <Button variant="ghost" size="icon" type="button" className="quantity-step"
              aria-label={u(locale, 'Decrease purchase quantity')} disabled={pending || quantity <= 1}
              onClick={() => updateQuantity(quantity - 1)}><Icon name="minus" /></Button>
            <input id={quantityId} type="number" inputMode="numeric" disabled={pending}
              min={1} max={max} value={quantity}
              onChange={event => updateQuantity(Math.trunc(Number(event.target.value)) || 1)} />
            <Button variant="ghost" size="icon" type="button" className="quantity-step"
              aria-label={u(locale, 'Increase purchase quantity')} disabled={pending || quantity >= max}
              onClick={() => updateQuantity(quantity + 1)}><Icon name="plus" /></Button>
          </div>
        ) : null}
        <Button variant="accent" className={`add-to-cart ${quantityPicker ? '' : 'min-w-11 w-full'}`} type="button"
          aria-label={name ? (pending && locale === 'en' ? `${label} ${name}` : `${label}: ${name}`) : label} aria-busy={pending} data-added={added}
          disabled={pending || stock <= 0} onClick={goToCart ? () => router.push('/cart') : () => { void changeQuantity(quantity); }}>
          {stock <= 0 ? null : pending ? <ArrowPathIcon className="motion-safe:animate-spin" aria-hidden="true" />
            : added || quantityPicker ? <Icon name={added ? 'check' : 'plus'} /> : (
              <><span className="hidden md:inline-flex"><Icon name="bag" /></span>
                <span className="inline-flex md:hidden"><Icon name="plus" /></span></>
            )}
          <span key={label} data-store-feedback={goToCart ? 'true' : undefined} className={quantityPicker ? 'add-label' : 'add-label sr-only md:not-sr-only'}>{label}</span>
          {!quantityPicker && priceLabel ? <span className="ms-auto text-xs font-semibold">{priceLabel}</span> : null}
        </Button>
      </div>
      {quantityPicker ? <div className="pdp-purchase-feedback">{feedback}</div> : feedback}
    </div>
  );
}
