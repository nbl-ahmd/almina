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
  return metadataFor('About Al Mina Pharmacy', 'Find pharmacy, skincare and everyday care products from Al Mina Pharmacy in Ras Al Khaimah.', '/about', await searchParams);
}
export default async function AboutPage() {
  const locale = await getLocale();
  const text = (en: string, ar: string) => locale === 'ar' ? ar : en;

  return <StorefrontInformation locale={locale}>
    <Breadcrumb title={text('About us', 'عن الصيدلية')} />
    <StorefrontIntro title={text('A little more care for your everyday.', 'عن صيدلية الميناء')}
      description={text('Health, skincare and everyday essentials from Al Mina Pharmacy in Ras Al Khaimah, United Arab Emirates.', 'منتجات الصحة والعناية بالبشرة والمستلزمات اليومية من صيدلية الميناء في رأس الخيمة، الإمارات العربية المتحدة.')} />
    <div className="grid gap-4 md:grid-cols-2">
      <section className={styles.panel}>
        <h2>{text('Find what you need', 'اعثر على ما تحتاجه')}</h2>
        <p className="max-w-prose text-sm text-muted">{text('Search by product name or browse our categories. Product pages show the current catalogue price in AED and available stock.', 'ابحث باسم المنتج أو تصفّح الفئات. تعرض صفحات المنتجات السعر الحالي بالدرهم وحالة التوفر.')}</p>
        <Button asChild size="sm"><Link href="/products">{text('Browse products', 'تصفّح المنتجات')}<Icon name="arrow" /></Link></Button>
      </section>
      <section className={styles.panel}>
        <h2>{text('Help with your order', 'مساعدة بشأن طلبك')}</h2>
        <p className="max-w-prose text-sm text-muted">{text('Contact the pharmacy for product or order enquiries. Availability and delivery charges are checked again when you review your order.', 'تواصل مع الصيدلية للاستفسار عن المنتجات أو الطلبات. يُعاد التحقق من التوفر ورسوم التوصيل عند مراجعة طلبك.')}</p>
        <Button asChild variant="outline" size="sm"><Link href="/contact">{text('Contact the pharmacy', 'تواصل مع الصيدلية')}</Link></Button>
      </section>
    </div>
  </StorefrontInformation>;
}
