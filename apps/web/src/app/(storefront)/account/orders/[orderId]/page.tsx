import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AccountLanguage } from '../../../../../components/account-locale';
import { OrderDetailScreen } from '../../../../../components/account/order-detail';
import { getLocale } from '../../../../../lib/server/i18n';
import { getWebEnvironment } from '../../../../../lib/server/env';

export async function generateMetadata() { return { title: await getLocale() === 'ar' ? 'تفاصيل الطلب' : 'Order details', robots: { index: false, follow: false } }; }
export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!/^[A-Za-z0-9-]{1,40}$/.test(orderId)) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  // The order is read in the browser with the shopper's own session; the address bar carries only the order number.
  return <div className="account-page"><AccountLanguage locale={await getLocale()}><OrderDetailScreen orderId={orderId} nonce={nonce} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} /></AccountLanguage></div>;
}
