"use client";
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useState } from 'react';
import { Icon } from './storefront-icon';
import { Button } from './ui/button';
import Link from './app-link';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { attributeCart } from '../lib/search/attribution';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { ArrowPathIcon } from './storefront-icons';
export function AddToCart({ id, stock, quantityPicker = false, name, priceLabel, locale = 'en' }: { id: string; stock: number; quantityPicker?: boolean; name?: string; priceLabel?: string; locale?: Locale }) {
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function add() {
    setPending(true); setMessage('');
    try {
      // Storage parsing/validation is needed only after an explicit cart interaction.
      const { saveCart, storedCart } = await import('../lib/catalog/browser-cart');
      const lines = storedCart();
      const previous = lines.find(line => line.id === id)?.quantity ?? 0;
      const error = await checkAddition(id, previous + quantity);
      if (error) { setMessage(error); return; }
      // A different tab may have changed storage while the stock request was in flight.
      if (JSON.stringify(lines) !== JSON.stringify(storedCart())) { setMessage(u(locale,"Your cart changed. Please try again.")); return; }
      saveCart([...lines.filter(line => line.id !== id), { id, quantity: previous + quantity }]);
      recordCommerceEvent('cart_updated');
      attributeCart(id);
      setMessage(u(locale,"Added to cart."));
    } catch { setMessage(u(locale,"Unable to save your cart in this browser.")); }
    finally { setPending(false); }
  }
  return <div className={`cart-controls ${quantityPicker ? 'purchase-controls' : ''}`}><div className="purchase-control-row flex min-w-0 flex-wrap items-center gap-3">{quantityPicker && stock > 0 ? <div className="purchase-quantity flex shrink-0 items-center rounded-xl border [&_input]:w-9 [&_input]:min-w-0 [&_input]:appearance-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:py-1 [&_input]:text-center [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none"><label className="sr-only" htmlFor={`quantity-${id}`}>{u(locale,"Quantity")}</label><Button variant="ghost" size="icon" type="button" className="quantity-step size-11 min-w-11 rounded-none border-0 bg-transparent p-1.5 disabled:bg-transparent [&_.icon]:size-4" aria-label={u(locale,"Decrease purchase quantity")} disabled={pending || quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Icon name="minus" /></Button><input id={`quantity-${id}`} type="number" inputMode="numeric" disabled={pending} min={1} max={Math.min(stock, 999)} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(stock, 999, Number(event.target.value) || 1)))} /><Button variant="ghost" size="icon" type="button" className="quantity-step size-11 min-w-11 rounded-none border-0 bg-transparent p-1.5 disabled:bg-transparent [&_.icon]:size-4" aria-label={u(locale,"Increase purchase quantity")} disabled={pending || quantity >= Math.min(stock, 999)} onClick={() => setQuantity(value => Math.min(stock, 999, value + 1))}><Icon name="plus" /></Button></div> : null}
    <Button variant={quantityPicker ? "accent" : "outline"} className={`add-to-cart    min-h-12 rounded-xl px-3 py-3 text-sm font-semibold ${quantityPicker ? 'min-w-[160px] flex-1' : 'min-w-11 w-full'}`} type="button" aria-label={locale === 'ar' ? `${stock <= 0 ? u(locale,'Out of stock') : pending ? u(locale,'Checking…') : u(locale,'Add to cart')}${name ? ': '+name : ''}` : name ? stock <= 0 ? `Out of stock: ${name}` : pending ? `Checking… ${name}` : `Add to cart: ${name}` : stock <= 0 ? u(locale,"Out of stock") : pending ? u(locale,"Checking…") : u(locale,"Add to cart")} aria-busy={pending} data-added={message === u(locale,"Added to cart.")} disabled={pending || stock <= 0} onClick={add}>{stock <= 0 ? <><span className="add-unavailable" aria-hidden="true"><Icon name="bag" /></span><span className={quantityPicker ? "add-label" : "add-label sr-only md:not-sr-only"}>{u(locale,"Out of stock")}</span></> : pending ? <><ArrowPathIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /><span className={quantityPicker ? "add-label" : "add-label sr-only md:not-sr-only"}>{u(locale,"Checking…")}</span></> : <><span className="purchase-feedback inline-flex" aria-hidden="true">{message === u(locale,"Added to cart.") ? <Icon name="check" /> : <><span className="add-desktop hidden md:inline-flex"><Icon name="bag" /></span><span className={quantityPicker ? "add-mobile hidden" : "add-mobile inline-flex md:hidden"}><Icon name="plus" /></span></>}</span><span className={quantityPicker ? "add-label" : "add-label sr-only md:not-sr-only"}>{u(locale,"Add to cart")}</span>{priceLabel ? <span className="ml-auto text-xs font-semibold">{priceLabel}</span> : null}</>}</Button></div><p role="status" className="status col-span-full text-xs empty:hidden" aria-atomic="true">{message}</p>{message === u(locale,'Added to cart.') ? <Link className="view-cart-link" href="/cart">{u(locale,"View cart")}</Link> : null}</div>;
}
