"use client";
import { useState } from 'react';
import { Icon } from './icon';
import { DesignIcon } from './design-icon';
import Link from 'next/link';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { recordCommerceEvent } from '../lib/telemetry/browser';
export function AddToCart({ id, stock, quantityPicker = false, name, priceLabel }: { id: string; stock: number; quantityPicker?: boolean; name?: string; priceLabel?: string }) {
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
      if (JSON.stringify(lines) !== JSON.stringify(storedCart())) { setMessage('Your cart changed. Please try again.'); return; }
      saveCart([...lines.filter(line => line.id !== id), { id, quantity: previous + quantity }]);
      recordCommerceEvent('cart_updated');
      setMessage('Added to cart.');
    } catch { setMessage('Unable to save your cart in this browser.'); }
    finally { setPending(false); }
  }
  return <div className={`cart-controls ${quantityPicker ? 'purchase-controls' : ''}`}><div className="purchase-control-row flex min-w-0 flex-wrap items-center gap-3">{quantityPicker && stock > 0 ? <div className="purchase-quantity flex shrink-0 items-center rounded-xl border border-border bg-subtle [&_input]:w-9 [&_input]:min-w-0 [&_input]:appearance-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:py-1 [&_input]:text-center [&_input::-webkit-inner-spin-button]:appearance-none [&_input::-webkit-outer-spin-button]:appearance-none"><label className="sr-only" htmlFor={`quantity-${id}`}>Quantity</label><button type="button" className="quantity-step size-11 min-w-11 rounded-none border-0 bg-transparent p-1.5 text-ink hover:bg-accent hover:text-ink disabled:bg-transparent [&_.icon]:size-4" aria-label="Decrease purchase quantity" disabled={pending || quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Icon name="minus" /></button><input id={`quantity-${id}`} type="number" min={1} max={Math.min(stock, 999)} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(stock, 999, Number(event.target.value) || 1)))} /><button type="button" className="quantity-step size-11 min-w-11 rounded-none border-0 bg-transparent p-1.5 text-ink hover:bg-accent hover:text-ink disabled:bg-transparent [&_.icon]:size-4" aria-label="Increase purchase quantity" disabled={pending || quantity >= Math.min(stock, 999)} onClick={() => setQuantity(value => Math.min(stock, 999, value + 1))}><Icon name="plus" /></button></div> : null}
    <button className={`add-to-cart min-h-11 rounded-lg p-2.5 text-sm font-semibold md:rounded-full ${quantityPicker ? 'min-w-[160px] flex-1' : 'min-w-11 w-full'}`} type="button" aria-label={name ? stock <= 0 ? `Out of stock: ${name}` : pending ? `Checking… ${name}` : `Add to cart: ${name}` : stock <= 0 ? 'Out of stock' : pending ? 'Checking…' : 'Add to cart'} disabled={pending || stock <= 0} onClick={add}>{stock <= 0 ? <span className={quantityPicker ? "add-label" : "add-label sr-only md:not-sr-only"}>Out of stock</span> : pending ? <span className={quantityPicker ? "add-label" : "add-label sr-only md:not-sr-only"}>Checking…</span> : <><span className={quantityPicker ? "add-desktop inline-flex" : "add-desktop hidden md:inline-flex"}><DesignIcon name="add" /></span><span className={quantityPicker ? "add-mobile hidden" : "add-mobile inline-flex md:hidden"}><DesignIcon name="plus" /></span><span className={quantityPicker ? "add-label" : "add-label sr-only md:not-sr-only"}>Add to cart</span>{priceLabel ? <span className="ml-auto text-xs font-semibold">{priceLabel}</span> : null}</>}</button></div><p role="status" className="status col-span-full text-xs text-teal empty:hidden">{message}</p>{message === 'Added to cart.' ? <Link className="view-cart-link text-teal" href="/cart">View cart</Link> : null}</div>;
}
