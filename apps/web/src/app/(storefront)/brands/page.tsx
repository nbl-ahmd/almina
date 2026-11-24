import Link from '../../../components/app-link';
import { knownGrowthBrands } from '../../../components/growth-landing';
import { StorefrontIntro } from '../../../components/storefront-intro';
import { ProductPhoto } from '../../../components/product-card';
import { metadataFor } from '../../../lib/server/seo';
import { getProducts, productImage } from '../../../lib/server/catalog';
import { getLocale } from '../../../lib/server/i18n';
import { catalogueBrands } from '../../../lib/catalog/merchandising';
import { ChevronRightIcon } from '../../../components/storefront-icons';
import type { Product } from '../../../lib/catalog/model';

export function generateMetadata(){return metadataFor('Shop pharmacy brands','Explore skincare, baby and personal care brands at Al Mina Pharmacy in Ras Al Khaimah.','/brands',{});}

const brandOf = (product: Product) => (product.brand || product.familyBrand || '').trim().toLowerCase();

export default async function BrandsPage(){
  const locale = await getLocale(), ar = locale === 'ar';
  const [curated, catalogue] = await Promise.all([
    Promise.all(Object.entries(knownGrowthBrands).map(async ([slug, name]) => ({ slug, name, available: (await getProducts({ q: name }).catch(() => ({ products: [] }))).products.length > 0 }))),
    getProducts({}).then(result => result.products).catch(() => [] as Product[]),
  ]);
  const pages = curated.filter(item => item.available);
  const curatedNames = new Set(pages.map(item => item.name.toLowerCase()));
  // Brands with stock on the current catalogue page, excluding those that already have a brand page.
  const inStock = catalogueBrands(catalogue).filter(name => !curatedNames.has(name.toLowerCase())).map(name => ({
    name, product: catalogue.find(product => brandOf(product) === name.toLowerCase() && productImage(product) !== '/product-placeholder.svg'),
  }));
  return <>
    <StorefrontIntro title={ar ? 'علامات تجارية تعرفها' : 'Find your familiar brands'} description={ar ? 'تصفح العلامات التجارية المتوفرة في المينا وقارن المنتجات والأحجام والأسعار.' : 'Explore the brands currently available at Al Mina. Compare products, pack sizes and prices.'} />
    {pages.length ? <section aria-labelledby="brand-pages-heading" className="mb-8">
      <h2 id="brand-pages-heading" className="section-title mb-3">{ar ? 'صفحات العلامات التجارية' : 'Brand pages'}</h2>
      <div className="brand-grid">{pages.map(item => <Link key={item.slug} href={'/brands/' + item.slug} className="brand-tile"><span className="brand-tile-mark" aria-hidden="true">{item.name.slice(0, 1)}</span><span className="brand-tile-name">{item.name}</span><ChevronRightIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" /></Link>)}</div>
    </section> : null}
    {inStock.length ? <section aria-labelledby="brands-in-stock-heading">
      <h2 id="brands-in-stock-heading" className="section-title mb-3">{ar ? 'علامات متوفرة الآن' : 'Brands in stock now'}</h2>
      <div className="brand-grid">{inStock.map(item => <Link key={item.name} href={`/search?q=${encodeURIComponent(item.name)}`} className="brand-tile">
        <span className="brand-tile-mark brand-tile-photo" aria-hidden="true">{item.product ? <ProductPhoto product={item.product} /> : item.name.slice(0, 1)}</span>
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
