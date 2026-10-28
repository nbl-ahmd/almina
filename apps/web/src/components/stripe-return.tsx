'use client';
import {useEffect,useState} from 'react';
import {stripeCheckoutDtoSchema,checkoutInputSchema} from '@almina/contracts';
import type {z} from 'zod';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Button} from './ui/button';
import type {Locale} from '../lib/i18n';
const pendingKey='almina.checkout.pending.v1';
type Payment=z.infer<typeof stripeCheckoutDtoSchema>;
export function StripeReturn({locale,cancelled}:{locale:Locale;cancelled:boolean}){
  const router=useRouter();
  const ar=locale==='ar';
  const [payment,setPayment]=useState<Payment|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false);
  async function refresh(cancel=false){
    setWorking(true);setError('');
    try{
      const pending=checkoutInputSchema.parse(JSON.parse(sessionStorage.getItem(pendingKey)??'null'));
      if(pending.customer.payment!=='stripe')throw new Error('No test checkout');
      const response=await fetch('/api/checkout/stripe/'+(cancel?'cancel':'status'),{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({idempotencyKey:pending.idempotencyKey})});
      if(!response.ok)throw new Error('Unavailable');
      setPayment(stripeCheckoutDtoSchema.parse(await response.json()));
    }catch{setError(ar?'تعذر التحقق من الدفع. أعد المحاولة من المتصفح الذي بدأت منه.':'We could not verify this payment. Retry in the browser where you started checkout.');}
    finally{setWorking(false);}
  }
  useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)void refresh(cancelled);});return()=>{active=false;};},[cancelled]); // eslint-disable-line react-hooks/exhaustive-deps
  const message=payment?.state==='paid'?(ar?'نجح الدفع التجريبي':'Test payment successful'):payment?.state==='expired'?(ar?'انتهى الدفع التجريبي وأُعيد المخزون':'Test checkout ended — stock released'):payment?.state==='refunded'?(ar?'تم رد المبلغ التجريبي وأُعيد المخزون':'Test payment refunded — stock released'):(ar?'في انتظار تأكيد الدفع':'Waiting for payment confirmation');
  return <section className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-5 sm:p-8" aria-labelledby="stripe-title">
    <p className="mb-3 text-xs font-semibold text-teal">{ar?'Stripe · وضع الاختبار':'Stripe · Test mode'}</p>
    <h1 id="stripe-title" aria-live="polite" className="mb-3 text-2xl">{message}</h1>
    <p className="text-sm text-muted">{ar?'لا تُحصّل أموال حقيقية ولا يتم توصيل طلب تجريبي. تبقى سلة التسوق محفوظة.':'No real money is collected and no test order will be delivered. Your shopping basket is kept.'}</p>
    {payment?<p className="text-sm">{ar?'مرجع الاختبار: ':'Test reference: '}<strong>{payment.orderId}</strong></p>:null}
    {working?<p role="status" className="text-sm">{ar?'جارٍ التحقق…':'Checking with Stripe…'}</p>:null}
    {error?<p role="alert" className="text-sm text-danger">{error}</p>:null}
    <div className="mt-5 flex flex-wrap gap-3">
      {!payment||payment.state==='awaiting_payment'?<>
        {payment?.checkoutUrl?<a className="button" href={payment.checkoutUrl}>{ar?'متابعة الدفع التجريبي':'Resume test payment'}</a>:null}
        <Button variant="outline" disabled={working} onClick={()=>{void refresh();}}>{ar?'التحقق مجدداً':'Check payment status'}</Button>
        {payment?<Button variant="outline" disabled={working} onClick={()=>{void refresh(true);}}>{ar?'إلغاء الاختبار':'Cancel test checkout'}</Button>:null}
      </>:<Button onClick={()=>{try{sessionStorage.removeItem(pendingKey);}catch{/* Retrying the original key remains safe. */}router.push('/checkout');}}>{ar?'العودة للدفع':'Back to checkout'}</Button>}
      {error?<Link className="button button-secondary" href="/checkout">{ar?'العودة للدفع':'Back to checkout'}</Link>:null}
    </div>
  </section>;
}
