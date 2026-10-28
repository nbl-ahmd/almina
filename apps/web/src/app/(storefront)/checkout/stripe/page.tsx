import {notFound} from 'next/navigation';
import {StripeReturn} from '../../../../components/stripe-return';
import {getWebEnvironment} from '../../../../lib/server/env';
import {getLocale} from '../../../../lib/server/i18n';
export const metadata={title:'Payment confirmation',robots:{index:false,follow:false}};
export default async function StripeReturnPage({searchParams}:{searchParams:Promise<{result?:string}>}){
  if(!getWebEnvironment().CHECKOUT_ENABLED||(!getWebEnvironment().STRIPE_TEST_ENABLED&&getWebEnvironment().APP_ENV!=='production'))notFound();
  return <StripeReturn testMode={getWebEnvironment().APP_ENV!=='production'} locale={await getLocale()} cancelled={(await searchParams).result==='cancelled'}/>;
}
