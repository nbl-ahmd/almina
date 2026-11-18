import {headers} from 'next/headers';
import {googleCommerceConfiguration} from '../../../../lib/google/commerce';
import {notFound} from 'next/navigation';
import { CheckoutFrame } from '../../../../components/checkout-frame';
import {StripeReturn} from '../../../../components/stripe-return';
import {getWebEnvironment} from '../../../../lib/server/env';
import {getLocale} from '../../../../lib/server/i18n';
export const metadata={title:'Payment confirmation',robots:{index:false,follow:false}};
export default async function StripeReturnPage({searchParams}:{searchParams:Promise<{result?:string}>}){
  if(!getWebEnvironment().CHECKOUT_ENABLED||(!getWebEnvironment().STRIPE_TEST_ENABLED&&getWebEnvironment().APP_ENV!=='production'))notFound();
  const locale = await getLocale();
  return <CheckoutFrame locale={locale}><StripeReturn googleReviews={googleCommerceConfiguration(process.env)} nonce={(await headers()).get('x-nonce')??undefined} testMode={getWebEnvironment().APP_ENV!=='production'} locale={locale} cancelled={(await searchParams).result==='cancelled'}/></CheckoutFrame>;
}
