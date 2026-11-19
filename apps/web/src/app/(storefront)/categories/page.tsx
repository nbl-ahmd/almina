import styles from '../../../components/storefront-information.module.css';
import { StorefrontInformation } from '../../../components/storefront-information';
import { StorefrontIntro } from '../../../components/storefront-intro';
import { metadataFor } from '../../../lib/server/seo';
import type { Query } from '../../../lib/seo';
import { getCategories } from '../../../lib/server/catalog';
import { getLocale } from '../../../lib/server/i18n';
import { CategoryGrid, Breadcrumb } from '../../../components/storefront';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from '../../../components/app-link';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) { return metadataFor('Categories', 'Browse healthcare, skincare and wellness categories at Al Mina Pharmacy.', '/categories', await searchParams); }
export default async function CategoriesPage() {
  const locale=await getLocale(), ar=locale==='ar';
  const text=(en:string,arabic:string)=>ar?arabic:en;
  const shortcuts=[
    {href:'/collections/skin-essentials',name:text('Skincare essentials','أساسيات العناية بالبشرة')},
    {href:'/collections/baby-care',name:text('Baby & family care','العناية بالطفل والعائلة')},
    {href:'/collections/daily-care',name:text('Everyday personal care','العناية الشخصية اليومية')},
    {href:'/collections/under-50',name:text('AED 50 & under','٥٠ درهماً وأقل')},
  ];
  return <StorefrontInformation locale={locale}><Breadcrumb title={text('Categories','الفئات')} />
    <StorefrontIntro title={text('Care for every routine','عناية لكل روتين')} description={text('Know what you need? Search above. Exploring? Start with a category below.','تعرف ما تحتاجه؟ استخدم البحث أعلاه. أو ابدأ بتصفح الفئات أدناه.')} />
    <section aria-labelledby="browse-categories-heading"><h2 id="browse-categories-heading" className="mb-4 text-xl font-semibold">{text('Shop by category','تسوق حسب الفئة')}</h2><CategoryGrid categories={await getCategories()} directory /></section>
    <section className="mt-8" aria-labelledby="browse-collections-heading"><h2 id="browse-collections-heading" className="mb-4 text-xl font-semibold">{text('A simpler place to start','بداية أسهل للتسوق')}</h2><div className={styles.directory}>{shortcuts.map(item=><Link key={item.href} href={item.href} ><span>{item.name}</span><ArrowRightIcon className="size-4 shrink-0 rtl:rotate-180" /></Link>)}</div></section>
    <nav className="mt-5 flex flex-wrap gap-3" aria-label={text('More ways to shop','طرق أخرى للتسوق')}><Link className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium" href="/offers">{text('Current offers','العروض الحالية')}</Link><Link className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium" href="/brands">{text('Browse brands','تصفح العلامات التجارية')}</Link><Link className="inline-flex min-h-11 items-center px-2 text-sm text-teal underline underline-offset-4" href="/products">{text('View the full catalogue','عرض جميع المنتجات')}</Link></nav>
    <section className={`${styles.section} ${styles.panel} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="mb-1 text-xl font-semibold">{text('Not sure where to start?','لست متأكداً من أين تبدأ؟')}</h2><p className="m-0 max-w-[46ch] text-sm leading-6 text-ocean">{text('Ask our pharmacy team for help finding a product.','اطلب المساعدة من فريق الصيدلية للعثور على منتج.')}</p></div><Link className="inline-flex min-h-11 items-center text-sm font-semibold underline" href="/contact">{text('Contact the pharmacy','تواصل مع الصيدلية')}</Link></section>
  </StorefrontInformation>;
}
