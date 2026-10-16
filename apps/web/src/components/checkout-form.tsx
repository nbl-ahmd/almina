'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { checkoutInputSchema, customerInputSchema, checkoutDtoSchema, quoteDtoSchema, type CheckoutInput, type Quote } from '@almina/contracts';
import { Icon } from './icon';
import { savedArea } from '../lib/location/browser';
import { z } from 'zod';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { deliveryEmirates, reverseLocationDtoSchema } from '@almina/contracts';

const pendingKey = 'almina.checkout.pending.v1';
const emirates = deliveryEmirates;
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
  const confirmation = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const locationRequest = useRef(0);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locating, setLocating] = useState(false);
  const [maplink, setMaplink] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [delivery, setDelivery] = useState({ address: '', emirate: 'Ras al-Khaimah', city: '' });
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [attempt, setAttempt] = useState<CheckoutInput | null>(null);
  const [result, setResult] = useState<z.infer<typeof checkoutDtoSchema> | null>(null);
  useEffect(() => { if (result) confirmation.current?.focus(); }, [result]);
  useEffect(() => {
    let active = true;
    const requestState = locationRequest;
    const timerState = locationTimer;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const area = savedArea();
        if (area) setDelivery(previous => ({ ...previous, city: area.city, emirate: area.emirate }));
        const raw = sessionStorage.getItem(pendingKey);
        if (raw) {
          const value = checkoutInputSchema.parse(JSON.parse(raw));
          if (!value.acceptedQuoteHash) throw new Error('Missing acknowledgment');
          setAttempt(value);
        }
      } catch { setError('Unable to recover your pending order. Contact the pharmacy before placing another order.'); }
      setReady(true);
    });
    return () => {
      active = false;
      requestState.current++;
      if (timerState.current) clearTimeout(timerState.current);
    };
  }, []);
  function locate() {
    if (busy.current || attempt || locating) return;
    setReviewed(null);
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationMessage('Location is unavailable in this browser. Please enter your address manually.');
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    setLocationMessage('Waiting for location permission…');
    function finish(message: string) {
      if (request !== locationRequest.current) return false;
      locationRequest.current++;
      if (locationTimer.current) clearTimeout(locationTimer.current);
      setLocating(false);
      setLocationMessage(message);
      return true;
    }
    // Some browsers do not count permission prompts towards the GPS timeout.
    locationTimer.current = setTimeout(() => finish('Location timed out. Try again or enter your address manually.'), 20000);
    try {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          finish('Unable to find your location. Please enter your address manually.');
          return;
        }
        if (request !== locationRequest.current) return;
        setLocationMessage('Finding your delivery address…');
        void send('/api/checkout/location', { latitude, longitude }).then(raw => {
          const result = reverseLocationDtoSchema.parse(raw);
          if (!finish(`Delivery address filled.${Number.isFinite(accuracy) && accuracy > 100 ? ' GPS accuracy is low; check the pin before ordering.' : ''} Check the address and add your building and flat details.`)) return;
          setDelivery({ address: result.address, emirate: result.emirate, city: result.city });
          setMaplink(result.maplink);
        }).catch(failure => finish(failure instanceof CheckoutFailure && failure.code === 'LOCATION_OUTSIDE_UAE'
          ? 'We deliver only within the UAE. Please enter a UAE delivery address.'
          : failure instanceof CheckoutFailure && failure.code === 'RATE_LIMITED'
            ? 'Address lookup is busy. Please try again shortly or enter your address manually.'
            : 'Unable to find a complete address. Your details are unchanged; try again or enter your address manually.'));
      }, failure => {
        finish(failure.code === 1 ? 'Location permission was denied. You can still enter your address manually.'
          : failure.code === 3 ? 'Location timed out. Try again or enter your address manually.'
          : 'Unable to find your location. Please enter your address manually.');
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch { finish('Location is unavailable. Please enter your address manually.'); }
  }
  function editDelivery(field: keyof typeof delivery, value: string) {
    setDelivery(previous => ({ ...previous, [field]: value }));
    if (maplink) { setMaplink(''); setLocationMessage('Address changed. Use autolocation again if you want to attach a matching delivery pin.'); }
  }
  function intent() {
    if (!form.current) throw new Error('Form unavailable');
    const customer = customerInputSchema.parse(Object.fromEntries(new FormData(form.current)));
    const items = storedCart().map(line => ({ productId: line.id, quantity: line.quantity }));
    if (!items.length) throw new Error('Your cart is empty. Add products before ordering.');
    return { customer, items };
  }
  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || attempt || locating) return;
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
    if (busy.current || locating || (!reviewed && !attempt)) return;
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
  if (result) return <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" aria-labelledby="order-confirmation">
    <div className="border-b border-border bg-subtle px-6 py-8 text-center sm:px-10"><span className="mx-auto mb-4 flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-teal"><Icon name="check" /></span><h2 ref={confirmation} tabIndex={-1} className="mb-2 text-2xl outline-none sm:text-3xl" id="order-confirmation">Order received</h2><p className="m-0 text-sm text-ocean">Thank you for shopping with Al Mina Pharmacy.</p></div>
    <div className="p-5 sm:p-8"><div className="grid gap-4 border-b border-border pb-5 sm:grid-cols-2"><div><p className="mb-1 text-xs text-muted">Order number</p><p role="status" className="m-0 text-xl font-bold">{result.orderId}</p></div><div className="sm:text-right"><p className="mb-1 text-xs text-muted">Order total</p><p className="m-0 text-xl font-bold tabular-nums">{formatted(result.totals.totalMinor)}</p></div></div><h3 className="mt-6 mb-2 text-base">What happens next?</h3><p className="text-sm leading-relaxed text-ocean">The pharmacy will contact you about fulfillment. Payment is due on delivery.</p><div className="mt-6 flex flex-wrap gap-3"><Link className="button min-h-11 flex-1 text-sm" href="/products">Continue shopping <Icon name="arrow" /></Link><Link className="button button-secondary min-h-11 flex-1 text-sm text-ocean" href="/contact">Contact pharmacy</Link></div></div></section>;
  const total: Quote | undefined = reviewed?.quote;
  return <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8" aria-label="Place an order">
    <form ref={form} onSubmit={review} onChange={() => { if (!attempt) setReviewed(null); }} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm [&_section]:mb-0 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-medium [&_input]:rounded-lg [&_input]:border-border [&_input]:bg-page [&_input]:px-3 [&_input]:font-normal [&_input:focus]:border-teal [&_input:focus]:bg-white [&_select]:rounded-lg [&_select]:border-border [&_select]:bg-page [&_select]:font-normal [&_select:focus]:border-teal">
      <div className="border-b border-border px-5 py-4 sm:px-7"><h2 className="mb-1 text-xl">Contact and delivery</h2><p className="m-0 text-xs text-muted">Add your details to review your order. Optional fields may be left blank.</p></div>
      <fieldset disabled={working || !!attempt} className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">Contact and delivery details</legend>
        <section className="border-b border-border p-5 sm:p-7" aria-labelledby="contact-details-heading"><h3 id="contact-details-heading" className="mb-5 flex items-center gap-3 text-base"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-xs text-ocean">1</span>Contact details</h3><div className="grid gap-4 sm:grid-cols-2">
          <label>Name<input name="name" required maxLength={200} autoComplete="name" placeholder="Full name" /></label>
          <label>Mobile number<input name="mobile" required type="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" maxLength={16} placeholder="05X XXX XXXX" /></label>
          <label className="sm:col-span-2">Email<input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
        </div></section>
        <section className="border-b border-border p-5 sm:p-7" aria-labelledby="delivery-details-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 id="delivery-details-heading" className="m-0 flex items-center gap-3 text-base"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-xs text-ocean">2</span>Delivery address</h3><button type="button" className="min-h-11 rounded-lg border-border bg-subtle px-3 py-2 text-xs text-teal hover:bg-accent hover:text-teal" disabled={locating} onClick={locate}><Icon name="pin" />{locating ? 'Finding location…' : 'Use my current location'}</button></div>
        <input type="hidden" name="maplink" value={maplink} />
        {locationMessage ? <p role="status" className="mb-4 rounded-lg bg-subtle p-3 text-xs leading-relaxed text-ocean">{locationMessage}</p> : null}
        {maplink ? <div className="mb-4 rounded-lg border border-border bg-page p-3"><div className="flex flex-wrap items-center gap-3"><a href={maplink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-semibold text-teal" aria-label="Check delivery pin in Google Maps"><Icon name="pin" />View delivery pin</a><button type="button" disabled={locating} className="min-h-9 border-transparent bg-transparent px-2 py-1 text-xs text-ocean hover:bg-subtle hover:text-ink" onClick={() => { setMaplink(''); setLocationMessage('Delivery pin removed.'); setReviewed(null); }}>Remove delivery pin</button></div><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted">Address data © OpenStreetMap contributors</a></div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><label>Emirate<select name="emirate" value={delivery.emirate} disabled={locating} onChange={event => editDelivery('emirate', event.target.value)} required autoComplete="address-level1">{emirates.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>City / area<input name="city" value={delivery.city} disabled={locating} onChange={event => editDelivery('city', event.target.value)} required maxLength={200} autoComplete="address-level2" placeholder="Area or neighbourhood" /></label>
          <label className="sm:col-span-2">Street address<input name="address" value={delivery.address} disabled={locating} onChange={event => editDelivery('address', event.target.value)} required maxLength={1000} autoComplete="street-address" placeholder="Street name and address" /></label>
          <label>Building (optional)<input name="buildingname" maxLength={200} autoComplete="address-line2" placeholder="Building or villa name" /></label>
          <label>Flat / unit (optional)<input name="flatno" maxLength={200} placeholder="Apartment or unit number" /></label>
          <label className="sm:col-span-2">Delivery note (optional)<input name="note" maxLength={1000} placeholder="Landmark or instructions for delivery" /></label>
        </div></section>
        <section className="p-5 sm:p-7" aria-labelledby="payment-details-heading"><h3 id="payment-details-heading" className="mb-4 flex items-center gap-3 text-base"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-xs text-ocean">3</span>Payment</h3><label>Payment on delivery<select name="payment" defaultValue="cash"><option value="cash">Cash on delivery</option><option value="card">Card on delivery</option></select></label><p className="mt-2 mb-0 text-xs text-muted">Pay when your order arrives.</p></section>
      </fieldset>
      <div className="border-t border-border bg-page px-5 py-5 sm:px-7">{!attempt ? <button type="submit" className="min-h-12 w-full rounded-xl text-sm" disabled={working || locating || !!error && error.startsWith('Unable to recover')}>{working ? 'Checking…' : 'Review order'}<Icon name="arrow" /></button> : <p className="m-0 text-sm" role="status">A previous submission is awaiting confirmation. Retrying uses its saved details and order key.</p>}<p className="mt-3 mb-0 text-center text-xs text-muted">You can check the final total before placing your order.</p></div>
    </form>
    <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:sticky lg:top-6" aria-labelledby="checkout-summary">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="m-0 text-xl" id="checkout-summary">Order summary</h2><Icon name="bag" /></div><div className="p-5">
      {error ? <p className="rounded-lg border border-warning bg-warning-surface p-3 text-sm text-warning" role="alert">{error}</p> : null}
      {total ? <><ul className="m-0 list-none p-0">{total.lines.map(line => <li className="flex items-start justify-between gap-3 border-b border-border py-3 text-sm first:pt-0 wrap-anywhere" key={line.productId}><span>{line.name}{line.variantLabel?<span className="mt-1 block text-xs text-ocean">{line.variantLabel}</span>:null}<span className="mt-1 block text-xs text-muted">Qty {line.quantity}</span></span><strong className="shrink-0 tabular-nums">{formatted(line.lineTotalMinor)}</strong></li>)}</ul>
        <dl className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm tabular-nums"><dt>Items</dt><dd className="m-0 text-right">{formatted(total.subtotalMinor)}</dd><dt>Delivery</dt><dd className="m-0 text-right">{formatted(total.deliveryFeeMinor)}</dd><dt>VAT {total.vatMode === 'inclusive' ? '(included)' : ''}</dt><dd className="m-0 text-right">{formatted(total.taxMinor)}</dd><dt className="border-t border-border pt-4 text-lg font-bold">Total</dt><dd className="m-0 border-t border-border pt-4 text-right text-lg font-bold">{formatted(total.totalMinor)}</dd></dl></> : <div className="rounded-xl bg-page p-4"><p className="mb-2 text-sm font-semibold">Ready when you are.</p><p className="m-0 text-xs leading-relaxed text-ocean">Add your delivery details and select Review order to see your items, delivery charge and final total.</p></div>}
      {reviewed || attempt ? <button type="button" className="mt-5 min-h-12 w-full rounded-xl text-sm" disabled={working} onClick={() => { void place(); }}>{working ? 'Confirming…' : attempt ? 'Retry pending order' : `Place order — ${formatted(total!.totalMinor)}`}</button> : null}
      <Link className="mt-3 flex min-h-11 items-center justify-center text-xs text-ocean hover:text-brand" href="/cart">Return to cart</Link><div className="mt-3 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-ocean"><Icon name="phone" /><span>Need help with your order? <Link className="font-semibold text-teal" href="/contact">Contact the pharmacy</Link>.</span></div></div>
    </aside>
  </section>;
}
