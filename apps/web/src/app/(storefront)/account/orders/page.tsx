import { headers } from 'next/headers';
import { AccountLanguage } from '../../../../components/account-locale';
import { OrdersScreen } from '../../../../components/account/orders-screen';
import { getLocale } from '../../../../lib/server/i18n';
import { getWebEnvironment } from '../../../../lib/server/env';

export async function generateMetadata() { return { title: await getLocale() === 'ar' ? 'طلباتي' : 'My orders', robots: { index: false, follow: false } }; }
export default async function OrdersPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <div className="account-page"><AccountLanguage locale={await getLocale()}><OrdersScreen nonce={nonce} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} /></AccountLanguage></div>;
}
