'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { checkoutInputSchema, customerInputSchema, checkoutDtoSchema, quoteDtoSchema, type CheckoutInput, type Quote } from '@almina/contracts';
import { z } from 'zod';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { recordCommerceEvent } from '../lib/telemetry/browser';

const pendingKey = 'almina.checkout.pending.v1';
const emirates = ['Ras al-Khaimah', 'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm al-Quwain', 'Fujairah'];
const messages: Record<string, string> = {
  PRICE_CHANGED: 'Prices or delivery have changed. Review a new total before ordering.',
  INSUFFICIENT_STOCK: 'Some items no longer have enough stock. Update your cart before ordering.',
  PRODUCT_UNAVAILABLE: 'An item is no longer available. Update your cart before ordering.',
  MINIMUM_ORDER: 'Your basket is below the minimum order amount. Add items and try again.',
  COMMERCE_UNAVAILABLE: 'Ordering is currently unavailable. Your cart is saved.',
  INVALID_REQUEST: 'Check your contact details and address.',
  RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
};
const formatted = (minor: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(minor / 100);
const acknowledgment = z.object({ quote: quoteDtoSchema, quoteHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
type Reviewed = z.infer<typeof acknowledgment> & { customer: CheckoutInput['customer']; items: CheckoutInput['items'] };
class CheckoutFailure extends Error {
  constructor(readonly code: string, readonly definite: boolean) { super(code); }
}
async function send(path: string, body: unknown) {
  let response: Response;
  try { response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
    credentials: 'same-origin', cache: 'no-store', body: JSON.stringify(body), signal: AbortSignal.timeout(20000) }); }
  catch { throw new CheckoutFailure('SERVICE_UNAVAILABLE', false); }
  let data: unknown;
  try { data = await response.json(); } catch { throw new CheckoutFailure('SERVICE_UNAVAILABLE', false); }
  if (!response.ok) {
    const code = z.object({ error: z.object({ code: z.string() }) }).safeParse(data);
    throw new CheckoutFailure(code.success ? code.data.error.code : 'SERVICE_UNAVAILABLE', response.status >= 400 && response.status < 500);
  }
  return data;
}
export function CheckoutForm() {
  const form = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [attempt, setAttempt] = useState<CheckoutInput | null>(null);
  const [result, setResult] = useState<z.infer<typeof checkoutDtoSchema> | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = sessionStorage.getItem(pendingKey);
        if (raw) {
          const value = checkoutInputSchema.parse(JSON.parse(raw));
          if (!value.acceptedQuoteHash) throw new Error('Missing acknowledgment');
          setAttempt(value);
        }
      } catch { setError('Unable to recover your pending order. Contact the pharmacy before placing another order.'); }
      setReady(true);
    });
    return () => { active = false; };
  }, []);
  function intent() {
    if (!form.current) throw new Error('Form unavailable');
    const customer = customerInputSchema.parse(Object.fromEntries(new FormData(form.current)));
    const items = storedCart().map(line => ({ productId: line.id, quantity: line.quantity }));
    if (!items.length) throw new Error('Your cart is empty. Add products before ordering.');
    return { customer, items };
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || attempt) return;
    busy.current = true; setWorking(true); setError(''); setReviewed(null);
    try {
      const input = intent();
      const response = acknowledgment.parse(await send('/api/checkout/quote', input));
      setReviewed({ ...response, ...input });
      recordCommerceEvent('checkout_reviewed');
    } catch (failure) {
      recordCommerceEvent('checkout_failed');
      setError(failure instanceof CheckoutFailure ? messages[failure.code] ?? 'Unable to review your order. Please try again.'
        : failure instanceof Error && failure.message.startsWith('Your cart') ? failure.message : 'Check your contact details and address.');
    } finally { busy.current = false; setWorking(false); }
  }
  async function place() {
    if (busy.current || (!reviewed && !attempt)) return;
    busy.current = true; setWorking(true); setError('');
    let submitted = false;
    try {
      let input = attempt;
      if (!input) {
        const current = intent();
        if (JSON.stringify(current) !== JSON.stringify({ customer: reviewed!.customer, items: reviewed!.items })) {
          setReviewed(null); throw new Error('Your cart or details changed. Review your order again.');
        }
        input = { ...current, acceptedQuoteHash: reviewed!.quoteHash, idempotencyKey: crypto.randomUUID() };
        // Persist exact intent before any submission. Failed storage means no order request.
        sessionStorage.setItem(pendingKey, JSON.stringify(input));
        setAttempt(input);
      }
      submitted = true;
      const committed = checkoutDtoSchema.parse(await send('/api/checkout', input));
      setResult(committed); setAttempt(null); setReviewed(null);
      recordCommerceEvent('checkout_confirmed');
      try { sessionStorage.removeItem(pendingKey); } catch { /* A replay is safe if storage fails. */ }
      try {
        const purchased = new Map(input.items.map(item => [item.productId, item.quantity]));
        saveCart(storedCart().map(line => ({ id: line.id, quantity: Math.max(0, line.quantity - (purchased.get(line.id) ?? 0)) })).filter(line => line.quantity > 0));
      } catch { /* Committed order remains successful; cart storage cannot undo it. */ }
    } catch (failure) {
      recordCommerceEvent('checkout_failed');
      if (failure instanceof CheckoutFailure && failure.definite) {
        try { sessionStorage.removeItem(pendingKey); } catch { /* Same key still cannot duplicate a committed order. */ }
        setAttempt(null); setReviewed(null);
        setError(messages[failure.code] ?? 'The order was rejected. Review your details before trying again.');
      } else setError(submitted ? 'The result is not confirmed. Retry this same order to check its status. Do not create a new order.'
        : failure instanceof Error && failure.message.startsWith('Your cart') ? failure.message : 'Unable to save this order attempt. No order was submitted.');
    } finally { busy.current = false; setWorking(false); }
  }
  if (!ready) return <p role="status">Loading checkout…</p>;
  if (result) return <section className="rounded-xl border border-brand bg-surface p-6" aria-labelledby="order-confirmation"><h2 className="text-xl" id="order-confirmation">Order received</h2>
    <p role="status">Your order number is <strong>{result.orderId}</strong>.</p><p>Total: <strong>{formatted(result.totals.totalMinor)}</strong>.</p>
    <p>Payment is due on delivery. The pharmacy will contact you about fulfillment.</p><Link className="button" href="/products">Continue shopping</Link></section>;
  const total: Quote | undefined = reviewed?.quote;
  return <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8" aria-label="Place an order">
    <form ref={form} onSubmit={review} onChange={() => { if (!attempt) setReviewed(null); }} className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 className="mb-3 text-xl">Contact and delivery</h2>
      <p className="text-sm text-muted">Enter your details, then review the total before placing your order. Fields marked optional may be left blank.</p>
      <fieldset disabled={working || !!attempt} className="m-0 grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2">
        <legend className="sr-only">Contact and delivery details</legend>
        <label>Name<input name="name" required maxLength={200} autoComplete="name" /></label>
        <label>Mobile number<input name="mobile" required type="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" maxLength={16} /></label>
        <label>Email<input name="email" required type="email" maxLength={254} autoComplete="email" /></label>
        <label>Emirate<select name="emirate" defaultValue="Ras al-Khaimah" required autoComplete="address-level1">{emirates.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>City / area<input name="city" required maxLength={200} autoComplete="address-level2" /></label>
        <label>Street address<input name="address" required maxLength={1000} autoComplete="street-address" /></label>
        <label>Building (optional)<input name="buildingname" maxLength={200} /></label>
        <label>Flat / unit (optional)<input name="flatno" maxLength={200} /></label>
        <label>Delivery note (optional)<input name="note" maxLength={1000} /></label>
        <label>Payment on delivery<select name="payment" defaultValue="cash"><option value="cash">Cash on delivery</option><option value="card">Card on delivery</option></select></label>
      </fieldset>
      {!attempt ? <button type="submit" className="mt-6 w-full sm:w-auto" disabled={working || !!error && error.startsWith('Unable to recover')}>{working ? 'Checking…' : 'Review order'}</button> : <p className="mt-6 text-sm" role="status">A previous submission is awaiting confirmation. Retrying uses its saved details and order key.</p>}
    </form>
    <aside className="min-w-0 rounded-xl border border-border bg-subtle p-6 lg:sticky lg:top-6" aria-labelledby="checkout-summary">
      <h2 className="mb-4 text-xl" id="checkout-summary">Order summary</h2>
      {error ? <p className="rounded-lg border border-warning bg-warning-surface p-3 text-sm text-warning" role="alert">{error}</p> : null}
      {total ? <><ul className="m-0 list-none p-0">{total.lines.map(line => <li className="border-b border-border py-3 first:pt-0 wrap-anywhere" key={line.productId}>{line.name} × {line.quantity}<strong className="block tabular-nums">{formatted(line.lineTotalMinor)}</strong></li>)}</ul>
        <dl className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm tabular-nums"><dt>Items</dt><dd className="m-0 text-right">{formatted(total.subtotalMinor)}</dd><dt>Delivery</dt><dd className="m-0 text-right">{formatted(total.deliveryFeeMinor)}</dd>
          <dt>VAT {total.vatMode === 'inclusive' ? '(included)' : ''}</dt><dd className="m-0 text-right">{formatted(total.taxMinor)}</dd><dt className="font-bold">Total</dt><dd className="m-0 text-right font-bold">{formatted(total.totalMinor)}</dd></dl></> : <p>Review your details to see current prices, delivery and the final total.</p>}
      {reviewed || attempt ? <button type="button" className="mt-4 w-full" disabled={working} onClick={() => { void place(); }}>{working ? 'Confirming…' : attempt ? 'Retry pending order' : `Place order — ${formatted(total!.totalMinor)}`}</button> : null}
      <Link className="mt-4 flex min-h-11 items-center justify-center text-sm" href="/cart">Return to cart</Link>
    </aside>
  </section>;
}
