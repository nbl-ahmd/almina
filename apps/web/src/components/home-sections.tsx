import Image, { getImageProps } from 'next/image';
import Link from './app-link';
import { campaignImageUrl, type HomeSection } from '@almina/contracts';
import { categoryHref, type Category, type Product } from '../lib/catalog/model';
import { getProductById, getProducts, productImage } from '../lib/server/catalog';
import { brandSlug } from '../lib/catalog/merchandising';
import { bannerPhoneMedia } from '../lib/storefront/artwork';
import { ProductCard } from './product-card';
import { ProductShelf } from './product-shelf';
import { CategoryTile } from './category-tile';
import { CampaignSlider } from './campaign-slider';
import { ChevronRightIcon } from './storefront-icons';
import type { Locale } from '../lib/i18n';

type Custom = Exclude<HomeSection, { type: 'builtin' }>;
type Art = { image: string; mobileImage: string; alt: string; href: string };

/** Responsive picture for managed artwork: phone art below 900px when uploaded, contain-fit in a fixed frame.
 *  Only approved hosts render; anything else is skipped rather than breaking the homepage. */
function Picture({ art, cloudName, sizes, width, height, eager = false }: { art: Art; cloudName?: string | undefined; sizes: string; width: number; height: number; eager?: boolean }) {
  const desktop = campaignImageUrl(art.image, cloudName), mobile = campaignImageUrl(art.mobileImage, cloudName);
  if (!desktop) return null;
  return <picture className="qc-banner-art">
    {mobile && mobile !== desktop ? <source media={bannerPhoneMedia} srcSet={getImageProps({ src: mobile, alt: '', width, height, sizes: '100vw' }).props.srcSet} /> : null}
    <Image src={desktop} alt={art.href ? '' : art.alt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} />
  </picture>;
}
function Linked({ art, className, children, data }: { art: Art; className: string; children: React.ReactNode; data?: Record<string, string> }) {
  return art.href ? <Link className={className} href={art.href} aria-label={art.alt} {...data}>{children}</Link> : <div className={className} {...data}>{children}</div>;
}

const ofBrand = (products: Product[], brand: string) => products.filter(product => brandSlug(product.brand || product.familyBrand || '') === brandSlug(brand));
/** Every filter given must match; the catalogue applies them, and a brand is searched then matched exactly. */
async function filteredProducts({ categoryId, brand, offers, inStock, minPrice, maxPrice, sort }: Extract<Extract<Custom, { type: 'products' }>['source'], { kind: 'filtered' }>) {
  const { products } = await getProducts({ ...(brand ? { q: brand, sharedSearch: true } : {}), ...(categoryId ? { category: categoryId } : {}), ...(offers ? { offers: true } : {}), ...(inStock ? { inStock: true } : {}),
    ...(minPrice === undefined ? {} : { minPrice }), ...(maxPrice === undefined ? {} : { maxPrice }), ...(sort ? { sort } : {}) }).catch(() => ({ products: [] as Product[] }));
  return brand ? ofBrand(products, brand) : products;
}

export async function sectionProducts(section: Extract<Custom, { type: 'products' }>, limit = section.limit): Promise<Product[]> {
  const source = section.source;
  const rows = source.kind === 'selected'
    ? (await Promise.allSettled(source.productIds.map(id => getProductById(id)))).flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : [])
    : source.kind === 'filtered' ? await filteredProducts(source)
      : source.kind === 'category' ? (await getProducts({ category: source.categoryId }).catch(() => ({ products: [] }))).products
      : source.kind === 'offers' ? (await getProducts({ offers: true }).catch(() => ({ products: [] }))).products
        : ofBrand((await getProducts({ q: source.brand, sharedSearch: true }).catch(() => ({ products: [] }))).products, source.brand);
  // In-stock first, keeping the source order; prices and stock are read live, never stored in the layout.
  return [...rows.filter(product => product.stock > 0), ...rows.filter(product => product.stock <= 0)].slice(0, limit);
}

/** Life Pharmacy / Aster sections from the homepage layout: optional thin banner, heading with "View all", then the content. */
export { Picture as SectionPicture };

