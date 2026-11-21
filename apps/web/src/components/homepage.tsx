import Image, { getImageProps } from 'next/image';
import { categoryRank, CategorySymbol } from './category-symbol';
import { categoryImage, productImage } from '../lib/server/catalog';
import Link from './app-link';
import type { GrowthPage } from '@almina/contracts';
import { bannerArtwork, bannerMobileMedia, bannerSizes } from '../lib/catalog/banner-artwork';
import type { Locale } from '../lib/i18n';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { getWebEnvironment } from '../lib/server/env';
import { categoryHref, type Category, type Product } from '../lib/catalog/model';
import { CampaignArtwork } from './campaign-artwork';
import { CampaignSlider } from './campaign-slider';
import { ScrollReveal } from './scroll-reveal';
import { ProductCard, ProductPhoto } from './product-card';

type Banner = { image: string; mobileImage?: string; name: string; href: string | null };

function HomeHeroImage({ image, mobileImage, alt, priority = false }: {
  image: string;
  mobileImage?: string;
  alt: string;
  priority?: boolean;
}) {
  const mobile = mobileImage ? getImageProps({
    src: mobileImage, alt, ...bannerArtwork.mobile, sizes: bannerSizes,
  }).props : undefined;
  return <picture>
    {mobile ? <source media={bannerMobileMedia} srcSet={mobile.srcSet} sizes={mobile.sizes} /> : null}
    <Image src={image} alt={alt} {...bannerArtwork.desktop} sizes={bannerSizes}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} draggable={false} />
  </picture>;
}

async function SectionHeading({ title, href, link = 'View all' }: {
  title: string;
  href: string;
  link?: string;
}) {
  const locale = await getLocale();
  return (
    <div className="sf-section-heading">
      <h2>{u(locale, title)}</h2>
      <Link href={href}>
        {u(locale, link)}
      </Link>
    </div>
  );
}

export function HomeHero({ locale, banners = [], campaigns = [], featured = [], loading = false }: {
  locale: Locale;
  banners?: Banner[];
  campaigns?: GrowthPage[];
  featured?: Product[];
  loading?: boolean;
}) {
  const ar = locale === 'ar';
  const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
  const leadTitle = ar ? 'احتياجاتك من الصيدلية' : 'Everyday pharmacy essentials';
  const leadSupport = ar
    ? 'صحة وجمال وعناية يومية من صيدلية الميناء في رأس الخيمة.'
    : 'Health, beauty and everyday care from our Ras Al Khaimah pharmacy.';
  const leadAction = ar ? 'تصفح المنتجات' : 'Shop products';
  const lead = (
    <Link key="almina-everyday" href="/products" className="home-hero-copy home-hero-copy--lead"
      aria-label={`${leadTitle}. ${leadSupport} ${leadAction}`}>
      <span className="home-hero-message">
        <span className="home-hero-title">{leadTitle}</span>
        <span className="home-hero-support">{leadSupport}</span>
        <span className="home-hero-action">{leadAction}</span>
      </span>
      {featured.length > 0 && <span className="home-hero-art" aria-hidden="true">
        {featured.map((product, index) => <span className="home-hero-product" key={product._id}>
          <ProductPhoto product={product} eager={index === 0} sizes="(max-width: 767px) 32vw, 210px" />
        </span>)}
      </span>}
    </Link>
  );
  if (loading) return <div className="home-campaigns" data-compact={!banners.length && !heroCampaigns.length || undefined}><div className="home-hero-viewport">{lead}</div><div className="campaign-placeholder" aria-hidden="true" /></div>;

  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  return (
    <section className="home-campaigns" data-compact={!banners.length && !heroCampaigns.length || undefined} aria-label={u(locale, 'Discover Al Mina')}>
      <CampaignSlider locale={locale} label={u(locale, 'Pharmacy promotions')} controlLabel={u(locale, 'promotion')}>
        {[
          ...banners.slice(0, 8).map((banner, index) => {
            const photo = <HomeHeroImage {...banner} alt={banner.name} priority={index === 0} />;
            const key = `${banner.image}-${index}`;
            return banner.href ? <Link key={key} href={banner.href}>{photo}</Link> : <div key={key}>{photo}</div>;
          }),
          lead,
          ...heroCampaigns.map(page => <CampaignArtwork cloudName={cloudName} key={page.slug} page={page} />),
          <Link key="shop-brands" href="/brands" className="home-hero-copy">
            <span className="home-hero-message">
              <span className="home-hero-title">{ar ? 'تسوق حسب العلامة التجارية' : 'Shop by brand'}</span>
              <span className="home-hero-action">{ar ? 'استكشف العلامات التجارية' : 'Explore brands'}</span>
            </span>
          </Link>,
        ]}
      </CampaignSlider>
    </section>
  );
}

