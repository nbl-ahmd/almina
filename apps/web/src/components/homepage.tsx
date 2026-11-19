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
  const locale = await getLocale();
  const ar = locale === 'ar';
  const collections = [
    { slug: 'skin-essentials', scene: 'skincare', label: ar ? 'أساسيات العناية بالبشرة' : 'Skincare essentials' },
    { slug: 'baby-care', scene: 'family', label: ar ? 'العناية بالطفل والأسرة' : 'Baby and family care' },
  ];
  return (
    <section aria-label={ar ? 'مجموعات العناية' : 'Care collections'}>
      <SectionHeading title={ar ? 'تسوق حسب احتياجاتك' : 'Shop by need'} href="/collections/daily-care" link={ar ? 'العناية اليومية' : 'Everyday care'} />
      <div className="home-editorial-grid">
        {collections.map(({ slug, scene, label }) => (
          <Link key={slug} href={`/collections/${slug}`} className="home-editorial-banner" aria-label={`${label}. ${ar ? 'تسوق المجموعة' : 'Shop collection'}`}>
            <Image src={`/design/campaigns/${scene}-${locale}.webp`} alt="" width={960} height={320}
              sizes="(min-width: 1240px) 588px, (min-width: 768px) 47vw, calc(100vw - 32px)" />
          </Link>
        ))}
      </div>
    </section>
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
