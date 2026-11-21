import styles from '../../../components/storefront-information.module.css';
import { StorefrontInformation } from '../../../components/storefront-information';
import { AccountLanguage } from '../../../components/account-locale';
import { getLocale } from '../../../lib/server/i18n';
import { UnsubscribeReminder } from '../../../components/customer-reminders';
export const metadata = { title: 'Cancel reminder', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const locale=await getLocale();
  const { token } = await searchParams;
  return <StorefrontInformation locale={locale}>{token && /^[A-Za-z0-9_-]{43}$/.test(token) ? <AccountLanguage locale={locale}><UnsubscribeReminder token={token} /></AccountLanguage> : <section className={`${styles.panel} ${styles.state} mx-auto`}><h1 className="text-2xl">{locale==='ar'?'رابط التذكير غير متاح':'Reminder link unavailable'}</h1><p>{locale==='ar'?'استخدم الرابط في رسالة التذكير، أو أدر التذكيرات من حسابك.':'Use the link in your reminder email, or manage reminders in your account.'}</p></section>}</StorefrontInformation>;
}