export async function CustomHomeSection({ section, locale, cloudName, categories, logos, sectionPages = true }: { section: Custom; locale: Locale; cloudName?: string | undefined; categories: Category[]; logos: Map<string, string>; sectionPages?: boolean }) {
  const ar = locale === 'ar';
  let content: React.ReactNode = null, viewAll = section.viewAllHref;
  if (section.type === 'products') {
    const products = await sectionProducts(section);
    if (!products.length) return null;
    if (!viewAll) viewAll = section.source.kind === 'category' ? (() => { const category = categories.find(item => item._id === (section.source as { categoryId: string }).categoryId); return category ? categoryHref(category) : ''; })()
      : section.source.kind === 'brand' ? '/brands/' + brandSlug(section.source.brand) : section.source.kind === 'offers' ? '/offers' : sectionPages ? `/sections/${section.id}` : '';
    content = <ProductShelf locale={locale}>{products.map(product => <ProductCard key={product._id} product={product} />)}</ProductShelf>;
  } else if (section.type === 'categories') {
    const chosen = section.categoryIds.flatMap(id => categories.filter(category => category._id === id && !category.disabled));
    if (!chosen.length) return null;
    const photos = new Map<string, string>();
    await Promise.all(chosen.filter(category => !category.image).map(async category => {
      const product = (await getProducts({ category: category._id }).catch(() => ({ products: [] as Product[] }))).products.find(item => item.stock > 0 && productImage(item) !== '/product-placeholder.svg');
      if (product) photos.set(category._id, productImage(product));
    }));
    content = <div className="home-categories qc-section-categories">{chosen.map(category => <CategoryTile key={category._id} category={category} fallback={photos.get(category._id)} />)}</div>;
  } else if (section.type === 'brands') {
    content = <div className="qc-brand-rail">{section.brands.map(name => { const slug = brandSlug(name), logo = logos.get(slug); return <Link key={slug} className="qc-brand" href={'/brands/' + slug}>
      {logo ? <span className="qc-brand-mark"><Image src={logo} alt="" width={120} height={120} sizes="84px" /></span> : <span className="qc-brand-mark qc-brand-initial">{name.slice(0, 1).toUpperCase()}</span>}
      <span className="qc-brand-name">{name}</span></Link>; })}</div>;
  } else if (section.type === 'images') {
    const tiles = section.tiles.filter(tile => campaignImageUrl(tile.image, cloudName));
    if (!tiles.length) return null;
    content = <div className="qc-tiles" data-columns={section.columns} data-ratio={section.ratio} style={{ ['--tiles' as string]: tiles.length }}>{tiles.map((tile, index) => <Linked key={index} art={tile} className="qc-tile"><Picture art={tile} cloudName={cloudName} sizes={`(max-width: 767px) ${section.columns > 2 ? 34 : 50}vw, ${Math.round(100 / section.columns)}vw`} width={600} height={600} /></Linked>)}</div>;
  } else if (section.type === 'carousel') {
    const slides = section.slides.filter(slide => campaignImageUrl(slide.image, cloudName));
    if (!slides.length) return null;
    content = <CampaignSlider locale={locale} label={section.title || (ar ? 'عروض' : 'Promotions')} controlLabel={ar ? 'عرض' : 'promotion'}>{slides.map((slide, index) => <Linked key={index} art={slide} className="qc-hero" data={{ 'data-layout': 'image' }}><Picture art={slide} cloudName={cloudName} sizes="(max-width: 899px) 100vw, 1280px" width={800} height={400} /></Linked>)}</CampaignSlider>;
  } else if (section.type === 'strip') {
    if (!campaignImageUrl(section.strip.image, cloudName)) return null;
    content = <Linked art={section.strip} className="qc-strip"><Picture art={section.strip} cloudName={cloudName} sizes="(max-width: 899px) 100vw, 1280px" width={764} height={176} /></Linked>;
  }
  const banner = section.banner && campaignImageUrl(section.banner.image, cloudName) ? section.banner : null;
  const heading = section.title ? <div className="section-heading">
    <div className="min-w-0"><h2 className="section-title">{section.title}</h2>{section.subtitle ? <p className="section-description">{section.subtitle}</p> : null}</div>
    {viewAll ? <Link className="section-link" href={viewAll}>{ar ? 'عرض الكل' : 'View all'}<ChevronRightIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" /></Link> : null}
  </div> : null;
  return <section className="qc-section" data-type={section.type} data-bg={section.background} aria-label={section.title || undefined}>
    {banner ? <Linked art={banner} className="qc-strip"><Picture art={banner} cloudName={cloudName} sizes="(max-width: 899px) 100vw, 1280px" width={764} height={176} /></Linked> : null}
    {heading}
    {content}
  </section>;
}
