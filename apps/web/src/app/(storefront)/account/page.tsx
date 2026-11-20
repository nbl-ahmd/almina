import { AccountLanguage } from '../../../components/account-locale';
import { getLocale } from '../../../lib/server/i18n';
import { headers } from 'next/headers';
import { CustomerAccount } from '../../../components/customer-account';
import { StorefrontInformation } from '../../../components/storefront-information';

export async function generateMetadata() {
  return { title: await getLocale() === 'ar' ? 'حسابك' : 'Your account', robots: { index: false, follow: false } };
}

export default async function AccountPage() {
  const locale = await getLocale();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <StorefrontInformation locale={locale}>
    <div data-storefront-customer><AccountLanguage locale={locale}><CustomerAccount nonce={nonce} /></AccountLanguage></div>
  </StorefrontInformation>;
}
