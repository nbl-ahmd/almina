import { getWebEnvironment } from '../lib/server/env';
import { CampaignArtwork } from './campaign-artwork';
import type { GrowthPage } from '@almina/contracts';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { CategoryTile } from "./category-tile";
import Image from "next/image";
import Link from './app-link';
import {
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  ChevronRightIcon,
} from './storefront-icons';
import {
  ProductPhoto as Photo,
  ProductPrice as Price,
  ProductCard,
} from "./product-card";
import { CampaignSlider } from "./campaign-slider";
import {
  productHref,
  type Category,
  type Product,
} from "../lib/catalog/model";
import { productImage } from "../lib/server/catalog";

type Banner = { image: string; name: string; href: string | null };

/** Shared editorial heading: quiet type, pill link, consistent section rhythm. */
async function SectionHeading({
  title,
  href,
  link = "View all",
  description,
}: {
  title: string;
  href: string;
  link?: string;
  description?: string;
}) {
  const locale = await getLocale();
  return (
    <div className="section-heading">
      <div className="min-w-0">
        <h2 className="section-title">
          {u(locale,title)}
        </h2>
        {description ? (
          <p className="section-description">
            {u(locale,description)}
          </p>
        ) : null}
      </div>
      <Link className="section-link" href={href}>
        {u(locale,link)}
        <ChevronRightIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </div>
  );
}

export async function HomeHero({ products, banners = [], campaigns = [] }: { products: Product[]; banners?: Banner[]; campaigns?: GrowthPage[] }) {
  const locale = await getLocale();
  const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
  void products;
  return <section className="home-hero" aria-label={u(locale, 'Discover Al Mina')}>
    <h1 className="sr-only">{u(locale, 'Al Mina Pharmacy — health, beauty and everyday care')}</h1>
    <CampaignSlider locale={locale} label={u(locale, 'Pharmacy promotions')} controlLabel={u(locale, 'promotion')}>
      {[
        ...heroCampaigns.map((page, index) => <CampaignArtwork cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} key={page.slug} page={page} eager={index === 0} />),
        ...banners.slice(0, 8).map((banner, index) => {
          const artwork = <div className="catalog-banner-artwork"><Image src={banner.image} alt={banner.name} fill sizes="(max-width:899px) 100vw, 1280px" loading={index === 0 && !heroCampaigns.length ? 'eager' : 'lazy'} className="object-contain" /></div>;
          return banner.href ? <Link href={banner.href} key={banner.image}>{artwork}</Link> : <div key={banner.image}>{artwork}</div>;
        }),
        ...(!heroCampaigns.length && !banners.length ? [<div key="everyday" className="fallback-campaign">
          <div className="campaign-copy">
            <h2>{locale === 'ar' ? 'عناية لكل يوم.' : 'Care for your everyday.'}</h2>
            <p>{locale === 'ar' ? 'الصحة والجمال واحتياجات العائلة.' : 'Health, beauty and family essentials.'}</p>
            <Link href="/products" className="campaign-link">{locale === 'ar' ? 'تسوق المنتجات' : 'Shop products'}<ArrowRightIcon aria-hidden="true" /></Link>
          </div>
          <Image className="campaign-subject" src="/design/campaigns/almina-care-courier.png" alt="" width={1254} height={1254} sizes="(max-width:899px) 45vw, 540px" loading="eager" />
        </div>,
        ...[
          {key:'skincare',href:'/collections/skin-essentials',title:locale==='ar'?'أساسيات العناية بالبشرة':'Skincare essentials',body:locale==='ar'?'اكتشف منتجات العناية اليومية بالبشرة.':'Explore your daily skincare shelf.',image:'/design/campaigns/skincare-'+locale+'.webp'},
          {key:'personal',href:'/collections/daily-care',title:locale==='ar'?'عناية شخصية لكل يوم':'Personal care, every day',body:locale==='ar'?'تسوق منتجات العناية بالجسم والشعر.':'Discover body, hair and personal care.',image:'/design/campaigns/personal-care-'+locale+'.webp'},
        ].map(slide=><div key={slide.key} className="fallback-campaign secondary-campaign"><div className="campaign-copy"><h2>{slide.title}</h2><p>{slide.body}</p><Link href={slide.href} className="campaign-link">{locale==='ar'?'تسوق المجموعة':'Shop collection'}<ArrowRightIcon aria-hidden="true" /></Link></div><Image className="campaign-collection-art" src={slide.image} alt="" width={960} height={320} sizes="(max-width:899px) 50vw, 640px" /></div>)
        ] : []),
      ]}
    </CampaignSlider>
  </section>;
}

