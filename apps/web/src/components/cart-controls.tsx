"use client";
import { useState } from 'react';
import { checkAddition } from '../app/cart/actions';
import { saveCart, storedCart } from '../lib/catalog/browser-cart';
export function AddToCart({ id, stock, quantityPicker = false }: { id: string; stock: number; quantityPicker?: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function add() {
    setPending(true); setMessage('');
    try {
      const lines = storedCart();
      const previous = lines.find(line => line.id === id)?.quantity ?? 0;
      const error = await checkAddition(id, previous + quantity);
      if (error) { setMessage(error); return; }
      // A different tab may have changed storage while the stock request was in flight.
      if (JSON.stringify(lines) !== JSON.stringify(storedCart())) { setMessage('Your cart changed. Please try again.'); return; }
      saveCart([...lines.filter(line => line.id !== id), { id, quantity: previous + quantity }]);
      setMessage('Added to cart.');
    } catch { setMessage('Unable to save your cart in this browser.'); }
    finally { setPending(false); }
  }
  return <div>{quantityPicker && stock > 0 ? <label>Quantity<input type="number" min={1} max={Math.min(stock, 999)} value={quantity} onChange={event => setQuantity(Math.max(1, Math.min(stock, 999, Number(event.target.value) || 1)))} /></label> : null}
    {stock > 0 ? <button type="button" disabled={pending} onClick={add}>{pending ? 'Checking…' : 'Add to cart'}</button> : <p>Temporarily out of stock</p>}<p role="status" className="status">{message}</p></div>;
}
