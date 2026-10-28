import {notFound} from 'next/navigation';
import {StripeReturn} from '../../../../components/stripe-return';
import {getWebEnvironment} from '../../../../lib/server/env';
import {getLocale} from '../../../../lib/server/i18n';
export const metadata={title:'Stripe test checkout',robots:{index:false,follow:false}};
export default async function StripeReturnPage({searchParams}:{searchParams:Promise<{result?:string}>}){
  if(!getWebEnvironment().STRIPE_TEST_ENABLED)notFound();
  return <StripeReturn locale={await getLocale()} cancelled={(await searchParams).result==='cancelled'}/>;
}
