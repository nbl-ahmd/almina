import Image, { getImageProps } from 'next/image';
import Link from './app-link';
import { ArrowRightIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { GrowthPage } from '@almina/contracts';
import type { Locale } from '../lib/i18n';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { getWebEnvironment } from '../lib/server/env';
import type { Category, Product } from '../lib/catalog/model';
import { CampaignArtwork } from './campaign-artwork';
import { CampaignSlider } from './campaign-slider';
import { Icon } from './icon';
import { CategoryTile } from './category-tile';
import { ProductCard } from './product-card';

type Banner = { image: string; name: string; href: string | null };

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
        <ArrowRightIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
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
  const artwork = `/design/campaigns/everyday-care-${locale}`;
  const mobile = getImageProps({
    src: `${artwork}-phone.webp`, alt: '', width: 800, height: 300, sizes: 'calc(100vw - 32px)',
  });
  const lead = (
    <div className="pharmacy-ad" key="almina-everyday">
      <Link href="/products" aria-label={ar ? 'عنايتك اليومية في مكان واحد. تسوق الأساسيات' : 'Everyday care. One easy stop. Shop essentials'}>
        <picture>
          <source media="(max-width: 767px)" srcSet={mobile.props.srcSet} sizes={mobile.props.sizes} />
          <Image src={`${artwork}-wide.webp`} alt="" width={1440} height={416}
            sizes="(min-width: 1240px) 1192px, calc(100vw - 48px)" loading="eager" fetchPriority="high" />
        </picture>
      </Link>
    </div>
  );
  if (loading) return <div className="home-campaigns">{lead}<div className="campaign-placeholder" aria-hidden="true" /></div>;

  const evergreen = [
    { artwork: 'personal-care', href: '/collections/daily-care', label: ar ? 'العناية اليومية. تسوق المجموعة' : 'Everyday personal care. Shop collection' },
    { artwork: 'shop-brands', href: '/brands', label: ar ? 'تسوق حسب العلامة التجارية. استكشف العلامات التجارية' : 'Shop by brand. Explore brands' },
  ];

  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  return (
    <section className="home-campaigns" aria-label={u(locale, 'Discover Al Mina')}>
      <CampaignSlider locale={locale} label={u(locale, 'Pharmacy promotions')} controlLabel={u(locale, 'promotion')}>
        {[
          lead,
          ...heroCampaigns.map(page => <CampaignArtwork cloudName={cloudName} key={page.slug} page={page} />),
          ...evergreen.map(({ artwork, href, label }) => (
            <Link key={artwork} href={href} className="home-hero-banner" aria-label={label}>
              <Image src={`/design/campaigns/${artwork}-${locale}.webp`} alt="" width={1440} height={480}
                sizes="(min-width: 1240px) 1192px, calc(100vw - 32px)" className="home-banner-image" />
            </Link>
          )),
          ...banners.slice(0, 8).map((banner, index) => {
            const photo = <Image src={banner.image} alt={banner.name} width={1440} height={540}
              sizes="(max-width: 767px) 100vw, 1200px" loading="lazy" className="home-banner-image" />;
            const key = `${banner.image}-${index}`;
            return banner.href ? <Link key={key} href={banner.href}>{photo}</Link> : <div key={key}>{photo}</div>;
          }),
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
        {ordered.slice(0, 8).map(category => <CategoryTile key={category._id} category={category} />)}
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
      <h2 className="sr-only">{title}</h2>
      <Link href={href} className="home-editorial-banner" aria-label={`${title}. ${ar ? 'تسوق المجموعة' : 'Shop collection'}`}>
        <Image src={`/design/campaigns/${skin ? 'skincare' : 'family'}-${locale}.webp`}
          alt="" width={960} height={320} sizes="(min-width: 1240px) 1192px, calc(100vw - 32px)" />
      </Link>
      {products.length ? <div className="home-product-grid" data-store-rail>
        {products.slice(0, 5).map(product => <ProductCard key={product._id} product={product} />)}
      </div> : null}
    </section>
  );
}

export function HomeDiscovery({ locale }: { locale: Locale }) {
  const ar = locale === 'ar';
  return <section className="home-discovery" aria-labelledby="home-discovery-title">
    <h2 id="home-discovery-title">{ar ? 'استكشف حسب احتياجاتك' : 'Find what fits your day'}</h2>
    <div className="home-discovery-links">
      <Link href="/collections/daily-care"><Icon name="leaf" /><span>{ar ? 'العناية الشخصية اليومية' : 'Everyday personal care'}</span><Icon name="arrow" /></Link>
      <Link href="/collections/under-50"><Icon name="tag" /><span>{ar ? 'أساسيات بـ٥٠ درهماً أو أقل' : 'Essentials at AED 50 or less'}</span><Icon name="arrow" /></Link>
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
          <ArrowUpRightIcon className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
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
