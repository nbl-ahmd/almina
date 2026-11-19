import Image from 'next/image';
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

export function HomeHero({ locale, banners = [], campaigns = [] }: {
  locale: Locale;
  banners?: Banner[];
  campaigns?: GrowthPage[];
}) {
  const ar = locale === 'ar';
  const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
  const lead = (
    <div className="pharmacy-ad" key="almina-everyday">
      <div className="pharmacy-ad-copy">
        <h2>{ar ? 'عنايتك اليومية.\nفي مكان واحد.' : 'Everyday care.\nOne easy stop.'}</h2>
        <p>{ar ? 'اكتشف منتجات العناية بالبشرة واحتياجاتك اليومية.' : 'Find your skincare and daily essentials.'}</p>
        <Link href="/products" className="home-action">
          {ar ? 'تسوق الأساسيات' : 'Shop essentials'}
          <ArrowRightIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
      <Image className="campaign-courier" src="/design/campaigns/almina-care-courier.png"
        alt="" width={1280} height={1280} sizes="(max-width: 767px) 48vw, 360px"
        loading="eager" fetchPriority="high" />
    </div>
  );
  if (!heroCampaigns.length && !banners.length) return <div className="home-campaigns">{lead}</div>;

  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  return (
    <section className="home-campaigns" aria-label={u(locale, 'Discover Al Mina')}>
      <CampaignSlider locale={locale} label={u(locale, 'Pharmacy promotions')} controlLabel={u(locale, 'promotion')}>
        {[
          lead,
          ...heroCampaigns.map(page => <CampaignArtwork cloudName={cloudName} key={page.slug} page={page} />),
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

export async function HomeEditorial() {
  const ar = await getLocale() === 'ar';
  return (
    <nav className="home-collection-links" aria-label={ar ? 'مجموعات العناية' : 'Care collections'}>
      <Link href="/collections/skin-essentials">{ar ? 'العناية بالبشرة' : 'Skincare essentials'}</Link>
      <Link href="/collections/baby-care">{ar ? 'العناية بالطفل' : 'Baby and family care'}</Link>
      <Link href="/collections/daily-care">{ar ? 'العناية اليومية' : 'Everyday personal care'}</Link>
    </nav>
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