export async function HomeCategories({ categories }: { categories: Category[] }) {
  const locale=await getLocale();if(!categories.length)return null;
  return <section aria-label={u(locale, 'Shop by care')}>
    <SectionHeading title={u(locale, 'Shop by care')} href="/categories" link={u(locale, 'All categories')} />
    <div className="home-categories">{categories.slice(0, 8).map(category => <CategoryTile key={category._id} category={category} />)}</div>
  </section>;
}

export async function HomeProductCarousel({ products }: { products: Product[] }) {
  const locale = await getLocale();
  const slides = products.filter(product => product.stock > 0).slice(0,4);
  if (!slides.length) return null;
  return <section aria-label={u(locale,"Featured product highlights")}><SectionHeading title={u(locale,"In the spotlight")} description={u(locale,"A closer look at products from our current range.")} href="/categories" /><CampaignSlider locale={locale} label={u(locale,"Featured product highlights")} controlLabel={u(locale,"product")}>
    {slides.map(product => <article key={product._id} className="grid items-center gap-5 overflow-hidden rounded-2xl p-5 md:grid-cols-2 md:px-10 md:py-8">
      <Link href={productHref(product)} className="block h-44 rounded-2xl bg-white p-5 md:order-2 md:h-72" aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}><Photo product={product} /></Link>
      <div className="min-w-0 md:order-1"><p className="mb-2 text-xs font-medium tracking-[0.08em] uppercase">{product.brand || product.familyBrand || product.category.name}</p><h3 className="mb-3 max-w-[24ch] text-2xl leading-[1.1] font-semibold tracking-[-0.03em] md:text-4xl">{product.familyName || product.name}</h3>{product.summary ? <p className="mb-4 line-clamp-2 max-w-[48ch] text-sm leading-6">{product.summary}</p> : null}<div className="mb-5 text-xl md:text-2xl"><Price product={product} /></div><Link href={productHref(product)} className="button min-h-11 rounded-full text-sm">{u(locale,"Explore product ")}<ArrowRightIcon className="rtl:rotate-180 size-4" /></Link></div>
    </article>)}
  </CampaignSlider></section>;
}

