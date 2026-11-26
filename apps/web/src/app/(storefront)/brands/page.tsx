import Link from '../../../components/app-link';
import { knownGrowthBrands } from '../../../components/growth-landing';
import { StorefrontIntro } from '../../../components/storefront-intro';
import { ProductPhoto } from '../../../components/product-card';
import { metadataFor } from '../../../lib/server/seo';
import Image from 'next/image';
import { campaignImageUrl } from '@almina/contracts';
import { getAllBrandPages, getCatalogueBrands } from '../../../lib/server/growth';
import { getWebEnvironment } from '../../../lib/server/env';
import { collectionData } from '../../../lib/seo';
import { StructuredData } from '../../../components/structured-data';
import { getProducts, productImage } from '../../../lib/server/catalog';
import { getLocale } from '../../../lib/server/i18n';
import { brandSlug, catalogueBrands } from '../../../lib/catalog/merchandising';
import { ChevronRightIcon } from '../../../components/storefront-icons';
import type { Product } from '../../../lib/catalog/model';

export function generateMetadata(){return metadataFor('Shop pharmacy brands','Explore skincare, baby and personal care brands at Al Mina Pharmacy in Ras Al Khaimah.','/brands',{});}

const brandOf = (product: Product) => (product.brand || product.familyBrand || '').trim().toLowerCase();

export default async function BrandsPage(){
  const locale = await getLocale(), ar = locale === 'ar';
  const [catalogue, brandPages, allBrands] = await Promise.all([
    getProducts({}).then(result => result.products).catch(() => [] as Product[]),
    getAllBrandPages(locale),
    getCatalogueBrands(),
  ]);
  // One brand list answers which built-in names are stocked; searching for each one is only the fallback when it is unavailable.
  const stocked = allBrands ? new Set(allBrands.map(brandSlug)) : null;
  const curated = await Promise.all(Object.entries(knownGrowthBrands).map(async ([slug, name]) => ({ slug, name,
    available: stocked ? stocked.has(brandSlug(name)) : (await getProducts({ q: name, sharedSearch: true }).catch(() => ({ products: [] }))).products.length > 0 })));
  // Logos staff uploaded on brand pages (approved hosts only).
  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  const logos = new Map(brandPages.flatMap(page => { const logo = campaignImageUrl(page.image, cloudName); return logo ? [[page.slug, logo] as const] : []; }));
  // Brand pages: the ones staff published (with or without products yet), then built-in names that have products.
  const staffPages = brandPages.map(page => ({ slug: page.slug, name: page.title.replace(/ at Al Mina Pharmacy$/, '') }));
  const staffSlugs = new Set(staffPages.map(item => item.slug));
  const pages = [...staffPages, ...curated.filter(item => item.available && !staffSlugs.has(item.slug))].sort((a, b) => a.name.localeCompare(b.name));
  const listed = new Set(pages.flatMap(item => [item.slug, brandSlug(item.name)]));
  // Every other brand shoppers can buy; if that list is unavailable, the brands on the first catalogue page.
  const inStock = (allBrands ?? catalogueBrands(catalogue)).filter(name => brandSlug(name) && !listed.has(brandSlug(name))).map(name => ({
    name, product: catalogue.find(product => brandOf(product) === name.toLowerCase() && productImage(product) !== '/product-placeholder.svg'),
  }));
  const origin = getWebEnvironment().WEB_ORIGIN;
  return <>
    <StructuredData data={collectionData(origin, { name: 'Shop pharmacy brands', description: 'Brands currently available at Al Mina Pharmacy in Ras Al Khaimah.', path: '/brands' }, [...pages.map(item => ({ name: item.name, href: '/brands/' + item.slug })), ...inStock.map(item => ({ name: item.name, href: '/brands/' + brandSlug(item.name) }))])} />
    <StorefrontIntro title={ar ? 'علامات تجارية تعرفها' : 'Find your familiar brands'} description={ar ? 'تصفح العلامات التجارية المتوفرة في المينا وقارن المنتجات والأحجام والأسعار.' : 'Explore the brands currently available at Al Mina. Compare products, pack sizes and prices.'} />
    {pages.length ? <section aria-labelledby="brand-pages-heading" className="mb-8">
      <h2 id="brand-pages-heading" className="section-title mb-3">{ar ? 'صفحات العلامات التجارية' : 'Brand pages'}</h2>
      <div className="brand-grid">{pages.map(item => <Link key={item.slug} href={'/brands/' + item.slug} className="brand-tile"><span className="brand-tile-mark brand-tile-photo" aria-hidden="true">{logos.get(item.slug) ? <Image src={logos.get(item.slug)!} alt="" width={96} height={96} sizes="48px" /> : item.name.slice(0, 1)}</span><span className="brand-tile-name">{item.name}</span><ChevronRightIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" /></Link>)}</div>
    </section> : null}
    {inStock.length ? <section aria-labelledby="brands-in-stock-heading">
      <h2 id="brands-in-stock-heading" className="section-title mb-3">{ar ? 'كل العلامات التجارية' : 'More brands'}</h2>
      <div className="brand-grid">{inStock.map(item => <Link key={item.name} href={`/brands/${brandSlug(item.name)}`} className="brand-tile">
        <span className="brand-tile-mark brand-tile-photo" aria-hidden="true">{logos.get(brandSlug(item.name)) ? <Image src={logos.get(brandSlug(item.name))!} alt="" width={96} height={96} sizes="48px" /> : item.product ? <ProductPhoto product={item.product} /> : item.name.slice(0, 1)}</span>
        <span className="brand-tile-name">{item.name}</span><ChevronRightIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </Link>)}</div>
    </section> : null}
    {!pages.length && !inStock.length ? <section className="empty-state" aria-labelledby="brands-empty-heading">
      <h2 id="brands-empty-heading" className="section-title">{ar ? 'لا توجد علامات تجارية للعرض الآن' : 'No brands to show right now'}</h2>
      <p className="section-description mx-auto">{ar ? 'ابحث باسم العلامة التجارية أعلاه، أو تصفح الفئات.' : 'Search for a brand by name above, or browse by category.'}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3"><Link className="button" href="/categories">{ar ? 'تصفح الفئات' : 'Browse categories'}</Link><Link className="button button-secondary" href="/products">{ar ? 'كل المنتجات' : 'All products'}</Link></div>
    </section> : null}
  </>;
}
