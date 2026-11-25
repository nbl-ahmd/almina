'use client';
import { customerRead } from '../lib/account/session-hint';
import { CurrencyAmount } from './currency-amount';
import { CouponField } from './coupon-field';
import { couponError, readCoupon, saveCoupon } from '../lib/checkout/coupon';
import { DeliveryPinPicker } from './delivery-pin-picker';
import type { DeliveryPoint } from '@almina/contracts';
import {searchAttributions,searchUsageAllowed,reportSearchEvent} from '../lib/search/attribution';
import { Input } from './ui/input';
import { GoogleCustomerReviews } from './google-customer-reviews';
import type { GoogleCommerceConfiguration, ReviewReceipt } from '../lib/google/commerce';
import { Button } from './ui/button';
import { CheckoutProgress, PaymentChoices, SecureCheckoutLabel, ConfirmationMark } from './checkout-ui';
import { ProductImage } from './product-image';
import { loadCart } from '../app/(storefront)/cart/actions';
import { detailErrors, detailError, detailFields, normalizeCheckoutMobile, type DetailField } from '../lib/checkout/validation';
import { CheckIcon, UserCircleIcon, ChevronDownIcon, ChevronRightIcon, CrosshairIcon, MapIcon, MapPinIcon, LockClosedIcon, ArrowLeftIcon, TruckIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from './storefront-icons';
import { NativeSelect } from './ui/native-select';
import { Field, FieldLabel, FieldDescription } from './ui/field';

import { emirateLabel } from '../lib/i18n';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from './app-link';
import { checkoutInputSchema, customerInputSchema, checkoutDtoSchema, stripeCheckoutDtoSchema, quoteDtoSchema, type CheckoutInput, type Quote } from '@almina/contracts';
import { Icon } from './storefront-icon';
import { areaEvent, openDeliveryEvent, savedArea, savedPoint } from '../lib/location/browser';
import { browserEnvironment, guidanceFor, type Guidance } from '../lib/location/access';
import { z } from 'zod';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { deliveryEmirates, reverseLocationDtoSchema } from '@almina/contracts';
import { t, tf, itemCountText, type Locale } from '../lib/i18n';

const pendingKey = 'almina.checkout.pending.v1';
const emirates = deliveryEmirates;
function errorMessages(locale: Locale): Record<string, string> {
  return {
    DELIVERY_LOCATION_REQUIRED: locale==='ar'?'حدد دبوس التوصيل للتحقق من التغطية.':'Choose a delivery pin to check coverage.',
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
type Reviewed = z.infer<typeof acknowledgment> & { customer: CheckoutInput['customer']; items: CheckoutInput['items'];voucherCode?:string; couponCode?:string };
type SavedDeliveryAddress={coordinates?:DeliveryPoint;id:string;label:string;name:string;mobile:string;emirate:string;city:string;address:string;buildingname:string;flatno:string;note:string;maplink:string;isDefault:boolean};
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
  const [reviewFocusRequest, setReviewFocusRequest] = useState(0);
  const [fieldErrors,setFieldErrors]=useState<Partial<Record<DetailField,string>>>({});
  const [validationAttempt,setValidationAttempt]=useState(0);
  const [keyboardOpen,setKeyboardOpen]=useState(false);
  const stepHeading=useRef<HTMLHeadingElement>(null);
  const [basket,setBasket]=useState<Awaited<ReturnType<typeof loadCart>>['items']>([]);
  const [basketReady,setBasketReady]=useState(false);
  const [basketCount,setBasketCount]=useState(0);
  const [basketError,setBasketError]=useState('');
  const [orderExpanded,setOrderExpanded]=useState(false);
  const formatted = (minor: number) => currencyFormat(locale).format(minor / 100);
  // Displayed amounts use the shared dirham mark with a spoken AED alternative; formatted() stays for text labels.
  const amount = (minor: number) => <CurrencyAmount value={minor / 100} locale={locale} />;
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
  const [coordinates,setCoordinates]=useState<DeliveryPoint|null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [locationGuidance, setLocationGuidance] = useState<Guidance | null>(null);
  const [locationTone, setLocationTone] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const say = (message: string, tone: 'info' | 'success' | 'warning' | 'error' = 'info') => { setLocationMessage(message); setLocationTone(tone); };
  const [delivery, setDelivery] = useState({ address: '', emirate: 'Ras al-Khaimah', city: '' });
  const [reviewReceipt, setReviewReceipt] = useState<ReviewReceipt | null>(null);
  const [paymentMethod,setPaymentMethod]=useState('cash');
  const [voucherCode,setVoucherCode]=useState('');
  const [couponCode, setCouponCode] = useState('');
  const [savedAddresses,setSavedAddresses]=useState<SavedDeliveryAddress[]>([]);
  const [addressesLoaded,setAddressesLoaded]=useState(false);
  const [account,setAccount]=useState<{email:string}|null>(null);
  const [accountChecked,setAccountChecked]=useState(false);
  const [selectedSaved,setSelectedSaved]=useState('');
  const [contactEditing,setContactEditing]=useState(false);
  const [contact,setContact]=useState({name:'',mobile:'',email:''});
  const [manualOpen,setManualOpen]=useState(false);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [attempt, setAttempt] = useState<CheckoutInput | null>(null);
  const [result, setResult] = useState<z.infer<typeof checkoutDtoSchema> | null>(null);
  type Receipt = { lines: { productId: string; name: string; variantLabel?: string | null | undefined; quantity: number; lineTotalMinor: number; image: string }[]; address: string; payment: string; minutes?: number | undefined; customerName: string };
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  useEffect(() => {
    // Errors sit under their own fields (Talabat/1mg); the first invalid field takes focus so its message is read out.
    if(!validationAttempt)return;
    const first=detailFields.find(name=>fieldErrors[name]);
    if(first)focusDetails(first);
  },[validationAttempt]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (!reviewFocusRequest || stage !== 'payment') return;
    // Focus after React attaches the payment-stage heading, rather than racing a frame before commit.
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    const target = mobile ? stepHeading.current : summary.current;
    target?.focus({ preventScroll: true });
    if (mobile) target?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [reviewFocusRequest, stage]);
  /** The spot confirmed in the "Where are we delivering?" sheet becomes the checkout address, so nobody types it twice. Typed values are
   *  only replaced when the customer chose a new place in the sheet (announce), never silently on page load over their own edits. */
  /** Building, flat and note are plain inputs; the form may not be mounted yet on first load, so retry once it is. */
  function fillPointDetails(saved: NonNullable<ReturnType<typeof savedPoint>>, announce: boolean, triesLeft = 20) {
    const form_ = form.current;
    if (!form_) { if (triesLeft > 0) setTimeout(() => fillPointDetails(saved, announce, triesLeft - 1), 50); return; }
    for (const [name, value] of Object.entries({ buildingname: saved.building, flatno: saved.flat, note: saved.note })) {
      const field = form_.elements.namedItem(name);
      if (value && field instanceof HTMLInputElement && (announce || !field.value)) field.value = value;
    }
  }
  function applySavedPoint(announce: boolean) {
    const saved = savedPoint();
    if (!saved || attempt) return;
    setDelivery({ address: saved.address, emirate: saved.emirate, city: saved.city });
    setCoordinates({ latitude: saved.latitude, longitude: saved.longitude });
    setMaplink(`https://www.google.com/maps/search/?api=1&query=${saved.latitude},${saved.longitude}`);
    setReviewed(null);
    fillPointDetails(saved, announce);
    if (announce) say(ar ? 'تم استخدام موقع التوصيل المحفوظ. أضف المبنى ورقم الشقة.' : 'Using your saved delivery location. Add your building and flat details.', 'success');
  }
  useEffect(() => {
    let active = true;
    const requestState = locationRequest;
    const timerState = locationTimer;
    void Promise.resolve().then(() => {
      if (!active) return;
      setCouponCode(readCoupon());
      try {
        const area = savedArea();
        if (area) setDelivery(previous => ({ ...previous, city: area.city, emirate: area.emirate }));
        applySavedPoint(false);
        const raw = sessionStorage.getItem(pendingKey);
        if (raw) {
          const value = checkoutInputSchema.parse(JSON.parse(raw));
          if (!value.acceptedQuoteHash) throw new Error('Missing acknowledgment');
          setAttempt(value); setStage('payment'); setPaymentMethod(value.customer.payment); setDelivery({address:value.customer.address,emirate:value.customer.emirate,city:value.customer.city});setMaplink(value.customer.maplink);setCoordinates(value.customer.coordinates??null);
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
  useEffect(() => { const onChange = () => applySavedPoint(true); window.addEventListener(areaEvent, onChange); return () => window.removeEventListener(areaEvent, onChange); }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{let active=true;
    void customerRead('/api/customer/me').then(async response=>{if(!response.ok)return;const payload=await response.json() as {data?:{email?:string}};if(active&&typeof payload.data?.email==='string')setAccount({email:payload.data.email});}).catch(()=>{}).finally(()=>{if(active)setAccountChecked(true);});
    void customerRead('/api/customer/addresses').then(async response=>{if(!response.ok)return;const payload=await response.json() as {data?:SavedDeliveryAddress[]};if(active&&Array.isArray(payload.data))setSavedAddresses(payload.data);}).catch(()=>{}).finally(()=>{if(active)setAddressesLoaded(true);});
    return()=>{active=false;};},[]);
  function setField(name:string,value:string,onlyIfEmpty=false){const field=form.current?.elements.namedItem(name);if(field instanceof HTMLInputElement&&(!onlyIfEmpty||!field.value))field.value=value;}
  function readContact(){const f=form.current;const get=(name:string)=>{const field=f?.elements.namedItem(name);return field instanceof HTMLInputElement?field.value.trim():'';};setContact({name:get('name'),mobile:get('mobile'),email:get('email')});}
  function applySavedAddress(id:string,quiet=false){const saved=savedAddresses.find(item=>item.id===id);if(!saved||!form.current)return;setSelectedSaved(id);setDelivery({address:saved.address,emirate:saved.emirate,city:saved.city});setMaplink(saved.coordinates?`https://www.google.com/maps/search/?api=1&query=${saved.coordinates.latitude},${saved.coordinates.longitude}`:saved.maplink);setCoordinates(saved.coordinates??null);if(!quiet)say(t(locale, 'checkoutSavedApplied'), 'success');for(const [name,value] of Object.entries({name:saved.name,mobile:saved.mobile,buildingname:saved.buildingname,flatno:saved.flatno,note:saved.note}))setField(name,value);setReviewed(null);readContact();}
  // A signed-in customer is not asked again for what we already hold: their e-mail comes from the account, name and mobile from their default
  // saved address, and that address is used unless they picked a different spot on this device.
  useEffect(()=>{
    if(!account||!addressesLoaded||!ready||attempt)return;
    const timer=setTimeout(()=>{
      setField('email',account.email,true);
      const preferred=savedAddresses.find(item=>item.isDefault)??savedAddresses[0];
      if(preferred){
        setField('name',preferred.name,true);setField('mobile',preferred.mobile,true);
        if(!savedPoint()&&!form.current?.querySelector<HTMLInputElement>('[name="address"]')?.value)applySavedAddress(preferred.id,true);
        else setSelectedSaved(previous=>previous);
      }
      readContact();
    },0);
    return()=>clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[account,addressesLoaded,ready]);
  function locate() {
    if (busy.current || attempt || locating) return;
    setReviewed(null);
    if (!navigator.geolocation || !window.isSecureContext) {
      say(t(locale, 'checkoutLocationUnavailableBrowser'), 'error');
      return;
    }
    const request = ++locationRequest.current;
    setLocationGuidance(null);
    setLocating(true);
    say(t(locale, 'checkoutLocationWaiting'));
    function finish(message: string, tone: 'success' | 'warning' | 'error' = 'error') {
      if (request !== locationRequest.current) return false;
      locationRequest.current++;
      if (locationTimer.current) clearTimeout(locationTimer.current);
      setLocating(false);
      say(message, tone);
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
        say(t(locale, 'checkoutLocationFindingAddress'));
        void send('/api/checkout/location', { latitude, longitude }).then(raw => {
          const result = reverseLocationDtoSchema.parse(raw);
          const lowAccuracy = Number.isFinite(accuracy) && accuracy > 100;
          if (!finish(t(locale, lowAccuracy ? 'checkoutLocationFilledLowAccuracy' : 'checkoutLocationFilled'), lowAccuracy ? 'warning' : 'success')) return;
          setDelivery({ address: result.address, emirate: result.emirate, city: result.city });
          setMaplink(result.maplink);setCoordinates({latitude,longitude});
        }).catch(failure => finish(failure instanceof CheckoutFailure && failure.code === 'LOCATION_OUTSIDE_UAE'
          ? t(locale, 'checkoutLocationOutsideUae')
          : failure instanceof CheckoutFailure && failure.code === 'RATE_LIMITED'
            ? t(locale, 'checkoutLocationBusy')
            : t(locale, 'checkoutLocationIncomplete')));
      }, failure => {
        if (failure.code === 1 && request === locationRequest.current) setLocationGuidance(guidanceFor('denied', browserEnvironment(), locale));
        finish(failure.code === 1 ? t(locale, 'checkoutLocationDenied')
          : failure.code === 3 ? t(locale, 'checkoutLocationTimeout')
          : t(locale, 'checkoutLocationNotFound'));
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    } catch { finish(t(locale, 'checkoutLocationUnavailable')); }
  }
  function editDelivery(field: keyof typeof delivery, value: string) {
    setDelivery(previous => ({ ...previous, [field]: value }));
    if (coordinates) setCoordinates(null);
    if (maplink) { setMaplink(''); say(t(locale, 'checkoutAddressChanged')); }
  }
  function intent(code = couponCode) {
    if (!form.current) throw new Error('Form unavailable');
    const data=Object.fromEntries(new FormData(form.current));
    if(typeof data.mobile==='string')data.mobile=normalizeCheckoutMobile(data.mobile);
    const customer = customerInputSchema.parse({...data,...(coordinates?{coordinates}:{})});
    const items = storedCart().map(line => ({ productId: line.id, quantity: line.quantity }));
    if (!items.length) throw new InputError('CART_EMPTY');
    return { customer, items, ...(voucherCode.trim()?{voucherCode:voucherCode.trim().toUpperCase()}:{} ), ...(code ? { couponCode: code } : {}) };
  }
  function focusDetails(name?:string) {
    setStage('details');
    if(history.state?.alminaCheckoutStage==='payment')history.back();
    requestAnimationFrame(()=>{const target=name?form.current?.elements.namedItem(name):stepHeading.current;if(target instanceof HTMLElement){target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});}});
  }
  function values() { return Object.fromEntries(new FormData(form.current!)); }
  function validateDetails() {
    const next=detailErrors(values(),locale);setFieldErrors(next);
    if(Object.keys(next).length){setStage('details');setValidationAttempt(value=>value+1);return false;}return true;
  }
  function validateField(target: EventTarget) {
    if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement)||!detailFields.includes(target.name as DetailField))return;
    const name=target.name as DetailField, message=detailError(name,target.value,locale);
    setFieldErrors(previous=>{const next={...previous};if(message)next[name]=message;else delete next[name];return next;});
  }
  async function refreshQuote(paymentOverride?:string, couponOverride?:string) {
    if(busy.current||attempt||locating)return false;
    if(!validateDetails())return false;
    busy.current=true;setWorking(true);setError('');setReviewed(null);
    try {
      const input=intent(couponOverride);
      if(paymentOverride){input.customer.payment=customerInputSchema.shape.payment.parse(paymentOverride);if(paymentOverride==='stripe')delete input.voucherCode;}
      const response=acknowledgment.parse(await send('/api/checkout/quote',input));
      // A cart modified in another tab cannot become a stale payable review.
      if(JSON.stringify(input.items)!==JSON.stringify(storedCart().map(line=>({productId:line.id,quantity:line.quantity}))))throw new InputError('CART_CHANGED');
      setReviewed({...response,...input});setOrderExpanded(true);
      recordCommerceEvent('checkout_reviewed');return true;
    }catch(failure){recordCommerceEvent('checkout_failed');setError(failure instanceof CheckoutFailure?(couponError(failure.code, locale) || errors[failure.code] || t(locale,'checkoutErrorReviewGeneric')):failure instanceof InputError?inputs[failure.code]:t(locale,'checkoutErrorCheckDetails'));return false;}
    finally{busy.current=false;setWorking(false);}
  }
  async function review(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(await refreshQuote()){
      if(stage==='details'&&window.matchMedia('(max-width: 1023px)').matches){history.pushState({...history.state,alminaCheckoutStage:'payment'},'','#payment');}
      setStage('payment');setReviewFocusRequest(value => value + 1);
    }
  }
  function changePayment(value:string){
    setPaymentMethod(value);if(value==='stripe')setVoucherCode('');setReviewed(null);
    if(stage==='payment')queueMicrotask(()=>{void refreshQuote(value);});
  }
  function fieldState(name:DetailField){return {'aria-invalid':!!fieldErrors[name],'aria-describedby':fieldErrors[name]?`checkout-error-${name}`:undefined};}
  function fieldIssue(name:DetailField){return fieldErrors[name]?<p id={`checkout-error-${name}`} className="field-error">{fieldErrors[name]}</p>:null;}
  async function place() {
    if (busy.current || locating || (!reviewed && !attempt)) return;
    busy.current = true; setWorking(true); setError('');
    let submitted = false;
    let stripeSubmission=attempt?.customer.payment==='stripe';
    try {
      let input = attempt;
      if (!input) {
        const current = intent();
        if (JSON.stringify(current) !== JSON.stringify({ customer: reviewed!.customer, items: reviewed!.items, ...(reviewed!.voucherCode?{voucherCode:reviewed!.voucherCode}:{} ), ...(reviewed!.couponCode ? { couponCode: reviewed!.couponCode } : {}) })) {
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
      if (input.couponCode) saveCoupon('');
      setReceipt({ lines: (reviewed?.quote.lines ?? []).map(line => ({ productId: line.productId, name: line.name, variantLabel: line.variantLabel, quantity: line.quantity, lineTotalMinor: line.lineTotalMinor, image: basket.find(item => item.id === line.productId)?.image ?? '/product-placeholder.svg' })),
        address: `${input.customer.address}, ${input.customer.city}`, payment: input.customer.payment, minutes: reviewed?.quote.delivery?.estimatedMinutes, customerName: input.customer.name });
      setResult(committed); setAttempt(null); setReviewed(null);
      recordCommerceEvent('checkout_confirmed');
      try { sessionStorage.removeItem(pendingKey); } catch { /* A replay is safe if storage fails. */ }
      try {
        const purchased = new Map(input.items.map(item => [item.productId, item.quantity]));
        saveCart(storedCart().map(line => ({ id: line.id, quantity: Math.max(0, line.quantity - (purchased.get(line.id) ?? 0)) })).filter(line => line.quantity > 0));
      } catch { /* Committed order remains successful; cart storage cannot undo it. */ }
    } catch (failure) {
      recordCommerceEvent('checkout_failed');
      if (failure instanceof CheckoutFailure && failure.definite && (!stripeSubmission||['COUPON_UNAVAILABLE','COUPON_MINIMUM','COUPON_COMBINATION','COUPON_PAYMENT_MINIMUM','PRICE_CHANGED','INSUFFICIENT_STOCK','PRODUCT_UNAVAILABLE','MINIMUM_ORDER','INVALID_TRANSITION','COMMERCE_UNAVAILABLE'].includes(failure.code))) {
        try { sessionStorage.removeItem(pendingKey); } catch { /* Same key still cannot duplicate a committed order. */ }
        setAttempt(null); setReviewed(null);
        setError(couponError(failure.code, locale) || errors[failure.code] || t(locale, 'checkoutErrorRejected'));
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
      {working?<><span className="checkout-loader" aria-hidden="true" />{attempt?t(locale,'checkoutConfirming'):t(locale,'checkoutChecking')}</>:canPay?payLabel:<><span>{t(locale,'checkoutReview')}</span><Icon name="arrow" /></>}
    </Button>;
  }
  const couponField = !attempt && <CouponField locale={locale} code={couponCode} disabled={working || locating}
    onApply={code => {
      if (voucherCode.trim() && paymentMethod !== 'stripe') {
        setError(couponError('COUPON_COMBINATION', locale));
        return;
      }
      void refreshQuote(undefined, code).then(applied => {
        if (applied) { setCouponCode(code); saveCoupon(code); }
      });
    }}
    onRemove={() => {
      setCouponCode(''); saveCoupon(''); setReviewed(null); setError('');
      if (stage === 'payment') void refreshQuote(undefined, '');
    }} />;
  // Placeholder rows while the basket loads; storage can be blocked, so never let this read throw during render.
  const pendingLines=(()=>{if(basketReady)return 0;try{return Math.max(1,storedCart().length);}catch{return 1;}})();
  const itemsEstimateMinor=basket.length&&basket.every(item=>item.price!==null)?Math.round(basket.reduce((sum,item)=>sum+(item.price??0)*item.quantity,0)*100):null;
  const contactReady=!!account&&!!contact.name&&!!contact.mobile&&!!contact.email;
  const contactErrors=!!(fieldErrors.name||fieldErrors.mobile||fieldErrors.email);
  const showContactRow=contactReady&&!contactEditing&&!contactErrors;
  const hasPlace=!!(coordinates&&delivery.address);
  const addressErrors=!!(fieldErrors.emirate||fieldErrors.city||fieldErrors.address);
  const manualVisible=manualOpen||!hasPlace||addressErrors;
  const pointLabel=savedPoint()?.label;
  const labelNames=ar?{Home:'المنزل',Work:'العمل',Other:'أخرى'}:{Home:'Home',Work:'Work',Other:'Other'};
  function basketLines(){
    return <ul className="m-0 list-none p-0">{basket.map(item=><li key={item.id} className="flex items-center gap-3 border-b py-4 last:border-0">
      <ProductImage locale={locale} src={item.image} alt="" width={52} height={52} sizes="52px" className="size-13 shrink-0 rounded-xl object-contain" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-5">{item.name}</span>{item.variantLabel?<span className="block text-xs">{item.variantLabel}</span>:null}<span className="mt-1 block text-xs">{tf(locale,'checkoutQty',{count:item.quantity})}</span></span>
      {item.price!==null?<span className="text-sm font-medium tabular-nums"><CurrencyAmount value={item.price} locale={locale} /><span className="block text-end text-xs font-normal">{ar?'للقطعة':'each'}</span></span>:null}
    </li>)}</ul>;
  }
  if(!ready)return <div className="checkout-flow purchase-loading" role="status"><h1 className="sr-only">{t(locale,'checkoutTitle')}</h1><div className="skeleton h-10 w-48" /><p>{t(locale,'checkoutLoading')}</p></div>;
  if(result)return <><GoogleCustomerReviews config={googleReviews??{merchantId:5884188879,deliveryBusinessDays:6,survey:false,widget:false}} receipt={reviewReceipt} locale={locale} nonce={nonce}/><section className="checkout-flow checkout-completion mx-auto max-w-2xl" aria-labelledby="order-confirmation">
    <CheckoutProgress stage="complete" locale={locale}/><div className="checkout-confirmation-panel grid gap-6">
      <div><ConfirmationMark/><h1 ref={confirmation} tabIndex={-1} className="mb-2 text-2xl font-semibold outline-none sm:text-3xl" id="order-confirmation">{t(locale,'checkoutOrderReceived')}</h1><p className="m-0 text-sm leading-6">{t(locale,'checkoutThankYou')}</p></div>
      <ol className="pf-tracker" aria-label={ar?'حالة الطلب':'Order status'}>
        <li data-done="true" data-current="true"><span className="pf-tracker-dot"><CheckIcon className="size-4" aria-hidden="true"/></span>{ar?'تم استلام الطلب':'Order placed'}</li>
        <li><span className="pf-tracker-dot" aria-hidden="true"/>{ar?'تأكيد الصيدلية':'Pharmacy confirms'}</li>
        <li><span className="pf-tracker-dot" aria-hidden="true"/>{ar?'في الطريق':'On the way'}</li>
      </ol>
      <dl className="grid grid-cols-2 gap-5 rounded-xl p-5 text-start"><div><dt className="mb-1 text-xs">{t(locale,'checkoutOrderNumber')}</dt><dd className="m-0 break-words text-lg font-semibold">{result.orderId}</dd></div><div className="text-end"><dt className="mb-1 text-xs">{t(locale,'checkoutOrderTotal')}</dt><dd className="m-0 text-lg font-semibold tabular-nums">{amount(result.totals.totalMinor)}</dd></div>{result.totals.coupon && <div className="col-span-2"><dt className="text-xs">{ar ? 'خصم الرمز' : 'Coupon discount'} <bdi dir="ltr">({result.totals.coupon.code})</bdi></dt><dd className="m-0 text-sm">−{amount(result.totals.coupon.discountMinor)}</dd></div>}</dl>
      {receipt?<div className="grid gap-4 text-start">
        <ul className="pf-receipt-lines">{receipt.lines.map(line=><li key={line.productId}><span className="pf-thumb"><ProductImage locale={locale} src={line.image} alt="" width={48} height={48} sizes="48px" className="size-full object-contain p-1"/></span><span className="min-w-0"><span className="block font-medium">{line.name}</span><span className="pf-muted block">{tf(locale,'checkoutQty',{count:line.quantity})}</span></span><strong className="tabular-nums">{amount(line.lineTotalMinor)}</strong></li>)}</ul>
        <div className="qc-place"><MapPinIcon className="qc-place-icon" aria-hidden="true"/><div className="qc-place-text"><p className="qc-place-title"><span>{ar?'التوصيل إلى':'Delivering to'}</span> <strong>{receipt.customerName}</strong></p><p className="qc-place-address">{receipt.address}</p>{receipt.minutes?<p className="pf-muted">{ar?`الوقت التقديري ${receipt.minutes} دقيقة`:`Estimated ${receipt.minutes} minutes`} · {receipt.payment==='stripe'||receipt.payment==='card'?(ar?'مدفوع بالبطاقة':'Paid by card'):(ar?'الدفع عند الاستلام':'Pay on delivery')}</p>:<p className="pf-muted">{receipt.payment==='stripe'||receipt.payment==='card'?(ar?'مدفوع بالبطاقة':'Paid by card'):(ar?'الدفع عند الاستلام':'Pay on delivery')}</p>}</div></div>
      </div>:null}
      <div className="flex gap-3 text-start"><TruckIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true"/><div><h2 className="mb-1 text-base font-semibold">{t(locale,'checkoutNextTitle')}</h2><p className="m-0 text-sm leading-6">{t(locale,'checkoutNextBody')}</p></div></div>
      <div className="flex flex-col gap-2 sm:flex-row"><Link className="button min-h-12 flex-1 text-sm" href="/products">{t(locale,'checkoutContinueShopping')}<Icon name="arrow"/></Link><Link className="button button-secondary min-h-12 flex-1 text-sm" href="/contact">{t(locale,'checkoutContactPharmacyShort')}</Link></div>
    </div>
  </section></>;
  if(basketReady&&!basketCount&&!attempt&&!error)return <section className="checkout-flow purchase-empty py-10 text-center [&>*]:max-w-xl"><Icon name="bag"/><h1 className="mt-4 text-2xl">{t(locale,'cartEmptyTitle')}</h1><p className="my-4 text-sm">{t(locale,'cartEmptyBody')}</p><Link className="button min-h-12" href="/products">{t(locale,'cartStartShopping')}</Link></section>;
  // Address fields: open under a divider until a place is chosen, then behind "Edit address details".
  const manualFields=<>
                <div className="grid gap-5 py-3">
                  {manualVisible?<DeliveryPinPicker value={coordinates} geolocate={false} locale={locale} disabled={working||locating||!!attempt} onChange={point=>{setManualOpen(true);setCoordinates(point);setMaplink(point?`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`:'');setReviewed(null);}} onAddress={address=>{setDelivery({address:address.address,emirate:address.emirate,city:address.city});setReviewed(null);}} />:null}
                  {maplink?<div className="checkout-pin-meta"><a href={maplink} target="_blank" rel="noopener noreferrer" aria-label={t(locale,'checkoutCheckPinAria')}>{t(locale,'checkoutViewPin')}</a>{!coordinates?<button type="button" onClick={()=>{setMaplink('');setCoordinates(null);say(t(locale,'checkoutPinRemoved'));setReviewed(null);}}>{t(locale,'checkoutRemovePin')}</button>:null}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{t(locale,'checkoutOsmCredit')}</a></div>:null}
                  <div className="checkout-address-grid grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor={fieldIds.emirate}>{labels.emirate}</FieldLabel><NativeSelect id={fieldIds.emirate} name="emirate" value={delivery.emirate} disabled={locating} onChange={event=>editDelivery('emirate',event.target.value)} required autoComplete="address-level1" {...fieldState('emirate')}>{emirates.map(value=><option key={value} value={value}>{emirateLabel(locale,value)}</option>)}</NativeSelect>{fieldIssue('emirate')}</Field>
                    <Field><FieldLabel htmlFor={fieldIds.city}>{labels.city}</FieldLabel><Input id={fieldIds.city} name="city" value={delivery.city} disabled={locating} onChange={event=>editDelivery('city',event.target.value)} required maxLength={200} autoComplete="address-level2" placeholder={t(locale,'checkoutCityPlaceholder')} {...fieldState('city')}/>{fieldIssue('city')}</Field>
                    <Field className="col-span-2"><FieldLabel htmlFor={fieldIds.address}>{labels.address}</FieldLabel><Input id={fieldIds.address} name="address" value={delivery.address} disabled={locating} onChange={event=>editDelivery('address',event.target.value)} required maxLength={1000} autoComplete="street-address" placeholder={t(locale,'checkoutStreetPlaceholder')} {...fieldState('address')}/>{fieldIssue('address')}</Field></div>
                </div></>;
  return <section className="checkout-flow" data-stage={stage} data-keyboard={keyboardOpen} aria-label={t(locale,'checkoutPlaceOrderAria')}>
    <div className="checkout-topbar"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium" href="/cart" aria-label={ar?'العودة إلى السلة':'Back to cart'}><ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true"/><span className="hidden sm:inline">{ar?'العودة إلى السلة':'Back to cart'}</span></Link><h1 className="m-0 text-xl font-semibold sm:text-2xl">{t(locale,'checkoutTitle')}</h1><SecureCheckoutLabel locale={locale}/></div>
    <CheckoutProgress stage={stage} locale={locale}/>
    {stage==='details'?<section className="pf-card pf-narrow-only mb-4" aria-labelledby="pf-order-heading"><h2 id="pf-order-heading" className="pf-card-title">{ar?'طلبك':'Your order'}<span className="pf-muted font-normal">{basketCount?itemCountText(locale,basketCount,'item'):''}</span><Link href="/cart" className="pf-link-button inline-flex items-center">{ar?'تعديل':'Edit'}</Link></h2>
      <ul className="pf-lines m-0 list-none p-0">{!basketReady?Array.from({length:pendingLines},(_,index)=><li key={index} className="pf-line" aria-hidden="true"><span className="pf-thumb skeleton"/><span className="skeleton skeleton-line m-0 w-3/4"/></li>):null}{basket.map(item=><li key={item.id} className="pf-line">
        <span className="pf-thumb"><ProductImage locale={locale} src={item.image} alt="" width={64} height={64} sizes="64px" className="size-full object-contain p-1"/></span>
        <span className="min-w-0"><span className="pf-line-name block">{item.name}</span>{item.variantLabel?<span className="pf-muted block">{item.variantLabel}</span>:null}<span className="pf-muted block">{tf(locale,'checkoutQty',{count:item.quantity})}</span></span>
        {item.price!==null?<span className="pf-line-total">{amount(Math.round(item.price*item.quantity*100))}</span>:null}</li>)}</ul>
      {!basketReady?<div className="pf-bill" aria-hidden="true"><span className="skeleton skeleton-line m-0"/><span className="skeleton skeleton-line m-0"/></div>:null}{itemsEstimateMinor!==null?<dl className="pf-bill"><dt>{ar?'إجمالي المنتجات':'Item total'}</dt><dd>{amount(itemsEstimateMinor)}</dd><dt>{t(locale,'checkoutDelivery')}</dt><dd className="pf-muted">{ar?'عند المراجعة':'Shown at review'}</dd></dl>:null}
    </section>:null}
    <div className="checkout-grid grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      <form id="checkout-details" ref={form} noValidate aria-busy={working} onSubmit={review} onBlurCapture={event=>validateField(event.target)} onChange={()=>{if(!attempt)setReviewed(null);}} className="checkout-form min-w-0 rounded-2xl lg:border">
        {error?<div ref={feedback} tabIndex={-1} role="alert" className="checkout-notice outline-none"><ExclamationTriangleIcon className="size-5 shrink-0" aria-hidden="true"/><span>{error}</span></div>:null}
        <fieldset disabled={working||!!attempt} className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{t(locale,'checkoutLegend')}</legend>
          <div className="checkout-details-stage">
            <div className="checkout-form-heading px-1 pb-5 lg:px-7 lg:pt-7"><h2 ref={stage==='details'?stepHeading:undefined} tabIndex={-1} className="mb-2 scroll-mt-24 text-xl font-semibold outline-none">{t(locale,'checkoutContactDeliveryTitle')}</h2><p className="sr-only">{ar?'الحقول مطلوبة ما لم يُذكر أنها اختيارية.':'Required unless marked optional.'}</p></div>
            <section className="checkout-form-section" aria-labelledby="delivery-details-heading"><h3 id="delivery-details-heading" className="mb-3 text-base font-semibold">{t(locale,'checkoutDeliveryAddress')}</h3>
              {savedAddresses.length?<div className="pf-saved mb-3" role="group" aria-label={t(locale,'checkoutSavedAddress')}>{savedAddresses.map(address=><button key={address.id} type="button" className="pf-saved-item" aria-pressed={selectedSaved===address.id} disabled={working||locating||!!attempt} onClick={()=>applySavedAddress(address.id)}><strong>{address.label}{address.isDefault?` · ${t(locale,'checkoutDefault')}`:''}</strong><span>{address.city}, {address.address}</span></button>)}</div>:null}
              {hasPlace?<div className="qc-place mb-2"><MapPinIcon className="qc-place-icon" aria-hidden="true"/><div className="qc-place-text"><p className="qc-place-title"><span>{ar?'التوصيل إلى':'Delivering to'}</span> <strong>{pointLabel?labelNames[pointLabel]:delivery.city}</strong></p><p className="qc-place-address">{pointLabel?`${delivery.city} · `:''}{delivery.address}</p></div><button type="button" className="pf-link-button" disabled={working||locating||!!attempt} onClick={()=>window.dispatchEvent(new Event(openDeliveryEvent))}>{ar?'تغيير':'Change'}</button></div>
              :<div className="qc-choices mb-2">
                <button type="button" className="qc-choice" disabled={locating} onClick={locate} aria-busy={locating} aria-label={locating?t(locale,'checkoutLocating'):t(locale,'checkoutUseLocation')}>{locating?<ArrowPathIcon className="qc-choice-icon motion-safe:animate-spin" aria-hidden="true"/>:<CrosshairIcon className="qc-choice-icon" aria-hidden="true"/>}<span className="qc-choice-text"><strong>{locating?t(locale,'checkoutLocating'):t(locale,'checkoutUseLocation')}</strong><small>{ar?'نستخدمه فقط لتعبئة العنوان.':'Only used to fill in your address.'}</small></span><ChevronRightIcon className="qc-choice-chevron rtl:rotate-180" aria-hidden="true"/></button>
                <button type="button" className="qc-choice" disabled={locating||working} onClick={()=>window.dispatchEvent(new Event(openDeliveryEvent))}><MapIcon className="qc-choice-icon" aria-hidden="true"/><span className="qc-choice-text"><strong>{ar?'اختيار على الخريطة':'Choose on map'}</strong><small>{ar?'ابحث عن منطقتك أو حرّك الدبوس.':'Search your area or move the pin.'}</small></span><ChevronRightIcon className="qc-choice-chevron rtl:rotate-180" aria-hidden="true"/></button></div>}
              {locationMessage?<div role="status" data-tone={locationTone} className="checkout-location-status">{locationTone==='success'?<CheckCircleIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true"/>:locationTone==='info'?(locating?<ArrowPathIcon className="mt-0.5 size-5 shrink-0 motion-safe:animate-spin" aria-hidden="true"/>:<Icon name="pin"/>):<ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true"/>}<span className="min-w-0">{locationMessage}{locationTone==='error'?<span className="mt-1 block text-xs">{ar?'يمكنك أيضاً تحديد دبوس على الخريطة أدناه أو كتابة عنوانك.':'You can also drop a pin on the map below or type your address.'}</span>:null}{locationGuidance?<ol className="m-0 mt-2 grid list-decimal gap-1 ps-5 text-[13px] leading-5">{locationGuidance.steps.map(step=><li key={step}>{step}</li>)}</ol>:null}</span></div>:null}
              <input type="hidden" name="maplink" value={maplink}/>
              {!hasPlace?<div className="checkout-manual mb-5"><p className="checkout-or" aria-hidden="true"><span />{ar?'أو اكتب العنوان':'or type the address'}<span /></p>{manualFields}</div>:null}
              <div className="grid grid-cols-2 gap-4">
                <Field><FieldLabel htmlFor="checkout-form-field-8">{t(locale,'checkoutBuilding')}</FieldLabel><Input id="checkout-form-field-8" name="buildingname" defaultValue={attempt?.customer.buildingname} maxLength={200} autoComplete="address-line2" placeholder={t(locale,'checkoutBuildingPlaceholder')}/></Field>
                <Field><FieldLabel htmlFor="checkout-form-field-9">{t(locale,'checkoutFlat')}</FieldLabel><Input id="checkout-form-field-9" name="flatno" defaultValue={attempt?.customer.flatno} maxLength={200} placeholder={t(locale,'checkoutFlatPlaceholder')}/></Field>
                <Field className="col-span-2"><FieldLabel htmlFor="checkout-form-field-10">{t(locale,'checkoutNote')}</FieldLabel><Input id="checkout-form-field-10" name="note" defaultValue={attempt?.customer.note} maxLength={1000} placeholder={t(locale,'checkoutNotePlaceholder')}/></Field>
              </div>
              {hasPlace?<details className="checkout-optional mt-4" open={manualVisible}><summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium" onClick={event=>{event.preventDefault();if(hasPlace&&!addressErrors)setManualOpen(value=>!value);}}>{hasPlace?(ar?'تعديل تفاصيل العنوان':'Edit address details'):(ar?'أدخل العنوان يدوياً':'Enter address manually')}<ChevronDownIcon className="size-4" aria-hidden="true"/></summary>{manualFields}</details>:null}
            </section>
            <section className="checkout-form-section" aria-labelledby="contact-details-heading"><h3 id="contact-details-heading" className="mb-3 text-base font-semibold">{t(locale,'checkoutContactDetails')}</h3>
              {showContactRow?<div className="pf-contact"><span className="pf-icon" aria-hidden="true"><UserCircleIcon className="size-5"/></span><div className="pf-contact-text"><strong>{contact.name}</strong><span className="pf-muted block">{contact.mobile} · {contact.email}</span></div><button type="button" className="pf-link-button" disabled={working||!!attempt} onClick={()=>setContactEditing(true)}>{ar?'تعديل':'Edit'}</button></div>:null}
              <div className={showContactRow?'hidden':'grid gap-5 sm:grid-cols-2'}>
                <Field><FieldLabel htmlFor={fieldIds.name}>{labels.name}</FieldLabel><Input id={fieldIds.name} name="name" defaultValue={attempt?.customer.name} required maxLength={200} autoComplete="name" placeholder={t(locale,'checkoutNamePlaceholder')} {...fieldState('name')}/>{fieldIssue('name')}</Field>
                <Field><FieldLabel htmlFor={fieldIds.mobile}>{labels.mobile}</FieldLabel><Input id={fieldIds.mobile} name="mobile" defaultValue={attempt?.customer.mobile} required type="tel" inputMode="tel" pattern="\+?[0-9]{9,15}" autoComplete="tel" maxLength={32} placeholder={t(locale,'checkoutMobilePlaceholder')} {...fieldState('mobile')}/>{fieldIssue('mobile')}</Field>
                <Field className="sm:col-span-2"><FieldLabel htmlFor={fieldIds.email}>{labels.email}</FieldLabel><Input id={fieldIds.email} name="email" defaultValue={attempt?.customer.email} required type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" maxLength={254} autoComplete="email" placeholder={t(locale,'checkoutEmailPlaceholder')} {...fieldState('email')}/>{fieldIssue('email')}</Field>
                {account&&contactEditing?<div className="sm:col-span-2"><Button type="button" variant="outline" onClick={()=>{readContact();setContactEditing(false);}}>{ar?'تم':'Done'}</Button></div>:null}
              </div>
              {accountChecked&&!account?<p className="pf-muted mt-3"><Link className="font-bold text-ink underline underline-offset-4" href="/account">{ar?'سجّل الدخول':'Sign in'}</Link> {ar?'لاستخدام تفاصيلك وعناوينك المحفوظة وإتمام الطلب أسرع.':'to use your saved details and addresses and check out faster.'}</p>:null}
              {stage === 'details' && couponCode && couponField}
            </section>
          </div>
          <div className="checkout-payment-stage">
            <div className="mb-5 flex items-center justify-between gap-3 lg:hidden"><h2 ref={stage==='payment'?stepHeading:undefined} tabIndex={-1} className="m-0 scroll-mt-24 text-xl font-semibold outline-none">{ar?'المراجعة والدفع':'Review & payment'}</h2><button type="button" disabled={working||!!attempt} className="pf-link-button" onClick={()=>focusDetails()}>{ar?'رجوع':'Back'}</button></div>
            {deliveryCustomer?<div className="qc-place mb-4 lg:hidden"><MapPinIcon className="qc-place-icon" aria-hidden="true"/><div className="qc-place-text"><p className="qc-place-title"><span>{ar?'التوصيل إلى':'Delivering to'}</span> <strong>{deliveryCustomer.name}</strong></p><p className="qc-place-address">{deliveryCustomer.address}, {deliveryCustomer.city}, {emirateLabel(locale,deliveryCustomer.emirate)}</p></div><button type="button" disabled={working||!!attempt} className="pf-link-button" onClick={()=>focusDetails()}>{ar?'تغيير':'Change'}</button></div>:null}
            <section className="checkout-payment-section" aria-labelledby="payment-details-heading"><h3 className="sr-only" id="payment-details-heading">{t(locale,'checkoutPayment')}</h3><PaymentChoices locale={locale} value={selectedPayment} online={stripeOptionVisible} testMode={stripeTestMode} legacyCard={attempt?.customer.payment==='card'} onChange={changePayment}/>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5"><LockClosedIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>{selectedPayment==='stripe'?(stripeTestMode?(ar?'استخدم بطاقة اختبار؛ لن يتم تحصيل أموال حقيقية.':'Use a test card; no money will be charged.'):(ar?'ستنتقل إلى صفحة آمنة لإتمام الدفع. قد يطلب مصرفك تأكيد العملية.':'You’ll continue to a secure payment page. Your bank may ask you to verify the payment.')):t(locale,'checkoutPayWhenArrives')}</p>
              {stage === 'payment' && couponField}
              {selectedPayment!=='stripe'&&!couponCode?<details className="checkout-optional mt-5"><summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium">{ar?'هل لديك قسيمة مكافآت؟':'Have a reward voucher?'}<ChevronDownIcon className="size-4" aria-hidden="true"/></summary><Field className="py-3"><FieldLabel htmlFor="checkout-form-field-12">{t(locale,'checkoutVoucher')}</FieldLabel><div className="flex gap-2"><Input id="checkout-form-field-12" value={voucherCode} maxLength={27} placeholder="AM-…" onChange={event=>setVoucherCode(event.target.value.toUpperCase())} autoComplete="off"/><Button type="submit" variant="outline" disabled={working||!!attempt}>{ar?'تطبيق':'Apply'}</Button></div><FieldDescription>{t(locale,'checkoutVoucherHint')}</FieldDescription></Field></details>:null}
            </section>
          </div>
        </fieldset>
        <div className="checkout-details-help px-5 pb-4 lg:hidden"><Link className="inline-flex min-h-11 items-center text-sm font-medium" href="/contact">{ar?'تحتاج مساعدة؟':'Need help with your order?'}</Link></div>
      </form>
      <aside className={`checkout-order-panel min-w-0 rounded-2xl  p-5 lg:sticky lg:top-6 lg:p-6 ${stage==='details'?'hidden lg:block':''}`} aria-labelledby="checkout-summary">
        <div className="mb-2 flex items-center justify-between gap-3"><h2 ref={summary} tabIndex={-1} className="m-0 scroll-mt-24 text-lg font-semibold outline-none" id="checkout-summary">{t(locale,'checkoutOrderSummary')}</h2><button type="button" aria-expanded={orderExpanded} aria-controls="checkout-order-items" className="pf-link-button inline-flex items-center gap-1 lg:hidden" onClick={()=>setOrderExpanded(value=>!value)}>{orderExpanded?(ar?'إخفاء':'Hide'):(ar?'عرض التفاصيل':'Details')}<ChevronDownIcon className="size-4" aria-hidden="true"/></button><Link href="/cart" className="hidden min-h-11 items-center text-sm font-medium lg:inline-flex">{ar?'تعديل':'Edit'}</Link></div>
        <div id="checkout-order-items" className={orderExpanded?'':'hidden lg:block'}>{total?<ul className="m-0 list-none p-0">{total.lines.map(line=><li key={line.productId} className="flex items-start gap-3 border-b py-4"><ProductImage locale={locale} src={basket.find(item=>item.id===line.productId)?.image??'/product-placeholder.svg'} alt="" width={56} height={56} sizes="56px" className="size-14 shrink-0 rounded-lg object-contain"/><span className="min-w-0 flex-1 text-sm font-medium leading-5">{line.name}{line.variantLabel?<span className="block text-xs">{line.variantLabel}</span>:null}<span className="mt-1 block text-xs font-normal">{tf(locale,'checkoutQty',{count:line.quantity})}</span></span><strong className="shrink-0 text-sm tabular-nums">{amount(line.lineTotalMinor)}</strong></li>)}</ul>:basketLines()}</div>
        {total?.delivery?<p className="my-3 text-sm">{ar?'وقت التوصيل التقديري':'Estimated delivery'}: {total.delivery.estimatedMinutes} {ar?'دقيقة':'minutes'} · {total.delivery.branchName}</p>:null}
        {total?<dl className="my-5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 text-sm tabular-nums"><dt>{t(locale,'checkoutItems')}</dt><dd className="m-0 text-end">{amount(total.subtotalMinor)}</dd>{total.coupon && <><dt>{ar ? 'خصم الرمز' : 'Coupon discount'} <bdi dir="ltr">({total.coupon.code})</bdi></dt><dd className="m-0 text-end">−{amount(total.coupon.discountMinor)}</dd></>}{total.voucher?<><dt>{t(locale,'checkoutRewardVoucher')}</dt><dd className="m-0 text-end">−{amount(total.voucher.discountMinor)}</dd></>:null}<dt>{t(locale,'checkoutDelivery')}</dt><dd className="m-0 text-end">{amount(total.deliveryFeeMinor)}</dd><dt>{total.vatMode==='inclusive'?t(locale,'checkoutVatIncluded'):t(locale,'checkoutVat')}</dt><dd className="m-0 text-end">{amount(total.taxMinor)}</dd><dt className="border-t pt-4 text-lg font-semibold">{t(locale,'checkoutTotal')}</dt><dd className="m-0 border-t pt-4 text-end text-lg font-semibold">{amount(total.totalMinor)}</dd></dl>:<p className="my-5 min-h-18 text-sm leading-6" role="status">{working?t(locale,'checkoutChecking'):basketError|| (ar?'أضف تفاصيل التوصيل لتأكيد الإجمالي ورسوم التوصيل.':'Add your delivery details to confirm the total and delivery charge.')}</p>}
        <div className="hidden lg:block">{primaryAction('w-full min-h-12') }<p className="mt-3 text-center text-xs leading-5">{t(locale,'checkoutFinalTotalNote')}</p></div>
        {attempt?<p role="status" className="mt-4 text-sm leading-6">{t(locale,'checkoutPendingNotice')}</p>:null}
        <div className="mt-5 flex flex-wrap gap-x-4 border-t pt-3 text-xs"><Link className="inline-flex min-h-11 items-center" href="/shipping">{ar?'التوصيل':'Delivery'}</Link><Link className="inline-flex min-h-11 items-center" href="/privacy">{ar?'الخصوصية':'Privacy'}</Link><Link className="inline-flex min-h-11 items-center" href="/returns">{ar?'الإرجاع':'Returns'}</Link><Link className="inline-flex min-h-11 items-center" href="/contact">{ar?'تحتاج مساعدة؟':'Need help?'}</Link></div>
      </aside>
    </div>
    <div className="checkout-mobile-action lg:hidden"><div className="pf-bar"><span className="pf-bar-total"><small>{total?t(locale,'checkoutTotal'):(ar?'إجمالي المنتجات':'Item total')}</small><strong>{total?amount(total.totalMinor):(itemsEstimateMinor!==null?amount(itemsEstimateMinor):'—')}</strong></span>{primaryAction('w-full min-h-12')}</div><p className="mt-2 mb-0 text-center text-xs leading-5">{stage==='details'?(ar?'تُضاف رسوم التوصيل عند المراجعة.':'Delivery is added when you review your order.'):t(locale,'checkoutFinalTotalNote')}</p></div>
  </section>;
}