export async function HomeShelf({
  products,
  title,
  description,
  href,
}: {
  products: Product[];
  title: string;
  description: string;
  href: string;
}) {
  const locale = await getLocale();
  if (!products.length) return null;
  return (
    <section>
      <SectionHeading title={u(locale,title)} description={u(locale,description)} href={href} />
      {/* Talabat shelves: one swipeable row of compact tiles on phones, a single six-across row on desktop. */}
      <div className="home-product-grid qc-rail">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}

export async function HomeSupport() {
  const locale = await getLocale();
  // 1mg-style help row: one quiet line to the pharmacy, not a dark campaign card.
  return (
    <section className="home-help" aria-label={u(locale,"Speak to Al Mina for product and order enquiries.")}>
      <Link href="/contact" className="cart-help-row">
        <ChatBubbleLeftRightIcon className="pdp-info-icon" aria-hidden="true" />
        <span><strong>{locale === "en" ? "Questions about a product?" : "لديك سؤال عن منتج؟"}</strong><small>{u(locale,"Speak to Al Mina for product and order enquiries.")}</small></span>
        <ChevronRightIcon className="pdp-info-chevron rtl:rotate-180" aria-hidden="true" />
      </Link>
    </section>
  );
}

export async function HomeBannerStrip({
  banners,
}: {
  banners: { image: string; name: string; href: string | null }[];
}) {
  const locale = await getLocale();
  if (!banners.length) return null;
  return (
    <section
      aria-label={u(locale,"Pharmacy campaigns")}
      className={`grid gap-3 md:gap-4 ${banners.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
    >
      {banners.slice(0, 2).map((banner) => {
        const artwork = (
          <Image
            src={banner.image}
            alt={banner.name}
            width={1200}
            height={400}
            sizes="(max-width: 767px) 100vw, 50vw"
            className="h-auto w-full rounded-2xl"
          />
        );
        return banner.href ? (
          <Link
            key={banner.image}
            href={banner.href}
            className="block overflow-hidden rounded-2xl focus-visible:outline-offset-4"
            {...(banner.href.startsWith("https:")
              ? { rel: "noopener noreferrer" }
              : {})}
          >
            {artwork}
          </Link>
        ) : (
          <div key={banner.image}>{artwork}</div>
        );
      })}
    </section>
  );
}

export async function HomeCollectionTiles({
  collections,
}: {
  collections: {
    title: string;
    detail: string;
    href: string;
    products: Product[];
  }[];
}) {
  const locale = await getLocale();
  const visible = collections.filter(
    (collection) => collection.products.length >= 2,
  );
  if (!visible.length) return null;
  return (
    <section
      aria-label={u(locale,"Featured collections")}
      className="home-collections"
    >
      {visible.slice(0, 4).map((collection) => (
        <div
          key={collection.href}
          className="home-collection"
        >
          <div className="flex flex-col justify-between py-1">
            <div>
              <h2 className="mb-2 text-xl leading-[1.1] font-semibold tracking-[-0.025em] md:text-2xl">
                {u(locale,collection.title)}
              </h2>
              <p className="mb-3 max-w-[34ch] text-xs leading-5">
                {u(locale,collection.detail)}
              </p>
            </div>
            <Link
              href={collection.href}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold transition-colors hover:text-white"
            >{u(locale,"Shop collection ")}<ArrowRightIcon className="rtl:rotate-180 size-3.5" />
            </Link>
          </div>
          <Link
            href={productHref(collection.products[0]!)}
            aria-label={locale === "en" ? `View ${collection.products[0]!.name}` : `عرض ${collection.products[0]!.name}`}
            className="block min-h-[150px] overflow-hidden rounded-2xl bg-white p-3"
          >
            <Photo product={collection.products[0]!} />
          </Link>
        </div>
      ))}
    </section>
  );
}

export async function HomeBrandStrip({ brands, products }: { brands: string[]; products: Product[] }) {
  const locale = await getLocale();
  if (!brands.length) return null;
  return (
    <section>
      <SectionHeading
        title={u(locale,"Find your familiar brands")}
        href="/categories"
        link={u(locale,"Explore products")}
      />
      {/* Talabat "Big brands near you": square logo wells with the name underneath, in one swipeable row. */}
      <div className="qc-brand-rail">
        {brands.map((brand) => {
          const match = products.find(product => ((product.brand || product.familyBrand)?.toLowerCase() === brand.toLowerCase() || product.name.toLowerCase().startsWith(brand.toLowerCase())) && productImage(product) !== "/product-placeholder.svg");
          return (
            <Link
              href={`/search?q=${encodeURIComponent(brand)}`}
              key={brand}
              className="qc-brand"
            >
              {match ? <span className="qc-brand-mark"><Photo product={match} /></span> : <span className="qc-brand-mark qc-brand-initial">{brand.slice(0,1).toUpperCase()}</span>}
              <span className="qc-brand-name">{brand}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export async function HomeRoutine({ products }: { products: Product[] }) {
  const locale = await getLocale();
  const steps = [
    { title: "Cleanse", pattern: /cleanser|cleansing|face wash/i },
    { title: "Moisturise", pattern: /moisturi|cream|lotion/i },
    { title: "Protect", pattern: /sunscreen|sunblock|spf/i },
  ].flatMap((step) => {
    const product = products.find(
      (item) =>
        step.pattern.test(item.name) &&
        item.stock > 0 &&
        productImage(item) !== "/product-placeholder.svg",
    );
    return product ? [{ title: step.title, product }] : [];
  });
  if (steps.length < 2) return null;
  return (
    <section className="home-routine">
      <SectionHeading
        title={u(locale,"Make space for daily skincare")}
        description={u(locale,"Explore individual products for your routine.")}
        href="/collections/skin-essentials"
        link={u(locale,"Shop skincare")}
      />
      <div
        className={`grid gap-3 ${steps.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {steps.map(({ title, product }) => (
          <article
            key={product._id}
            className="home-routine-step"
          >
            <Link
              href={productHref(product)}
              aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}
              className="block size-[72px] rounded-[14px] bg-white p-1.5"
            >
              <Photo product={product} />
            </Link>
            <div className="min-w-0">
              <p className="home-routine-label">{u(locale,title)}</p>
              <h3 className="mb-1.5 text-sm leading-5 font-medium">
                <Link
                  href={productHref(product)}

                >
                  {product.name}
                </Link>
              </h3>
              <div className="text-sm">
                <Price product={product} />
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4 mb-0 text-xs leading-5">
        {locale === "en" ? "Sold individually. Check each product’s details for suitability and directions." : "تُباع منفردة. تحقق من تفاصيل كل منتج للتأكد من ملاءمته وطريقة استخدامه."}
      </p>
    </section>
  );
}

export async function HomeCompactShelf({
  title,
  description,
  products,
  href,
}: {
  title: string;
  description: string;
  products: Product[];
  href: string;
}) {
  const locale = await getLocale();
  if (!products.length) return null;
  return (
    <section>
      <SectionHeading title={u(locale,title)} description={u(locale,description)} href={href} />
      <div className="home-product-grid qc-rail">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function HomeManagedCampaigns({ campaigns }: { campaigns: GrowthPage[] }) {
  const supporting = campaigns.filter(page=>page.homepagePlacement==='secondary');
  if(!supporting.length)return null;
  return <section className="grid gap-3 md:grid-cols-2 md:gap-4" aria-label={supporting[0]?.locale==='ar'?'حملات الصيدلية':'Pharmacy campaigns'}>{supporting.map(page=><CampaignArtwork cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} key={page.slug} page={page} />)}</section>;
}
