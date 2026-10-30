'use client';
import {searchAttributions,searchUsageAllowed,reportSearchEvent} from '../lib/search/attribution';
import { Input } from './ui/input';
import { GoogleCustomerReviews } from './google-customer-reviews';
import type { GoogleCommerceConfiguration, ReviewReceipt } from '../lib/google/commerce';
import { Button } from './ui/button';
import { CheckoutProgress, PaymentChoices, SecureCheckoutLabel, ConfirmationMark } from './checkout-ui';
import { ProductImage } from './product-image';
import { loadCart } from '../app/(storefront)/cart/actions';
import { detailErrors, detailError, detailFields, normalizeCheckoutMobile, type DetailField } from '../lib/checkout/validation';
import { ChevronDownIcon, LockClosedIcon, ArrowLeftIcon, PencilSquareIcon, TruckIcon } from '@heroicons/react/24/outline';
import { NativeSelect } from './ui/native-select';
import { Field, FieldLabel, FieldDescription } from './ui/field';

import { emirateLabel } from '../lib/i18n';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { checkoutInputSchema, customerInputSchema, checkoutDtoSchema, stripeCheckoutDtoSchema, quoteDtoSchema, type CheckoutInput, type Quote } from '@almina/contracts';
import { Icon } from './icon';
import { savedArea } from '../lib/location/browser';
import { z } from 'zod';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { deliveryEmirates, reverseLocationDtoSchema } from '@almina/contracts';
import { t, tf, itemCountText, type Locale } from '../lib/i18n';

