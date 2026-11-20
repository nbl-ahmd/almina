import Image, { getImageProps } from 'next/image';
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
import { ProductCard } from './product-card';

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

export function HomeHero({ locale, banners = [], campaigns = [], loading = false }: {
  locale: Locale;
  banners?: Banner[];
  campaigns?: GrowthPage[];
  loading?: boolean;
}) {
  const ar = locale === 'ar';
  const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
  const leadTitle = ar ? 'العناية الشخصية اليومية' : 'Everyday personal care';
  const leadAction = ar ? 'تسوق المجموعة' : 'Shop collection';
  const lead = (
    <Link key="almina-everyday" href="/collections/daily-care" className="home-hero-copy home-hero-copy--lead"
      aria-label={`${leadTitle}. ${leadAction}`}>
      <span className="home-hero-title">{leadTitle}</span>
      <span className="home-hero-action">{leadAction}</span>
    </Link>
  );
  if (loading) return <div className="home-campaigns"><div className="home-hero-viewport">{lead}</div><div className="campaign-placeholder" aria-hidden="true" /></div>;

  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  return (
    <section className="home-campaigns" aria-label={u(locale, 'Discover Al Mina')}>
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
            <span className="home-hero-title">{ar ? 'تسوق حسب العلامة التجارية' : 'Shop by brand'}</span>
            <span className="home-hero-action">{ar ? 'استكشف العلامات التجارية' : 'Explore brands'}</span>
          </Link>,
        ]}
      </CampaignSlider>
    </section>
  );
}

const categoryOrder = ['skincare', 'vitamins', 'babycare', 'oralcare', 'haircare', 'firstaid'];

function categoryRank(name: string) {
  const index = categoryOrder.findIndex(label => name.toLowerCase().replace(/\s+/g, '').includes(label));
  return index < 0 ? categoryOrder.length : index;
}

export async function HomeCategories({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  const locale = await getLocale();
  const ordered = [...categories].sort((a, b) => categoryRank(a.name) - categoryRank(b.name));
  return (
    <section className="home-departments" aria-label={u(locale, 'Shop by care')}>
      <SectionHeading title={locale === 'ar' ? 'الفئات' : 'Categories'} href="/categories" link="All categories" />
      <div className="home-category-lane" data-store-rail>
        {ordered.slice(0, 8).map(category => (
          <Link key={category._id} href={categoryHref(category)}>{u(locale, category.name)}</Link>
        ))}
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
  const ar = locale === 'ar';
  const skin = collection === 'skin-essentials';
  const title = skin ? (ar ? 'أساسيات العناية بالبشرة' : 'Skincare essentials') : (ar ? 'العناية بالطفل والأسرة' : 'Baby and family care');
  const href = `/collections/${collection}`;

  return (
    <section className="home-collection-section" aria-label={title}>
      <SectionHeading title={title} href={href} link={ar ? 'تسوق المجموعة' : 'Shop collection'} />
      {products.length ? <div className="home-product-grid" data-store-rail>
        {products.slice(0, 5).map(product => <ProductCard key={product._id} product={product} />)}
      </div> : null}
    </section>
  );
}

export function HomeDiscovery({ locale }: { locale: Locale }) {
  const ar = locale === 'ar';
  return <section className="home-discovery" aria-labelledby="home-discovery-title">
    <h2 id="home-discovery-title">{ar ? 'تسوق حسب احتياجاتك' : 'Shop by need'}</h2>
    <div className="home-discovery-links">
      <Link href="/collections/daily-care"><span>{ar ? 'العناية الشخصية اليومية' : 'Everyday personal care'}</span></Link>
      <Link href="/collections/under-50"><span>{ar ? 'أساسيات بـ٥٠ درهماً أو أقل' : 'Essentials at AED 50 or less'}</span></Link>
    </div>
  </section>;
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
