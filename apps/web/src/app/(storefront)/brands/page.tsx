import { getLocale } from '../../../lib/server/i18n';
import { StorefrontInformation } from '../../../components/storefront-information';
import { Icon } from '../../../components/icon';
import styles from '../../../components/storefront-information.module.css';
import Link from '../../../components/app-link';
import { knownGrowthBrands } from '../../../components/growth-landing';
import { StorefrontIntro } from '../../../components/storefront-intro';
import { metadataFor } from '../../../lib/server/seo';
import { getProducts } from '../../../lib/server/catalog';
export function generateMetadata(){return metadataFor('Shop pharmacy brands','Explore skincare, baby and personal care brands at Al Mina Pharmacy in Ras Al Khaimah.','/brands',{});}
export default async function BrandsPage() {
  const [locale, results] = await Promise.all([
    getLocale(),
    Promise.all(Object.entries(knownGrowthBrands).map(async ([slug, name]) =>
      ({ slug, name, available: (await getProducts({ q: name })).products.length > 0 }))),
  ]);
  const available = results.filter(item => item.available);
  const text = (en: string, ar: string) => locale === 'ar' ? ar : en;

  return <StorefrontInformation locale={locale}>
    <StorefrontIntro title={text('Find your familiar brands', 'تصفّح العلامات التجارية')}
      description={text('Explore available brands and compare products, pack sizes and prices.', 'تصفّح العلامات التجارية المتاحة وقارن المنتجات وأحجام العبوات والأسعار.')} />
    {available.length ? <div className={styles.directory}>
      {available.map(item => <Link key={item.slug} href={'/brands/' + item.slug}><bdi>{item.name}</bdi><Icon name="arrow" /></Link>)}
    </div> : <p className={`${styles.panel} ${styles.state}`}>{text('No brands are currently listed.', 'لا توجد علامات تجارية مدرجة حالياً.')}</p>}
  </StorefrontInformation>;
}