export async function HomeCategories({ categories, products }: { categories: Category[]; products: Product[] }) {
  if (!categories.length) return null;
  const locale = await getLocale();
  const ordered = [...categories].sort((a, b) => categoryRank(a.name) - categoryRank(b.name));
  const categoryPhotos = new Map<string, Product>();
  for (const product of products) {
    if (!categoryPhotos.has(product.category._id) && productImage(product) !== '/product-placeholder.svg') {
      categoryPhotos.set(product.category._id, product);
    }
  }
  return (
    <section className="home-departments" aria-label={u(locale, 'Shop by care')}>
      <SectionHeading title={locale === 'ar' ? 'الفئات' : 'Categories'} href="/categories" link="All categories" />
      <div className="home-category-lane" data-store-rail>
        {ordered.slice(0, 8).map(category => {
          const product = categoryPhotos.get(category._id);
          return <Link key={category._id} href={categoryHref(category)}>
            <span className="home-category-art" aria-hidden="true">
              {category.image ? <Image src={categoryImage(category.image)} alt="" width={76} height={76} sizes="76px" />
                : product ? <ProductPhoto product={product} sizes="72px" /> : <CategorySymbol name={category.name} />}
            </span>
            <span>{u(locale, category.name)}</span>
          </Link>;
        })}
      </div>
    </section>
  );
}

export function HomeShelf({ products, title, href }: { products: Product[]; title: string; href: string }) {
  if (!products.length) return null;
  return (
    <section className="home-product-shelf">
      <SectionHeading title={title} href={href} />
      <div className="home-product-grid">{products.slice(0, 5).map(product =>
        <ProductCard key={product._id} product={product} />,
      )}</div>
    </section>
  );
}

export function HomeCollectionSection({ locale, collection, products }: {
  locale: Locale;
  collection: 'skin-essentials' | 'baby-care';
  products: Product[];
}) {
  if (!products.length) return null;
  const ar = locale === 'ar';
  const skin = collection === 'skin-essentials';
  const title = skin ? (ar ? 'أساسيات العناية بالبشرة' : 'Skincare essentials') : (ar ? 'العناية بالطفل والأسرة' : 'Baby and family care');
  const href = `/collections/${collection}`;

  return (
    <section className="home-collection-section" aria-label={title}>
      <SectionHeading title={title} href={href} link={ar ? 'تسوق المجموعة' : 'Shop collection'} />
      <div className="home-product-grid" data-store-rail>
        {products.slice(0, 5).map(product => <ProductCard key={product._id} product={product} />)}
      </div>
    </section>
  );
}

const discoveryCollections = [
  { slug: 'daily-care', image: 'skincare-campaign', en: 'Everyday personal care', ar: 'العناية الشخصية اليومية' },
  { slug: 'baby-care', image: 'family-campaign', en: 'Baby and family care', ar: 'العناية بالطفل والأسرة' },
  { slug: 'under-50', image: 'wellness-editorial', en: 'Essentials at AED 50 or less', ar: 'أساسيات بـ٥٠ درهماً أو أقل' },
] as const;

export function HomeDiscovery({ locale }: { locale: Locale }) {
  return (
    <ScrollReveal>
      <section className="home-discovery" aria-labelledby="home-discovery-title">
        <h2 id="home-discovery-title" data-reveal-text>{locale === 'ar' ? 'تسوق حسب احتياجاتك' : 'Shop by need'}</h2>
        <div className="home-discovery-links">
          {discoveryCollections.map(collection => (
            <Link key={collection.slug} href={`/collections/${collection.slug}`} data-editorial-stack>
              <span className="home-discovery-photo">
                <Image src={`/design/home/${collection.image}.webp`} alt="" width={420} height={280}
                  sizes="(max-width: 767px) 128px, (max-width: 1280px) 32vw, 390px" loading="lazy" />
              </span>
              <span className="home-discovery-label">{collection[locale]}</span>
            </Link>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

export async function HomeBrandStrip({ brands }: { brands: string[] }) {
  if (!brands.length) return null;
  const locale = await getLocale();
  return (
    <section className="home-brands">
      <SectionHeading title={locale === 'ar' ? 'العلامات التجارية في مجموعتنا' : 'Brands in our range'} href="/brands" link="Shop brands" />
      <div className="brand-rail">{brands.slice(0, 10).map(brand =>
        <Link href={'/search?' + new URLSearchParams({ q: brand })} key={brand}>
          <bdi>{brand}</bdi>
        </Link>,
      )}</div>
    </section>
  );
}

export function HomeManagedCampaigns({ campaigns }: { campaigns: GrowthPage[] }) {
  const supporting = campaigns.filter(page => page.homepagePlacement === 'secondary');
  if (!supporting.length) return null;
  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  return (
    <section className="home-managed-campaigns" aria-label={supporting[0]?.locale === 'ar' ? 'حملات الصيدلية' : 'Pharmacy campaigns'}>
      {supporting.map(page => <CampaignArtwork key={page.slug} page={page} cloudName={cloudName} />)}
    </section>
  );
}
