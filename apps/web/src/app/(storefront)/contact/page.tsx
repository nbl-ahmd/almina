import { getLocale } from '../../../lib/server/i18n';
import { StorefrontInformation } from '../../../components/storefront-information';
import { Button } from '../../../components/ui/button';
import { Icon } from '../../../components/icon';
import styles from '../../../components/storefront-information.module.css';
import { StorefrontIntro } from '../../../components/storefront-intro';
import Link from '../../../components/app-link';
import { Breadcrumb } from '../../../components/storefront';
import { metadataFor } from '../../../lib/server/seo';
import type { Query } from '../../../lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor('Contact Al Mina Pharmacy', 'Contact Al Mina Pharmacy in Ras Al Khaimah for product, delivery and order enquiries.', '/contact', await searchParams);
}
export default async function ContactPage() {
  const locale = await getLocale();
  const text = (en: string, ar: string) => locale === 'ar' ? ar : en;

  return <StorefrontInformation locale={locale}>
    <Breadcrumb title={text('Contact us', 'تواصل معنا')} />
    <StorefrontIntro title={text('Let’s talk care.', 'تواصل مع صيدلية الميناء')}
      description={text('For product, delivery or order enquiries, contact Al Mina Pharmacy in Ras Al Khaimah.', 'للاستفسار عن المنتجات أو التوصيل أو الطلبات، تواصل مع صيدلية الميناء في رأس الخيمة.')} />
    <div className="grid gap-4 md:grid-cols-2">
      <section className={styles.panel} aria-labelledby="contact-channels">
        <h2 id="contact-channels">{text('Call or email', 'اتصل بنا أو راسلنا')}</h2>
        <address className="mb-4 grid justify-items-start not-italic">
          <a className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline" href="tel:+971504825007">
            <Icon name="phone" /><bdi>+971 50 482 5007</bdi>
          </a>
          <a className="inline-flex min-h-11 items-center text-sm font-semibold underline" href="mailto:info@alminapharmacy.com">
            <bdi>info@alminapharmacy.com</bdi>
          </a>
          <span className="mt-2 text-sm text-muted">{text('Ras Al Khaimah, United Arab Emirates', 'رأس الخيمة، الإمارات العربية المتحدة')}</span>
        </address>
        <p className="m-0 max-w-prose text-sm text-muted">{text('Please do not include medical records or payment details in an email.', 'يرجى عدم إرسال السجلات الطبية أو بيانات الدفع عبر البريد الإلكتروني.')}</p>
      </section>
      <section id="delivery" className={styles.panel} aria-labelledby="contact-delivery">
        <h2 id="contact-delivery">{text('Delivery enquiries', 'استفسارات التوصيل')}</h2>
        <p className="max-w-prose text-sm text-muted">{text('Contact the pharmacy to check delivery to your area. Checkout confirms the delivery charge and final AED total before you place an order.', 'تواصل مع الصيدلية للتحقق من التوصيل إلى منطقتك. يمكنك مراجعة رسوم التوصيل والإجمالي بالدرهم قبل تأكيد الطلب.')}</p>
        <p className="max-w-prose text-sm text-muted">{text('Ordering may be unavailable while the store is closed.', 'قد يتعذّر تقديم الطلبات أثناء إغلاق الصيدلية.')}</p>
        <Button asChild variant="outline" size="sm"><Link href="/cart">{text('Review your cart', 'راجع سلتك')}<Icon name="arrow" /></Link></Button>
      </section>
    </div>
  </StorefrontInformation>;
}
