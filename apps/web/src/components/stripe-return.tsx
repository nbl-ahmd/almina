'use client';
import {GoogleCustomerReviews} from './google-customer-reviews';
import type {GoogleCommerceConfiguration, ReviewReceipt} from '../lib/google/commerce';
import {reconcilePaidCart} from '../lib/payments/paid-cart';
import {useEffect,useState} from 'react';
import {stripeCheckoutDtoSchema,checkoutInputSchema} from '@almina/contracts';
import type {z} from 'zod';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from './ui/button';
import type {Locale} from '../lib/i18n';
const pendingKey='almina.checkout.pending.v1';
type Payment=z.infer<typeof stripeCheckoutDtoSchema>;
export function StripeReturn({locale,cancelled,testMode=true,googleReviews,nonce}:{locale:Locale;cancelled:boolean;testMode?:boolean;googleReviews?:GoogleCommerceConfiguration;nonce?:string | undefined}){
  const router=useRouter();
  const ar=locale==='ar';
  const [reviewReceipt,setReviewReceipt]=useState<ReviewReceipt|null>(null);
  const [payment,setPayment]=useState<Payment|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false);
  async function refresh(cancel=false){
    setWorking(true);setError('');
    try{
      const pending=checkoutInputSchema.parse(JSON.parse(sessionStorage.getItem(pendingKey)??'null'));
      if(pending.customer.payment!=='stripe')throw new Error('No test checkout');
      const response=await fetch('/api/checkout/stripe/'+(cancel?'cancel':'status'),{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({idempotencyKey:pending.idempotencyKey})});
      if(!response.ok)throw new Error('Unavailable');
      const confirmed=stripeCheckoutDtoSchema.parse(await response.json());
      if(!confirmed.testMode&&confirmed.paymentReceived){try{await reconcilePaidCart(confirmed.orderId,confirmed.totals.lines);}catch{/* Payment success is durable even if browser cart storage fails. */}}
      if (!confirmed.testMode && confirmed.state==='paid' && confirmed.paymentReceived && confirmed.createdAt) setReviewReceipt({orderId:confirmed.orderId,email:pending.customer.email,createdAt:confirmed.createdAt,deliveryCountry:'AE'}); else setReviewReceipt(null);
      setPayment(confirmed);
    }catch{setError(ar?'تعذر التحقق من الدفع. أعد المحاولة من المتصفح الذي بدأت منه.':'We could not verify this payment. Retry in the browser where you started checkout.');}
    finally{setWorking(false);}
  }
  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)void refresh(cancelled);});return()=>{active=false;};},[cancelled]); // eslint-disable-line react-hooks/exhaustive-deps
  const isTest=payment?.testMode??testMode;
  const message=payment?.state==='paid'?(isTest?(ar?'نجح الدفع التجريبي':'Test payment successful'):(ar?'تم استلام الدفع':'Payment received')):payment?.state==='expired'?(isTest?(ar?'انتهى الدفع التجريبي وأُعيد المخزون':'Test checkout ended — stock released'):(ar?'تم إلغاء الدفع':'Checkout cancelled')):payment?.state==='refunded'?(isTest?(ar?'تم رد المبلغ التجريبي وأُعيد المخزون':'Test payment refunded — stock released'):(ar?'تم رد المبلغ':'Payment refunded')):['refund_pending','partially_refunded','disputed'].includes(payment?.state??'')?(ar?'الطلب قيد مراجعة الدفع':'Payment review in progress'):(ar?'في انتظار تأكيد الدفع':'Waiting for payment confirmation');
  return <><GoogleCustomerReviews config={googleReviews??{merchantId:5884188879,deliveryBusinessDays:6,survey:false,widget:false}} receipt={reviewReceipt} nonce={nonce} locale={locale}/><section className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-5 sm:p-8" aria-labelledby="stripe-title">
    <p className="mb-3 text-xs font-semibold text-teal">{isTest?(ar?'Stripe · وضع الاختبار':'Stripe · Test mode'):(ar?'دفع آمن عبر Stripe':'Secure payment by Stripe')}</p>
    <h1 id="stripe-title" aria-live="polite" className="mb-3 text-2xl">{message}</h1>
    <p className="text-sm text-muted">{isTest?(ar?'لا تُحصّل أموال حقيقية ولا يتم توصيل طلب تجريبي. تبقى سلة التسوق محفوظة.':'No real money is collected and no test order will be delivered. Your shopping basket is kept.'):(payment?.state==='paid'?(ar?'تم استلام طلبك. سيتواصل معك فريق الصيدلية بشأن التوصيل.':'Your order has been received. Our pharmacy team will contact you about delivery.'):ar?'يمكنك التواصل مع الصيدلية لمتابعة طلبك. لا تعِد الدفع إذا كانت حالته غير مؤكدة.':'Contact the pharmacy about your order. Please do not pay again while its status is uncertain.')}</p>
    {payment?<p className="text-sm">{isTest?(ar?'مرجع الاختبار: ':'Test reference: '):(ar?'رقم الطلب: ':'Order number: ')}<strong>{payment.orderId}</strong></p>:null}
    {payment&&!isTest?<p className="text-sm font-semibold">{new Intl.NumberFormat(ar?'ar-AE':'en-AE',{style:'currency',currency:'AED'}).format(payment.totals.totalMinor/100)}</p>:null}
    {working?<p role="status" className="text-sm">{ar?'جارٍ التحقق…':'Checking with Stripe…'}</p>:null}
    {error?<p role="alert" className="text-sm text-danger">{error}</p>:null}
    <div className="mt-5 flex flex-wrap gap-3">
      {!payment||payment.state==='awaiting_payment'?<>
        {payment?.checkoutUrl?<a className="button" href={payment.checkoutUrl}>{isTest?(ar?'متابعة الدفع التجريبي':'Resume test payment'):(ar?'متابعة الدفع الآمن':'Resume secure payment')}</a>:null}
        <Button variant="outline" disabled={working} onClick={()=>{void refresh();}}>{ar?'التحقق مجدداً':'Check payment status'}</Button>
        {payment?<Button variant="outline" disabled={working} onClick={()=>{void refresh(true);}}>{isTest?(ar?'إلغاء الاختبار':'Cancel test checkout'):(ar?'إلغاء الدفع':'Cancel checkout')}</Button>:null}
      </>:<Button onClick={()=>{try{sessionStorage.removeItem(pendingKey);}catch{/* Retrying the original key remains safe. */}router.push(isTest?'/checkout':'/products');}}>{isTest?(ar?'العودة للدفع':'Back to checkout'):(ar?'متابعة التسوق':'Continue shopping')}</Button>}
      {!isTest?<Link className="button button-secondary" href="/contact">{ar?'تواصل مع الصيدلية':'Contact pharmacy'}</Link>:null}
      {error?<Link className="button button-secondary" href="/checkout">{ar?'العودة للدفع':'Back to checkout'}</Link>:null}
    </div>
  </section></>;
}
