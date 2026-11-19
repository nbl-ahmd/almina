import { getLocale } from '../../../lib/server/i18n';
import { StorefrontInformation } from '../../../components/storefront-information';
import { Button } from '../../../components/ui/button';
import { Icon } from '../../../components/icon';
import styles from '../../../components/storefront-information.module.css';
import Link from '../../../components/app-link';
import { growthPagePath } from '@almina/contracts';
import { getGrowthPages } from '../../../lib/server/growth';
import { StorefrontIntro } from '../../../components/storefront-intro';
import { metadataFor } from '../../../lib/server/seo';
export async function generateMetadata(){const {items}=await getGrowthPages('guide');return {...metadataFor('Care & buying guides','Practical product buying guides from Al Mina Pharmacy.','/health-guides',{}),...(!items.length?{robots:{index:false,follow:true}}:{})};}
export default async function GuidesPage() {
  const [locale, { items }] = await Promise.all([getLocale(), getGrowthPages('guide')]);
  const text = (en: string, ar: string) => locale === 'ar' ? ar : en;

  return <StorefrontInformation locale={locale}>
    <StorefrontIntro title={text('A little guidance for everyday care', 'أدلة العناية والتسوّق')}
      description={text('Practical buying guides from Al Mina Pharmacy.', 'أدلة شراء من صيدلية الميناء.')} />
    {items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(page => <article key={page.slug} className={styles.panel}>
        <h2 lang={page.locale} dir="auto"><Link className="text-teal hover:text-ink" href={growthPagePath(page)}>{page.title}</Link></h2>
        <p className="m-0 text-sm text-muted" lang={page.locale} dir="auto">{page.description}</p>
      </article>)}
    </div> : <section className={`${styles.panel} ${styles.state}`}>
      <h2>{text('Our guides are being prepared.', 'نعمل على إعداد الأدلة')}</h2>
      <p>{text('Ask the pharmacy for help choosing a product in the meantime.', 'يمكنك التواصل مع الصيدلية للمساعدة في اختيار منتج.')}</p>
      <Button asChild variant="outline" size="sm"><Link href="/contact">{text('Contact the pharmacy', 'تواصل مع الصيدلية')}<Icon name="arrow" /></Link></Button>
    </section>}
  </StorefrontInformation>;
}
