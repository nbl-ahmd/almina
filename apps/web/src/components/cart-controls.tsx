"use client";
import { useState } from 'react';
import { Icon } from './icon';
import Link from 'next/link';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { recordCommerceEvent } from '../lib/telemetry/browser';
export function AddToCart({ id, stock, quantityPicker = false, name }: { id: string; stock: number; quantityPicker?: boolean; name?: string }) {
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
  return <div className="cart-controls">{quantityPicker && stock > 0 ? <label>Quantity<input type="number" min={1} max={Math.min(stock, 999)} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(stock, 999, Number(event.target.value) || 1)))} /></label> : null}
    <button type="button" aria-label={name ? stock <= 0 ? `Out of stock: ${name}` : pending ? `Checking… ${name}` : `Add to cart: ${name}` : undefined} disabled={pending || stock <= 0} onClick={add}>{stock <= 0 ? 'Out of stock' : pending ? 'Checking…' : <><Icon name="bag" />Add to cart</>}</button><p role="status" className="status">{message}</p>{message === 'Added to cart.' ? <Link className="view-cart-link" href="/cart">View cart</Link> : null}</div>;
}