const pendingKey = 'almina.checkout.pending.v1';
const emirates = deliveryEmirates;
function errorMessages(locale: Locale): Record<string, string> {
  return {
    ADDRESS_NOT_SERVICEABLE: t(locale, 'checkoutErrorAddressNotServiceable'),
    VOUCHER_UNAVAILABLE: t(locale, 'checkoutErrorVoucherUnavailable'),
    VOUCHER_MINIMUM: t(locale, 'checkoutErrorVoucherMinimum'),
    PRICE_CHANGED: t(locale, 'checkoutErrorPriceChanged'),
    INSUFFICIENT_STOCK: t(locale, 'checkoutErrorInsufficientStock'),
    PRODUCT_UNAVAILABLE: t(locale, 'checkoutErrorProductUnavailable'),
    MINIMUM_ORDER: t(locale, 'checkoutErrorMinimumOrder'),
    COMMERCE_UNAVAILABLE: t(locale, 'checkoutErrorCommerceUnavailable'),
    INVALID_REQUEST: t(locale, 'checkoutErrorInvalidRequest'),
    INVALID_TRANSITION: locale==='ar'?'انتهى هذا الدفع. راجع الطلب للبدء مجدداً.':'This checkout has ended. Review your order to start again.',
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
  try { response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1',...(searchUsageAllowed()?{'X-Search-Consent':'1'}:{}) },
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
export function CheckoutForm({ locale = 'en', stripeMode='off',stripeTestMode=true, googleReviews, nonce }: { locale?: Locale; stripeMode?:'off'|'test'|'live';stripeTestMode?:boolean; googleReviews?: GoogleCommerceConfiguration; nonce?: string | undefined }) {
  const stripeEnabled=stripeMode!=='off';
  const ar=locale==='ar';
  const [stage,setStage]=useState<'details'|'payment'>('details');
  const [fieldErrors,setFieldErrors]=useState<Partial<Record<DetailField,string>>>({});
  const [showErrorSummary,setShowErrorSummary]=useState(false);
  const [validationAttempt,setValidationAttempt]=useState(0);
  const [keyboardOpen,setKeyboardOpen]=useState(false);
  const errorSummary=useRef<HTMLDivElement>(null);
  const stepHeading=useRef<HTMLHeadingElement>(null);
  const [basket,setBasket]=useState<Awaited<ReturnType<typeof loadCart>>['items']>([]);
  const [basketReady,setBasketReady]=useState(false);
  const [basketCount,setBasketCount]=useState(0);
  const [basketError,setBasketError]=useState('');
  const [orderExpanded,setOrderExpanded]=useState(false);
  const formatted = (minor: number) => currencyFormat(locale).format(minor / 100);
  const errors = errorMessages(locale);
  const inputs = inputMessages(locale);
  const form = useRef<HTMLFormElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const locationRequest = useRef(0);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locating, setLocating] = useState(false);
  const [maplink, setMaplink] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [delivery, setDelivery] = useState({ address: '', emirate: 'Ras al-Khaimah', city: '' });
  const [reviewReceipt, setReviewReceipt] = useState<ReviewReceipt | null>(null);
  const [paymentMethod,setPaymentMethod]=useState('cash');
  const [voucherCode,setVoucherCode]=useState('');
  const [savedAddresses,setSavedAddresses]=useState<SavedDeliveryAddress[]>([]);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [attempt, setAttempt] = useState<CheckoutInput | null>(null);
  const [result, setResult] = useState<z.infer<typeof checkoutDtoSchema> | null>(null);
  useEffect(() => {
    if(validationAttempt)errorSummary.current?.focus();
  },[validationAttempt]);
  useEffect(()=>{function update(){const target=document.activeElement;setKeyboardOpen(!!(target instanceof HTMLInputElement&&target.type!=='radio'&&form.current?.contains(target)&&window.visualViewport&&window.visualViewport.height<window.innerHeight*.8));}window.visualViewport?.addEventListener('resize',update);document.addEventListener('focusin',update);document.addEventListener('focusout',update);return()=>{window.visualViewport?.removeEventListener('resize',update);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);};},[]);
  useEffect(()=>{
    function back(){setStage(window.location.hash==='#payment'?'payment':'details');}
    window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);
  },[]);
  useEffect(()=>{let active=true,revision=0;async function refresh(){const current=++revision;try{const lines=storedCart();if(active)setReviewed(previous=>previous&&JSON.stringify(previous.items)!==JSON.stringify(lines.map(line=>({productId:line.id,quantity:line.quantity})))?null:previous);if(active)setBasketCount(lines.reduce((sum,line)=>sum+line.quantity,0));const result=await loadCart(lines);if(active&&current===revision){setBasket(result.items);setBasketError(result.error??'');}}catch{if(active)setBasketError(t(locale,'cartReadError'));}finally{if(active&&current===revision)setBasketReady(true);}}void refresh();window.addEventListener('storage',refresh);window.addEventListener('almina-cart-change',refresh);return()=>{active=false;window.removeEventListener('storage',refresh);window.removeEventListener('almina-cart-change',refresh);};},[locale]);
  useEffect(() => {
    // The response lives below the form on phones. Reveal it without animating
    // the user's working fields or requiring them to hunt for the next action.
    const target = error ? feedback.current : null;
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [error, reviewed]);
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
          setAttempt(value); setStage('payment'); setPaymentMethod(value.customer.payment); setDelivery({address:value.customer.address,emirate:value.customer.emirate,city:value.customer.city});setMaplink(value.customer.maplink);
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
    const data=Object.fromEntries(new FormData(form.current));
    if(typeof data.mobile==='string')data.mobile=normalizeCheckoutMobile(data.mobile);
    const customer = customerInputSchema.parse(data);
    const items = storedCart().map(line => ({ productId: line.id, quantity: line.quantity }));
    if (!items.length) throw new InputError('CART_EMPTY');
    return { customer, items, ...(voucherCode.trim()?{voucherCode:voucherCode.trim().toUpperCase()}:{} ) };
  }
  function focusDetails(name?:string) {
    setStage('details');
    if(history.state?.alminaCheckoutStage==='payment')history.back();
    requestAnimationFrame(()=>{const target=name?form.current?.elements.namedItem(name):stepHeading.current;if(target instanceof HTMLElement){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}});
  }
  function values() { return Object.fromEntries(new FormData(form.current!)); }
  function validateDetails() {
    const next=detailErrors(values(),locale);setFieldErrors(next);setShowErrorSummary(Object.keys(next).length>0);
    if(Object.keys(next).length){setStage('details');setValidationAttempt(value=>value+1);return false;}return true;
  }
  function validateField(target: EventTarget) {
    if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement)||!detailFields.includes(target.name as DetailField))return;
    const name=target.name as DetailField, message=detailError(name,target.value,locale);
    setFieldErrors(previous=>{const next={...previous};if(message)next[name]=message;else delete next[name];return next;});
  }
  async function refreshQuote(paymentOverride?:string) {
    if(busy.current||attempt||locating)return false;
    if(!validateDetails())return false;
    busy.current=true;setWorking(true);setError('');setReviewed(null);
    try {
      const input=intent();
      if(paymentOverride){input.customer.payment=customerInputSchema.shape.payment.parse(paymentOverride);if(paymentOverride==='stripe')delete input.voucherCode;}
      const response=acknowledgment.parse(await send('/api/checkout/quote',input));
      // A cart modified in another tab cannot become a stale payable review.
      if(JSON.stringify(input.items)!==JSON.stringify(storedCart().map(line=>({productId:line.id,quantity:line.quantity}))))throw new InputError('CART_CHANGED');
      setReviewed({...response,...input});setOrderExpanded(true);setShowErrorSummary(false);
      recordCommerceEvent('checkout_reviewed');return true;
    }catch(failure){recordCommerceEvent('checkout_failed');setError(failure instanceof CheckoutFailure?errors[failure.code]??t(locale,'checkoutErrorReviewGeneric'):failure instanceof InputError?inputs[failure.code]:t(locale,'checkoutErrorCheckDetails'));return false;}
    finally{busy.current=false;setWorking(false);}
  }
  async function review(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(await refreshQuote()){
      if(stage==='details'&&window.matchMedia('(max-width: 1023px)').matches){history.pushState({...history.state,alminaCheckoutStage:'payment'},'','#payment');}
      setStage('payment');requestAnimationFrame(()=>{if(window.matchMedia('(max-width: 1023px)').matches){stepHeading.current?.focus({preventScroll:true});stepHeading.current?.scrollIntoView({block:'start',behavior:'instant'});}else summary.current?.focus({preventScroll:true});});
    }
  }
  function changePayment(value:string){
    setPaymentMethod(value);if(value==='stripe')setVoucherCode('');setReviewed(null);
    if(stage==='payment')queueMicrotask(()=>{void refreshQuote(value);});
  }
  function fieldState(name:DetailField){return {'aria-invalid':!!fieldErrors[name],'aria-describedby':fieldErrors[name]?`checkout-error-${name}`:undefined};}
  function fieldIssue(name:DetailField){return fieldErrors[name]?<p id={`checkout-error-${name}`} className="m-0 text-sm leading-5 text-sale">{fieldErrors[name]}</p>:null;}
  async function place() {
    if (busy.current || locating || (!reviewed && !attempt)) return;
    busy.current = true; setWorking(true); setError('');
    let submitted = false;
    let stripeSubmission=attempt?.customer.payment==='stripe';
    try {
      let input = attempt;
      if (!input) {
        const current = intent();
        if (JSON.stringify(current) !== JSON.stringify({ customer: reviewed!.customer, items: reviewed!.items, ...(reviewed!.voucherCode?{voucherCode:reviewed!.voucherCode}:{} ) })) {
          setReviewed(null); throw new InputError('CART_CHANGED');
        }
        const attribution=searchAttributions().filter(row=>current.items.some(item=>item.productId===row.productId));
        input = { ...current,...(attribution.length?{searchAttribution:attribution}:{}), acceptedQuoteHash: reviewed!.quoteHash, idempotencyKey: crypto.randomUUID() };
        // Persist exact intent before any submission. Failed storage means no order request.
        sessionStorage.setItem(pendingKey, JSON.stringify(input));
        setAttempt(input);
      }
      for(const row of input.searchAttribution??[])reportSearchEvent({searchId:row.searchId,event:'search_checkout',items:[{productId:row.productId,position:row.position}]});
      stripeSubmission=input.customer.payment==='stripe';
      submitted = true;
      if(input.customer.payment==='stripe'){
        const payment=stripeCheckoutDtoSchema.parse(await send('/api/checkout/stripe/start',input));
        window.location.assign(payment.checkoutUrl??'/checkout/stripe');
        return;
      }
      const committed = checkoutDtoSchema.parse(await send('/api/checkout', input));
      if (committed.createdAt && committed.status !== 'cancelled') setReviewReceipt({ orderId: committed.orderId, email: input.customer.email, createdAt: committed.createdAt, deliveryCountry: 'AE' });
      setResult(committed); setAttempt(null); setReviewed(null);
      recordCommerceEvent('checkout_confirmed');
      try { sessionStorage.removeItem(pendingKey); } catch { /* A replay is safe if storage fails. */ }
      try {
        const purchased = new Map(input.items.map(item => [item.productId, item.quantity]));
        saveCart(storedCart().map(line => ({ id: line.id, quantity: Math.max(0, line.quantity - (purchased.get(line.id) ?? 0)) })).filter(line => line.quantity > 0));
      } catch { /* Committed order remains successful; cart storage cannot undo it. */ }
    } catch (failure) {
      recordCommerceEvent('checkout_failed');
      if (failure instanceof CheckoutFailure && failure.definite && (!stripeSubmission||['PRICE_CHANGED','INSUFFICIENT_STOCK','PRODUCT_UNAVAILABLE','MINIMUM_ORDER','INVALID_TRANSITION','COMMERCE_UNAVAILABLE'].includes(failure.code))) {
        try { sessionStorage.removeItem(pendingKey); } catch { /* Same key still cannot duplicate a committed order. */ }
        setAttempt(null); setReviewed(null);
        setError(errors[failure.code] ?? t(locale, 'checkoutErrorRejected'));
      } else setError(submitted ? t(locale, 'checkoutErrorUncertain')
        : failure instanceof InputError ? inputs[failure.code] : t(locale, 'checkoutErrorNotSaved'));
    } finally { busy.current = false; setWorking(false); }
  }
  const stripeAttempt=(attempt??reviewed)?.customer.payment==='stripe';
  const stripeOptionVisible=stripeEnabled||attempt?.customer.payment==='stripe';
  const total:Quote|undefined=reviewed?.quote;
  const selectedPayment=attempt?.customer.payment??paymentMethod;
  const canPay=stage==='payment'&&!!(reviewed||attempt);
  const labels:Record<DetailField,string>={name:t(locale,'checkoutName'),mobile:t(locale,'checkoutMobile'),email:t(locale,'checkoutEmail'),emirate:t(locale,'checkoutEmirate'),city:t(locale,'checkoutCity'),address:t(locale,'checkoutStreet')};
  const fieldIds:Record<DetailField,string>={name:'checkout-form-field-1',mobile:'checkout-form-field-2',email:'checkout-form-field-3',emirate:'checkout-form-field-5',city:'checkout-form-field-6',address:'checkout-form-field-7'};
  const deliveryCustomer=attempt?.customer??reviewed?.customer;
  function primaryAction(className:string){
    const payLabel=!canPay?'':stripeAttempt
      ? stripeTestMode?(ar?(attempt?'متابعة الدفع التجريبي':'المتابعة إلى الدفع التجريبي'):(attempt?'Resume test payment':'Continue to test payment'))
        : attempt?(ar?'متابعة الدفع الآمن':'Resume secure payment'):(ar?`ادفع ${formatted(total!.totalMinor)}`:`Pay ${formatted(total!.totalMinor)}`)
      : attempt?t(locale,'checkoutRetryPending'):tf(locale,'checkoutPlaceOrder',{total:formatted(total!.totalMinor)});
    return <Button type={canPay?'button':'submit'} form="checkout-details" className={className} disabled={working||locating||error===t(locale,'checkoutRecoverError')} onClick={canPay?()=>{void place();}:undefined}>
      {working?<><span className="checkout-loader" aria-hidden="true" />{attempt?t(locale,'checkoutConfirming'):t(locale,'checkoutChecking')}</>:canPay?payLabel:<><span className="lg:hidden">{stage==='details'?(ar?'المتابعة إلى الدفع':'Continue to payment'):(ar?'تحديث إجمالي الطلب':'Update order total')}</span><span className="hidden lg:inline">{t(locale,'checkoutReview')}</span><Icon name="arrow" /></>}
    </Button>;
  }
  function basketLines(){
    return <ul className="m-0 list-none p-0">{basket.map(item=><li key={item.id} className="flex items-center gap-3 border-b border-border py-4 last:border-0">
      <ProductImage src={item.image} alt="" width={52} height={52} sizes="52px" className="size-13 shrink-0 rounded-xl bg-subtle object-contain" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-5">{item.name}</span>{item.variantLabel?<span className="block text-xs text-ocean">{item.variantLabel}</span>:null}<span className="mt-1 block text-xs text-ocean">{tf(locale,'checkoutQty',{count:item.quantity})}</span></span>
      {item.price!==null?<span className="text-sm font-medium tabular-nums">{currencyFormat(locale).format(item.price)}<span className="block text-end text-xs font-normal text-ocean">{ar?'للقطعة':'each'}</span></span>:null}
    </li>)}</ul>;
  }
  if(!ready)return <div className="checkout-flow" role="status"><h1 className="sr-only">{t(locale,'checkoutTitle')}</h1><div className="skeleton h-10 w-48" /><p>{t(locale,'checkoutLoading')}</p></div>;
  if(result)return <><GoogleCustomerReviews config={googleReviews??{merchantId:5884188879,deliveryBusinessDays:6,survey:false,widget:false}} receipt={reviewReceipt} locale={locale} nonce={nonce}/><section className="checkout-flow checkout-completion mx-auto max-w-2xl" aria-labelledby="order-confirmation">
    <CheckoutProgress stage="complete" locale={locale}/><div className="checkout-confirmation-panel">
      <ConfirmationMark/><h1 ref={confirmation} tabIndex={-1} className="mb-3 text-2xl font-semibold outline-none sm:text-3xl" id="order-confirmation">{t(locale,'checkoutOrderReceived')}</h1><p className="text-sm leading-6 text-ocean">{t(locale,'checkoutThankYou')}</p>
      <dl className="my-7 grid grid-cols-2 gap-5 rounded-xl bg-subtle p-5 text-start"><div><dt className="mb-1 text-xs text-ocean">{t(locale,'checkoutOrderNumber')}</dt><dd className="m-0 break-words text-lg font-semibold">{result.orderId}</dd></div><div className="text-end"><dt className="mb-1 text-xs text-ocean">{t(locale,'checkoutOrderTotal')}</dt><dd className="m-0 text-lg font-semibold tabular-nums">{formatted(result.totals.totalMinor)}</dd></div></dl>
      <div className="flex gap-3 text-start"><TruckIcon className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true"/><div><h2 className="mb-1 text-base font-semibold">{t(locale,'checkoutNextTitle')}</h2><p className="m-0 text-sm leading-6 text-ocean">{t(locale,'checkoutNextBody')}</p></div></div>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row"><Link className="button min-h-12 flex-1 text-sm" href="/products">{t(locale,'checkoutContinueShopping')}<Icon name="arrow"/></Link><Link className="button button-secondary min-h-12 flex-1 text-sm" href="/contact">{t(locale,'checkoutContactPharmacyShort')}</Link></div>
    </div>
  </section></>;
  if(basketReady&&!basketCount&&!attempt&&!error)return <section className="checkout-flow mx-auto max-w-xl py-10 text-center"><Icon name="bag"/><h1 className="mt-4 text-2xl">{t(locale,'cartEmptyTitle')}</h1><p className="my-4 text-sm text-ocean">{t(locale,'cartEmptyBody')}</p><Link className="button min-h-12" href="/products">{t(locale,'cartStartShopping')}</Link></section>;
  return <section className="checkout-flow" data-stage={stage} data-keyboard={keyboardOpen} aria-label={t(locale,'checkoutPlaceOrderAria')}>
    <div className="checkout-topbar"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ocean" href="/cart" aria-label={ar?'العودة إلى السلة':'Back to cart'}><ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true"/><span className="hidden sm:inline">{ar?'العودة إلى السلة':'Back to cart'}</span></Link><h1 className="m-0 text-xl font-semibold sm:text-2xl">{t(locale,'checkoutTitle')}</h1><SecureCheckoutLabel locale={locale}/></div>
    <CheckoutProgress stage={stage} locale={locale}/>
    <details className="checkout-basket-preview mb-5 rounded-xl bg-subtle px-4 lg:hidden"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold"><span>{t(locale,'checkoutOrderSummary')}<span className="ms-2 text-xs font-normal text-ocean">{basketCount?itemCountText(locale,basketCount,'product'):''}</span></span><ChevronDownIcon className="size-4 shrink-0" aria-hidden="true"/></summary>{basketLines()}<Link href="/cart" className="mb-2 inline-flex min-h-11 items-center text-sm font-medium text-teal">{ar?'تعديل السلة':'Edit basket'}</Link></details>
    <div className="checkout-grid grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      <form id="checkout-details" ref={form} noValidate aria-busy={working} onSubmit={review} onBlurCapture={event=>validateField(event.target)} onChange={()=>{if(!attempt)setReviewed(null);}} className="checkout-form min-w-0 rounded-2xl bg-surface lg:border lg:border-border">
        {showErrorSummary&&Object.keys(fieldErrors).length?<div ref={errorSummary} tabIndex={-1} role="alert" className="checkout-error-summary m-4 rounded-xl border border-sale p-4 outline-none sm:m-6"><h2 className="mb-2 text-base font-semibold">{ar?'تحقق من التفاصيل التالية':'Check these details'}</h2><ul className="m-0 list-none p-0">{detailFields.filter(name=>fieldErrors[name]).map(name=><li key={name}><a className="inline-flex min-h-11 items-center text-sm text-sale underline underline-offset-4" href={`#${fieldIds[name]}`} onClick={event=>{event.preventDefault();focusDetails(name);}}>{labels[name]}: {fieldErrors[name]}</a></li>)}</ul></div>:null}
        {error?<div ref={feedback} tabIndex={-1} role="alert" className="checkout-error-summary m-4 rounded-xl border border-warning bg-warning-surface p-4 text-sm leading-6 text-warning outline-none sm:m-6">{error}</div>:null}
        <fieldset disabled={working||!!attempt} className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{t(locale,'checkoutLegend')}</legend>
          <div className="checkout-details-stage">
            <div className="checkout-form-heading px-1 pb-5 lg:px-7 lg:pt-7"><h2 ref={stage==='details'?stepHeading:undefined} tabIndex={-1} className="mb-2 scroll-mt-24 text-xl font-semibold outline-none">{t(locale,'checkoutContactDeliveryTitle')}</h2><p className="m-0 text-sm leading-6 text-ocean">{ar?'الحقول مطلوبة ما لم يُذكر أنها اختيارية.':'Required unless marked optional.'}</p></div>
            <section className="checkout-form-section" aria-labelledby="contact-details-heading"><h3 id="contact-details-heading" className="sr-only mb-4 text-base font-semibold lg:not-sr-only">{t(locale,'checkoutContactDetails')}</h3><div className="grid gap-5 sm:grid-cols-2">
              <Field><FieldLabel htmlFor={fieldIds.name}>{labels.name}</FieldLabel><Input id={fieldIds.name} name="name" defaultValue={attempt?.customer.name} required maxLength={200} autoComplete="name" placeholder={t(locale,'checkoutNamePlaceholder')} {...fieldState('name')}/>{fieldIssue('name')}</Field>
              <Field><FieldLabel htmlFor={fieldIds.mobile}>{labels.mobile}</FieldLabel><Input id={fieldIds.mobile} name="mobile" defaultValue={attempt?.customer.mobile} required type="tel" inputMode="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" maxLength={32} placeholder={t(locale,'checkoutMobilePlaceholder')} {...fieldState('mobile')}/>{fieldIssue('mobile')}</Field>
              <Field className="sm:col-span-2"><FieldLabel htmlFor={fieldIds.email}>{labels.email}</FieldLabel><Input id={fieldIds.email} name="email" defaultValue={attempt?.customer.email} required type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" maxLength={254} autoComplete="email" placeholder={t(locale,'checkoutEmailPlaceholder')} {...fieldState('email')}/>{fieldIssue('email')}</Field>
            </div></section>
            <section className="checkout-form-section" aria-labelledby="delivery-details-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 id="delivery-details-heading" className="m-0 text-base font-semibold">{t(locale,'checkoutDeliveryAddress')}</h3><Button variant="ghost" type="button" size="sm" disabled={locating} onClick={locate} aria-label={locating?t(locale,'checkoutLocating'):t(locale,'checkoutUseLocation')}><Icon name="pin"/><span className="lg:hidden">{locating?t(locale,'checkoutLocating'):(ar?'استخدام الموقع':'Use location')}</span><span className="hidden lg:inline">{locating?t(locale,'checkoutLocating'):t(locale,'checkoutUseLocation')}</span></Button></div>
              <input type="hidden" name="maplink" value={maplink}/>
              {locationMessage?<p role="status" className="mb-4 rounded-xl bg-subtle p-3 text-sm leading-6 text-ocean">{locationMessage}</p>:null}
              {maplink?<div className="mb-4 flex flex-wrap items-center gap-x-4 text-xs"><a className="inline-flex min-h-11 items-center text-teal underline" href={maplink} target="_blank" rel="noopener noreferrer" aria-label={t(locale,'checkoutCheckPinAria')}>{t(locale,'checkoutViewPin')}</a><button type="button" className="min-h-11 text-ocean" onClick={()=>{setMaplink('');setLocationMessage(t(locale,'checkoutPinRemoved'));setReviewed(null);}}>{t(locale,'checkoutRemovePin')}</button><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-ocean">{t(locale,'checkoutOsmCredit')}</a></div>:null}
              {savedAddresses.length?<Field className="mb-5"><FieldLabel htmlFor="checkout-form-field-4">{t(locale,'checkoutSavedAddress')}</FieldLabel><NativeSelect id="checkout-form-field-4" defaultValue="" onChange={event=>applySavedAddress(event.target.value)}><option value="">{t(locale,'checkoutChooseAddress')}</option>{savedAddresses.map(address=><option key={address.id} value={address.id}>{address.label}{address.isDefault?` · ${t(locale,'checkoutDefault')}`:''} — {address.city}</option>)}</NativeSelect></Field>:null}
              <div className="checkout-address-grid grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor={fieldIds.emirate}>{labels.emirate}</FieldLabel><NativeSelect id={fieldIds.emirate} name="emirate" value={delivery.emirate} disabled={locating} onChange={event=>editDelivery('emirate',event.target.value)} required autoComplete="address-level1" {...fieldState('emirate')}>{emirates.map(value=><option key={value} value={value}>{emirateLabel(locale,value)}</option>)}</NativeSelect>{fieldIssue('emirate')}</Field>
                <Field><FieldLabel htmlFor={fieldIds.city}>{labels.city}</FieldLabel><Input id={fieldIds.city} name="city" value={delivery.city} disabled={locating} onChange={event=>editDelivery('city',event.target.value)} required maxLength={200} autoComplete="address-level2" placeholder={t(locale,'checkoutCityPlaceholder')} {...fieldState('city')}/>{fieldIssue('city')}</Field>
                <Field className="col-span-2"><FieldLabel htmlFor={fieldIds.address}>{labels.address}</FieldLabel><Input id={fieldIds.address} name="address" value={delivery.address} disabled={locating} onChange={event=>editDelivery('address',event.target.value)} required maxLength={1000} autoComplete="street-address" placeholder={t(locale,'checkoutStreetPlaceholder')} {...fieldState('address')}/>{fieldIssue('address')}</Field>
              </div>
              <details className="checkout-optional mt-4"><summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-teal">{ar?'إضافة تفاصيل المبنى أو تعليمات التوصيل':'Add building details or delivery instructions'}<ChevronDownIcon className="size-4" aria-hidden="true"/></summary><div className="grid gap-5 py-3 sm:grid-cols-2">
                <Field><FieldLabel htmlFor="checkout-form-field-8">{t(locale,'checkoutBuilding')}</FieldLabel><Input id="checkout-form-field-8" name="buildingname" defaultValue={attempt?.customer.buildingname} maxLength={200} autoComplete="address-line2" placeholder={t(locale,'checkoutBuildingPlaceholder')}/></Field>
                <Field><FieldLabel htmlFor="checkout-form-field-9">{t(locale,'checkoutFlat')}</FieldLabel><Input id="checkout-form-field-9" name="flatno" defaultValue={attempt?.customer.flatno} maxLength={200} placeholder={t(locale,'checkoutFlatPlaceholder')}/></Field>
                <Field className="sm:col-span-2"><FieldLabel htmlFor="checkout-form-field-10">{t(locale,'checkoutNote')}</FieldLabel><Input id="checkout-form-field-10" name="note" defaultValue={attempt?.customer.note} maxLength={1000} placeholder={t(locale,'checkoutNotePlaceholder')}/></Field>
              </div></details>
            </section>
          </div>
          <div className="checkout-payment-stage">
            <div className="mb-5 flex items-center justify-between gap-3 lg:hidden"><h2 ref={stage==='payment'?stepHeading:undefined} tabIndex={-1} className="m-0 scroll-mt-24 text-xl font-semibold outline-none">{ar?'المراجعة والدفع':'Review & payment'}</h2><button type="button" disabled={working||!!attempt} className="min-h-11 text-sm font-semibold text-teal" onClick={()=>focusDetails()}>{ar?'رجوع':'Back'}</button></div>
            {deliveryCustomer?<div className="mb-6 flex items-start gap-3 rounded-xl bg-subtle p-4 lg:hidden"><Icon name="pin"/><div className="min-w-0 flex-1"><h3 className="mb-1 text-sm font-semibold">{ar?'التوصيل إلى':'Deliver to'} {deliveryCustomer.name}</h3><p className="m-0 break-words text-sm leading-6 text-ocean">{deliveryCustomer.address}, {deliveryCustomer.city}, {emirateLabel(locale,deliveryCustomer.emirate)}</p></div><button type="button" disabled={working||!!attempt} className="inline-flex min-h-11 items-center text-sm font-medium text-teal" onClick={()=>focusDetails()} aria-label={ar?'تعديل تفاصيل التوصيل':'Edit delivery details'}><PencilSquareIcon className="size-5" aria-hidden="true"/></button></div>:null}
            <section className="checkout-payment-section" aria-labelledby="payment-details-heading"><h3 className="sr-only" id="payment-details-heading">{t(locale,'checkoutPayment')}</h3><PaymentChoices locale={locale} value={selectedPayment} online={stripeOptionVisible} testMode={stripeTestMode} legacyCard={attempt?.customer.payment==='card'} onChange={changePayment}/>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ocean"><LockClosedIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>{selectedPayment==='stripe'?(stripeTestMode?(ar?'استخدم بطاقة اختبار؛ لن يتم تحصيل أموال حقيقية.':'Use a test card; no money will be charged.'):(ar?'ستنتقل إلى صفحة آمنة لإتمام الدفع. قد يطلب مصرفك تأكيد العملية.':'You’ll continue to a secure payment page. Your bank may ask you to verify the payment.')):t(locale,'checkoutPayWhenArrives')}</p>
              {selectedPayment!=='stripe'?<details className="checkout-optional mt-5"><summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-teal">{ar?'هل لديك قسيمة مكافآت؟':'Have a reward voucher?'}<ChevronDownIcon className="size-4" aria-hidden="true"/></summary><Field className="py-3"><FieldLabel htmlFor="checkout-form-field-12">{t(locale,'checkoutVoucher')}</FieldLabel><div className="flex gap-2"><Input id="checkout-form-field-12" value={voucherCode} maxLength={27} placeholder="AM-…" onChange={event=>setVoucherCode(event.target.value.toUpperCase())} autoComplete="off"/><Button type="submit" variant="outline" disabled={working||!!attempt}>{ar?'تطبيق':'Apply'}</Button></div><FieldDescription>{t(locale,'checkoutVoucherHint')}</FieldDescription></Field></details>:null}
            </section>
          </div>
        </fieldset>
        <div className="checkout-details-help px-5 pb-4 lg:hidden"><Link className="inline-flex min-h-11 items-center text-sm font-medium text-teal" href="/contact">{ar?'تحتاج مساعدة؟':'Need help with your order?'}</Link></div>
      </form>
      <aside className={`checkout-order-panel min-w-0 rounded-2xl bg-subtle p-5 lg:sticky lg:top-6 lg:p-6 ${stage==='details'?'hidden lg:block':''}`} aria-labelledby="checkout-summary">
        <div className="mb-2 flex items-center justify-between gap-3"><h2 ref={summary} tabIndex={-1} className="m-0 scroll-mt-24 text-lg font-semibold outline-none" id="checkout-summary">{t(locale,'checkoutOrderSummary')}</h2><button type="button" aria-expanded={orderExpanded} aria-controls="checkout-order-items" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-teal lg:hidden" onClick={()=>setOrderExpanded(value=>!value)}>{orderExpanded?(ar?'إخفاء':'Hide'):(ar?'عرض التفاصيل':'Details')}<ChevronDownIcon className="size-4" aria-hidden="true"/></button><Link href="/cart" className="hidden min-h-11 items-center text-sm font-medium text-teal lg:inline-flex">{ar?'تعديل':'Edit'}</Link></div>
        <div id="checkout-order-items" className={orderExpanded?'':'hidden lg:block'}>{total?<ul className="m-0 list-none p-0">{total.lines.map(line=><li key={line.productId} className="flex items-start gap-3 border-b border-border py-4"><ProductImage src={basket.find(item=>item.id===line.productId)?.image??'/product-placeholder.svg'} alt="" width={56} height={56} sizes="56px" className="size-14 shrink-0 rounded-lg bg-surface object-contain"/><span className="min-w-0 flex-1 text-sm font-medium leading-5">{line.name}{line.variantLabel?<span className="block text-xs text-ocean">{line.variantLabel}</span>:null}<span className="mt-1 block text-xs font-normal text-ocean">{tf(locale,'checkoutQty',{count:line.quantity})}</span></span><strong className="shrink-0 text-sm tabular-nums">{formatted(line.lineTotalMinor)}</strong></li>)}</ul>:basketLines()}</div>
        {total?<dl className="my-5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 text-sm tabular-nums"><dt>{t(locale,'checkoutItems')}</dt><dd className="m-0 text-end">{formatted(total.subtotalMinor)}</dd>{total.voucher?<><dt>{t(locale,'checkoutRewardVoucher')}</dt><dd className="m-0 text-end text-teal">−{formatted(total.voucher.discountMinor)}</dd></>:null}<dt>{t(locale,'checkoutDelivery')}</dt><dd className="m-0 text-end">{formatted(total.deliveryFeeMinor)}</dd><dt>{total.vatMode==='inclusive'?t(locale,'checkoutVatIncluded'):t(locale,'checkoutVat')}</dt><dd className="m-0 text-end">{formatted(total.taxMinor)}</dd><dt className="border-t border-border pt-4 text-lg font-semibold">{t(locale,'checkoutTotal')}</dt><dd className="m-0 border-t border-border pt-4 text-end text-lg font-semibold">{formatted(total.totalMinor)}</dd></dl>:<p className="my-5 min-h-18 text-sm leading-6 text-ocean" role="status">{working?t(locale,'checkoutChecking'):basketError|| (ar?'أضف تفاصيل التوصيل لتأكيد الإجمالي ورسوم التوصيل.':'Add your delivery details to confirm the total and delivery charge.')}</p>}
        <div className="hidden lg:block">{primaryAction('w-full min-h-12') }<p className="mt-3 text-center text-xs leading-5 text-ocean">{t(locale,'checkoutFinalTotalNote')}</p></div>
        {attempt?<p role="status" className="mt-4 text-sm leading-6 text-ocean">{t(locale,'checkoutPendingNotice')}</p>:null}
        <div className="mt-5 flex flex-wrap gap-x-4 border-t border-border pt-3 text-xs text-ocean"><Link className="inline-flex min-h-11 items-center" href="/shipping">{ar?'التوصيل':'Delivery'}</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">{ar?'الخصوصية':'Privacy'}</Link><Link className="inline-flex min-h-11 items-center" href="/returns">{ar?'الإرجاع':'Returns'}</Link><Link className="inline-flex min-h-11 items-center" href="/contact">{ar?'تحتاج مساعدة؟':'Need help?'}</Link></div>
      </aside>
    </div>
    <div className="checkout-mobile-action lg:hidden"><div className="flex items-center justify-between gap-3 pb-2 text-sm"><span className="text-ocean">{stage==='details'?(ar?'تفاصيل التوصيل':'Delivery details'):t(locale,'checkoutTotal')}</span><strong className="font-semibold tabular-nums">{total?formatted(total.totalMinor):(ar?'يتأكد في الخطوة التالية':'Confirmed next')}</strong></div>{primaryAction('w-full min-h-12')}<p className="mt-2 mb-0 text-center text-xs leading-5 text-ocean">{stage==='details'?(ar?'راجع إجمالي طلبك قبل تأكيده.':'Review your total before placing your order.'):t(locale,'checkoutFinalTotalNote')}</p></div>
  </section>;
}
