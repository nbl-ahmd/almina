import type { PharmacyProfile } from '@almina/contracts';
import { businessContact } from '../policies';

/** The WhatsApp chat link: the number staff verified under Pharmacy details, otherwise the pharmacy's published number. */
export function whatsappLink(profile: Pick<PharmacyProfile, 'verified' | 'whatsapp'> | null, text: string): string {
  const published = new URL(businessContact.whatsapp);
  const phone = profile?.verified && profile.whatsapp ? profile.whatsapp : published.searchParams.get('phone')!;
  return `https://wa.me/${phone}?${new URLSearchParams({ text })}`;
}

/** What a shopper sends to share a product. The address is the product's canonical one, without tracking or query strings. */
export function shareTargets(name: string, url: string) {
  return { whatsapp: `https://wa.me/?${new URLSearchParams({ text: `${name}\n${url}` })}`, email: `mailto:?${new URLSearchParams({ subject: name, body: url }).toString().replace(/\+/g, '%20')}` };
}
