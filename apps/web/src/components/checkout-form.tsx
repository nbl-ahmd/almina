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
import { t, tf, type Locale } from '../lib/i18n';

const pendingKey = 'almina.checkout.pending.v1';
const emirates = deliveryEmirates;
function errorMessages(locale: Locale): Record<string, string> {
  return {
    VOUCHER_UNAVAILABLE: t(locale, 'checkoutErrorVoucherUnavailable'),
    VOUCHER_MINIMUM: t(locale, 'checkoutErrorVoucherMinimum'),
    PRICE_CHANGED: t(locale, 'checkoutErrorPriceChanged'),
    INSUFFICIENT_STOCK: t(locale, 'checkoutErrorInsufficientStock'),
    PRODUCT_UNAVAILABLE: t(locale, 'checkoutErrorProductUnavailable'),
    MINIMUM_ORDER: t(locale, 'checkoutErrorMinimumOrder'),
    COMMERCE_UNAVAILABLE: t(locale, 'checkoutErrorCommerceUnavailable'),
    INVALID_REQUEST: t(locale, 'checkoutErrorInvalidRequest'),
    UNAUTHORIZED: t(locale, 'checkoutErrorUnauthorized'),
    RATE_LIMITED: t(locale, 'checkoutErrorRateLimited'),
  };
}
const inputMessages = (locale: Locale): Record<InputCode, string> => ({
  CART_EMPTY: t(locale, 'checkoutErrorCartEmpty'),
  CART_CHANGED: t(locale, 'checkoutErrorCartChanged'),
});
const currencyFormat = (locale: Locale) => new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { style: 'currency', currency: 'AED' });
const acknowledgment = z.object({ quote: quoteDtoSchema, quoteHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
type Reviewed = z.infer<typeof acknowledgment> & { customer: CheckoutInput['customer']; items: CheckoutInput['items'];voucherCode?:string };
type SavedDeliveryAddress={id:string;label:string;name:string;mobile:string;emirate:string;city:string;address:string;buildingname:string;flatno:string;note:string;maplink:string;isDefault:boolean};
type InputCode = 'CART_EMPTY' | 'CART_CHANGED';
class CheckoutFailure extends Error {
  constructor(readonly code: string, readonly definite: boolean) { super(code); }
}
class InputError extends Error {
  constructor(readonly code: InputCode) { super(code); }
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
export function CheckoutForm({ locale = 'en' }: { locale?: Locale }) {
  const formatted = (minor: number) => currencyFormat(locale).format(minor / 100);
  const errors = errorMessages(locale);
  const inputs = inputMessages(locale);
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const locationRequest = useRef(0);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locating, setLocating] = useState(false);
  const [maplink, setMaplink] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [delivery, setDelivery] = useState({ address: '', emirate: 'Ras al-Khaimah', city: '' });
  const [voucherCode,setVoucherCode]=useState('');
  const [savedAddresses,setSavedAddresses]=useState<SavedDeliveryAddress[]>([]);
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
      } catch { setError(t(locale, 'checkoutRecoverError')); }
      setReady(true);
    });
    return () => {
      active = false;
      requestState.current++;
      if (timerState.current) clearTimeout(timerState.current);
    };
  // One-shot recovery: re-running on a language switch would reset typed delivery details.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{let active=true;void fetch('/api/customer/addresses',{cache:'no-store'}).then(async response=>{if(!response.ok)return;const payload=await response.json() as {data?:SavedDeliveryAddress[]};if(active&&Array.isArray(payload.data))setSavedAddresses(payload.data);}).catch(()=>{});return()=>{active=false;}},[]);
  function applySavedAddress(id:string){const saved=savedAddresses.find(item=>item.id===id);if(!saved||!form.current)return;setDelivery({address:saved.address,emirate:saved.emirate,city:saved.city});setMaplink(saved.maplink);setLocationMessage(t(locale, 'checkoutSavedApplied'));for(const [name,value] of Object.entries({name:saved.name,mobile:saved.mobile,buildingname:saved.buildingname,flatno:saved.flatno,note:saved.note})){const field=form.current.elements.namedItem(name);if(field instanceof HTMLInputElement)field.value=value;}setReviewed(null);}
  function locate() {
    if (busy.current || attempt || locating) return;
    setReviewed(null);
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocationMessage(t(locale, 'checkoutLocationUnavailableBrowser'));
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    setLocationMessage(t(locale, 'checkoutLocationWaiting'));
    function finish(message: string) {
      if (request !== locationRequest.current) return false;
      locationRequest.current++;
      if (locationTimer.current) clearTimeout(locationTimer.current);
      setLocating(false);
      setLocationMessage(message);
      return true;
    }
    // Some browsers do not count permission prompts towards the GPS timeout.
    locationTimer.current = setTimeout(() => finish(t(locale, 'checkoutLocationTimeout')), 20000);
    try {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          finish(t(locale, 'checkoutLocationNotFound'));
          return;
        }
        if (request !== locationRequest.current) return;
        setLocationMessage(t(locale, 'checkoutLocationFindingAddress'));
        void send('/api/checkout/location', { latitude, longitude }).then(raw => {
          const result = reverseLocationDtoSchema.parse(raw);
          const lowAccuracy = Number.isFinite(accuracy) && accuracy > 100;
          if (!finish(t(locale, lowAccuracy ? 'checkoutLocationFilledLowAccuracy' : 'checkoutLocationFilled'))) return;
          setDelivery({ address: result.address, emirate: result.emirate, city: result.city });
          setMaplink(result.maplink);
        }).catch(failure => finish(failure instanceof CheckoutFailure && failure.code === 'LOCATION_OUTSIDE_UAE'
          ? t(locale, 'checkoutLocationOutsideUae')
          : failure instanceof CheckoutFailure && failure.code === 'RATE_LIMITED'
            ? t(locale, 'checkoutLocationBusy')
            : t(locale, 'checkoutLocationIncomplete')));
      }, failure => {
        finish(failure.code === 1 ? t(locale, 'checkoutLocationDenied')
          : failure.code === 3 ? t(locale, 'checkoutLocationTimeout')
          : t(locale, 'checkoutLocationNotFound'));
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch { finish(t(locale, 'checkoutLocationUnavailable')); }
  }
  function editDelivery(field: keyof typeof delivery, value: string) {
    setDelivery(previous => ({ ...previous, [field]: value }));
    if (maplink) { setMaplink(''); setLocationMessage(t(locale, 'checkoutAddressChanged')); }
  }
  function intent() {
    if (!form.current) throw new Error('Form unavailable');
    const customer = customerInputSchema.parse(Object.fromEntries(new FormData(form.current)));
    const items = storedCart().map(line => ({ productId: line.id, quantity: line.quantity }));
    if (!items.length) throw new InputError('CART_EMPTY');
    return { customer, items, ...(voucherCode.trim()?{voucherCode:voucherCode.trim().toUpperCase()}:{} ) };
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
      setError(failure instanceof CheckoutFailure ? errors[failure.code] ?? t(locale, 'checkoutErrorReviewGeneric')
        : failure instanceof InputError ? inputs[failure.code] : t(locale, 'checkoutErrorCheckDetails'));
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
        if (JSON.stringify(current) !== JSON.stringify({ customer: reviewed!.customer, items: reviewed!.items, ...(reviewed!.voucherCode?{voucherCode:reviewed!.voucherCode}:{} ) })) {
          setReviewed(null); throw new InputError('CART_CHANGED');
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
        setError(errors[failure.code] ?? t(locale, 'checkoutErrorRejected'));
      } else setError(submitted ? t(locale, 'checkoutErrorUncertain')
        : failure instanceof InputError ? inputs[failure.code] : t(locale, 'checkoutErrorNotSaved'));
    } finally { busy.current = false; setWorking(false); }
  }
  if (!ready) return <p role="status">{t(locale, 'checkoutLoading')}</p>;
  if (result) return <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="order-confirmation">
    <div className="border-b border-border bg-subtle px-6 py-8 text-center sm:px-10"><span className="mx-auto mb-4 flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-teal"><Icon name="check" /></span><h2 ref={confirmation} tabIndex={-1} className="mb-2 text-2xl outline-none sm:text-3xl" id="order-confirmation">{t(locale, 'checkoutOrderReceived')}</h2><p className="m-0 text-sm text-ocean">{t(locale, 'checkoutThankYou')}</p></div>
    <div className="p-5 sm:p-8"><div className="grid gap-4 border-b border-border pb-5 sm:grid-cols-2"><div><p className="mb-1 text-xs text-muted">{t(locale, 'checkoutOrderNumber')}</p><p role="status" className="m-0 text-xl font-bold">{result.orderId}</p></div><div className="sm:text-right"><p className="mb-1 text-xs text-muted">{t(locale, 'checkoutOrderTotal')}</p><p className="m-0 text-xl font-bold tabular-nums">{formatted(result.totals.totalMinor)}</p></div></div><h3 className="mt-6 mb-2 text-base">{t(locale, 'checkoutNextTitle')}</h3><p className="text-sm leading-relaxed text-ocean">{t(locale, 'checkoutNextBody')}</p><div className="mt-6 flex flex-wrap gap-3"><Link className="button min-h-11 flex-1 text-sm" href="/products">{t(locale, 'checkoutContinueShopping')} <Icon name="arrow" /></Link><Link className="button button-secondary min-h-11 flex-1 text-sm text-ocean" href="/contact">{t(locale, 'checkoutContactPharmacyShort')}</Link></div></div></section>;
  const total: Quote | undefined = reviewed?.quote;
  return <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8" aria-label={t(locale, 'checkoutPlaceOrderAria')}>
    <form ref={form} onSubmit={review} onChange={() => { if (!attempt) setReviewed(null); }} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface [&_section]:mb-0 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-medium [&_input]:rounded-lg [&_input]:border-border [&_input]:bg-white [&_input]:px-3 [&_input]:font-normal [&_input:focus]:border-teal [&_input:focus]:bg-white [&_select]:rounded-lg [&_select]:border-border [&_select]:bg-white [&_select]:font-normal [&_select:focus]:border-teal">
      <div className="border-b border-border bg-[#f3f2fc] px-5 py-5 sm:px-7"><h2 className="mb-1 text-xl">{t(locale, 'checkoutContactDeliveryTitle')}</h2><p className="m-0 text-xs text-muted">{t(locale, 'checkoutContactDeliveryIntro')}</p></div>
      <fieldset disabled={working || !!attempt} className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{t(locale, 'checkoutLegend')}</legend>
        <section className="border-b border-border p-5 sm:p-7" aria-labelledby="contact-details-heading"><h3 id="contact-details-heading" className="mb-5 flex items-center gap-3 text-base"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-white">1</span>{t(locale, 'checkoutContactDetails')}</h3><div className="grid gap-4 sm:grid-cols-2">
          <label>{t(locale, 'checkoutName')}<input name="name" required maxLength={200} autoComplete="name" placeholder={t(locale, 'checkoutNamePlaceholder')} /></label>
          <label>{t(locale, 'checkoutMobile')}<input name="mobile" required type="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" maxLength={16} placeholder={t(locale, 'checkoutMobilePlaceholder')} /></label>
          <label className="sm:col-span-2">{t(locale, 'checkoutEmail')}<input name="email" required type="email" maxLength={254} autoComplete="email" placeholder={t(locale, 'checkoutEmailPlaceholder')} /></label>
        </div></section>
        <section className="border-b border-border p-5 sm:p-7" aria-labelledby="delivery-details-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 id="delivery-details-heading" className="m-0 flex items-center gap-3 text-base"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-white">2</span>{t(locale, 'checkoutDeliveryAddress')}</h3><button type="button" className="min-h-11 rounded-lg border-border bg-subtle px-3 py-2 text-xs text-teal hover:bg-accent hover:text-teal" disabled={locating} onClick={locate}><Icon name="pin" />{locating ? t(locale, 'checkoutLocating') : t(locale, 'checkoutUseLocation')}</button></div>
        <input type="hidden" name="maplink" value={maplink} />
        {locationMessage ? <p role="status" className="mb-4 rounded-lg bg-subtle p-3 text-xs leading-relaxed text-ocean">{locationMessage}</p> : null}
        {maplink ? <div className="mb-4 rounded-lg border border-border bg-page p-3"><div className="flex flex-wrap items-center gap-3"><a href={maplink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-semibold text-teal" aria-label={t(locale, 'checkoutCheckPinAria')}><Icon name="pin" />{t(locale, 'checkoutViewPin')}</a><button type="button" disabled={locating} className="min-h-9 border-transparent bg-transparent px-2 py-1 text-xs text-ocean hover:bg-subtle hover:text-ink" onClick={() => { setMaplink(''); setLocationMessage(t(locale, 'checkoutPinRemoved')); setReviewed(null); }}>{t(locale, 'checkoutRemovePin')}</button></div><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted">{t(locale, 'checkoutOsmCredit')}</a></div> : null}
        {savedAddresses.length?<label className="mb-4 grid gap-1.5 text-sm font-medium">{t(locale, 'checkoutSavedAddress')}<select defaultValue="" onChange={event=>applySavedAddress(event.target.value)}><option value="">{t(locale, 'checkoutChooseAddress')}</option>{savedAddresses.map(address=><option key={address.id} value={address.id}>{address.label}{address.isDefault?` · ${t(locale, 'checkoutDefault')}`:''} — {address.city}</option>)}</select></label>:null}
        <div className="grid gap-4 sm:grid-cols-2"><label>{t(locale, 'checkoutEmirate')}<select name="emirate" value={delivery.emirate} disabled={locating} onChange={event => editDelivery('emirate', event.target.value)} required autoComplete="address-level1">{emirates.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>{t(locale, 'checkoutCity')}<input name="city" value={delivery.city} disabled={locating} onChange={event => editDelivery('city', event.target.value)} required maxLength={200} autoComplete="address-level2" placeholder={t(locale, 'checkoutCityPlaceholder')} /></label>
          <label className="sm:col-span-2">{t(locale, 'checkoutStreet')}<input name="address" value={delivery.address} disabled={locating} onChange={event => editDelivery('address', event.target.value)} required maxLength={1000} autoComplete="street-address" placeholder={t(locale, 'checkoutStreetPlaceholder')} /></label>
          <label>{t(locale, 'checkoutBuilding')}<input name="buildingname" maxLength={200} autoComplete="address-line2" placeholder={t(locale, 'checkoutBuildingPlaceholder')} /></label>
          <label>{t(locale, 'checkoutFlat')}<input name="flatno" maxLength={200} placeholder={t(locale, 'checkoutFlatPlaceholder')} /></label>
          <label className="sm:col-span-2">{t(locale, 'checkoutNote')}<input name="note" maxLength={1000} placeholder={t(locale, 'checkoutNotePlaceholder')} /></label>
        </div></section>
        <section className="p-5 sm:p-7" aria-labelledby="payment-details-heading"><h3 id="payment-details-heading" className="mb-4 flex items-center gap-3 text-base"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-white">3</span>{t(locale, 'checkoutPayment')}</h3><label>{t(locale, 'checkoutPaymentOnDelivery')}<select name="payment" defaultValue="cash"><option value="cash">{t(locale, 'checkoutCash')}</option><option value="card">{t(locale, 'checkoutCard')}</option></select></label><p className="mt-2 mb-0 text-xs text-muted">{t(locale, 'checkoutPayWhenArrives')}</p><label className="mt-5">{t(locale, 'checkoutVoucher')}<input value={voucherCode} maxLength={27} placeholder="AM-…" onChange={event=>setVoucherCode(event.target.value.toUpperCase())} autoComplete="off" /><span className="text-xs font-normal text-muted">{t(locale, 'checkoutVoucherHint')}</span></label></section>
      </fieldset>
      <div className="border-t border-border bg-page px-5 py-5 sm:px-7">{!attempt ? <button type="submit" className="min-h-12 w-full rounded-xl text-sm" disabled={working || locating || !!error && error === t(locale, 'checkoutRecoverError')}>{working ? t(locale, 'checkoutChecking') : t(locale, 'checkoutReview')}<Icon name="arrow" /></button> : <p className="m-0 text-sm" role="status">{t(locale, 'checkoutPendingNotice')}</p>}<p className="mt-3 mb-0 text-center text-xs text-muted">{t(locale, 'checkoutFinalTotalNote')}</p></div>
    </form>
    <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface lg:sticky lg:top-6" aria-labelledby="checkout-summary">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="m-0 text-xl" id="checkout-summary">{t(locale, 'checkoutOrderSummary')}</h2><Icon name="bag" /></div><div className="p-5">
      {error ? <p className="rounded-lg border border-warning bg-warning-surface p-3 text-sm text-warning" role="alert">{error}</p> : null}
      {total ? <><ul className="m-0 list-none p-0">{total.lines.map(line => <li className="flex items-start justify-between gap-3 border-b border-border py-3 text-sm first:pt-0 wrap-anywhere" key={line.productId}><span>{line.name}{line.variantLabel?<span className="mt-1 block text-xs text-ocean">{line.variantLabel}</span>:null}<span className="mt-1 block text-xs text-muted">{tf(locale, 'checkoutQty', { count: line.quantity })}</span></span><strong className="shrink-0 tabular-nums">{formatted(line.lineTotalMinor)}</strong></li>)}</ul>
        <dl className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm tabular-nums"><dt>{t(locale, 'checkoutItems')}</dt><dd className="m-0 text-right">{formatted(total.subtotalMinor)}</dd>{total.voucher?<><dt>{t(locale, 'checkoutRewardVoucher')}</dt><dd className="m-0 text-right text-teal">−{formatted(total.voucher.discountMinor)}</dd></>:null}<dt>{t(locale, 'checkoutDelivery')}</dt><dd className="m-0 text-right">{formatted(total.deliveryFeeMinor)}</dd><dt>{total.vatMode === 'inclusive' ? t(locale, 'checkoutVatIncluded') : t(locale, 'checkoutVat')}</dt><dd className="m-0 text-right">{formatted(total.taxMinor)}</dd><dt className="border-t border-border pt-4 text-lg font-bold">{t(locale, 'checkoutTotal')}</dt><dd className="m-0 border-t border-border pt-4 text-right text-lg font-bold">{formatted(total.totalMinor)}</dd></dl></> : <div className="rounded-xl bg-page p-4"><p className="mb-2 text-sm font-semibold">{t(locale, 'checkoutReadyTitle')}</p><p className="m-0 text-xs leading-relaxed text-ocean">{t(locale, 'checkoutReadyBody')}</p></div>}
      {reviewed || attempt ? <button type="button" className="mt-5 min-h-12 w-full rounded-xl text-sm" disabled={working} onClick={() => { void place(); }}>{working ? t(locale, 'checkoutConfirming') : attempt ? t(locale, 'checkoutRetryPending') : tf(locale, 'checkoutPlaceOrder', { total: formatted(total!.totalMinor) })}</button> : null}
      <Link className="mt-3 flex min-h-11 items-center justify-center text-xs text-ocean hover:text-brand" href="/cart">{t(locale, 'checkoutReturnToCart')}</Link><div className="mt-3 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-ocean"><Icon name="phone" /><span>{t(locale, 'checkoutHelpPrefix')} <Link className="font-semibold text-teal" href="/contact">{t(locale, 'checkoutHelpLink')}</Link>.</span></div></div>
    </aside>
  </section>;
}
