import { AccountLanguage } from '../../../components/account-locale';
import { getLocale } from '../../../lib/server/i18n';
import { headers } from 'next/headers';
import { CustomerAccount } from '../../../components/customer-account';
export async function generateMetadata(){return {title:await getLocale()==='ar'?'حسابك':'Your account',robots:{index:false,follow:false}};}
export default async function AccountPage(){const nonce=(await headers()).get('x-nonce')??undefined;return <div className="account-page"><AccountLanguage locale={await getLocale()}><CustomerAccount nonce={nonce} /></AccountLanguage></div>;}
