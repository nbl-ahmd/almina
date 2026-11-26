import { getLocale } from '../lib/server/i18n';
import { getPharmacyProfile } from '../lib/server/growth';
import { whatsappLink } from '../lib/storefront/contact';
import { WhatsAppIcon } from './storefront-icons';

/** Floating "chat on WhatsApp" link for the homepage. A plain link: no script, and it works when the profile cannot be read. */
export async function WhatsAppButton() {
  const [locale, profile] = await Promise.all([getLocale(), getPharmacyProfile().catch(() => null)]);
  const ar = locale === 'ar';
  const href = whatsappLink(profile, ar ? 'مرحباً صيدلية المينا! أود الاستفسار عن منتجاتكم.' : "Hi Al Mina Pharmacy! I'd like to make an inquiry about your products.");
  return <a className="qc-whatsapp" href={href} target="_blank" rel="noopener noreferrer" aria-label={ar ? 'تواصل معنا عبر واتساب (يفتح في نافذة جديدة)' : 'Chat with us on WhatsApp (opens in a new tab)'}>
    <WhatsAppIcon weight="fill" aria-hidden="true" />
  </a>;
}
