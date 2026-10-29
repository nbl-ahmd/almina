import { getWebEnvironment } from '../lib/server/env';
import { CampaignArtwork } from './campaign-artwork';
import type { GrowthPage } from '@almina/contracts';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { CategoryTile } from "./category-tile";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheckIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import {
  ProductPhoto as Photo,
  ProductPrice as Price,
  ProductCard,
  CompactProductCard,
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
    <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
      <div className="min-w-0">
        <h2 className="m-0 text-[22px] font-semibold tracking-[-0.03em] text-ink md:text-[28px]">
          {u(locale,title)}
        </h2>
        {description ? (
          <p className="mt-1 mb-0 max-w-[52ch] text-[13px] leading-5 text-muted md:text-sm">
            {u(locale,description)}
          </p>
        ) : null}
      </div>
      <Link
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 text-xs font-medium text-ink transition-colors hover:border-ink md:text-[13px]"
        href={href}
      >
        {u(locale,link)}
        <ArrowUpRightIcon className="size-3.5" />
      </Link>
    </div>
  );
}

export async function HomeHero({ products, banners = [], campaigns = [] }: { products: Product[]; banners?: Banner[]; campaigns?: GrowthPage[] }) {
  const locale = await getLocale();
  const product = products.find(item => productImage(item) !== "/product-placeholder.svg");
  const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
  const slides = [
    { image: '/design/home/skincare-campaign.webp', title: locale === 'ar' ? 'عناية لكل يوم.' : 'Care for your everyday.', detail: locale === 'ar' ? 'الصحة والجمال واحتياجات العائلة من صيدلية الميناء في رأس الخيمة.' : 'Health, beauty and family essentials. From your neighbourhood pharmacy in Ras Al Khaimah.', href: '/products', cta: locale === 'ar' ? 'تسوق المنتجات' : 'Shop the essentials', tone: 'bg-care-blue' },
    { image: '/design/home/family-campaign.webp', title: u(locale,'Little essentials. Lots of care.'), detail: u(locale,'Discover baby and family care essentials.'), href: '/collections/baby-care', cta: u(locale,'Explore now '), tone: 'bg-care-peach' },
  ];
  return <section className="home-hero" aria-label={u(locale,'Discover Al Mina')}>
    <h1 className="sr-only">{u(locale,'Al Mina Pharmacy — health, beauty and everyday care')}</h1>
    <CampaignSlider locale={locale} label={u(locale,'Pharmacy promotions')} controlLabel={u(locale,'promotion')}>
      {[
        ...heroCampaigns.map((page,index) => <CampaignArtwork cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} key={page.slug} page={page} eager={index===0} />),
        ...banners.slice(0,8).map((banner,index) => {
          const artwork=<div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-care-blue md:aspect-[2.7/1]"><Image src={banner.image} alt={banner.name} fill sizes="(max-width:767px) 100vw, 1280px" loading={index===0&&!heroCampaigns.length?'eager':'lazy'} fetchPriority={index===0&&!heroCampaigns.length?'high':undefined} className="object-contain" /></div>;
          return banner.href?<Link href={banner.href} key={banner.image} className="block">{artwork}</Link>:<div key={banner.image}>{artwork}</div>;
        }),
        ...(!heroCampaigns.length&&!banners.length ? slides.map((slide,index) => <div key={slide.href} className={`relative isolate grid min-h-[340px] overflow-hidden rounded-2xl md:min-h-[410px] md:grid-cols-2 ${slide.tone}`}>
          <div className="relative z-10 flex flex-col items-start justify-center px-5 pt-7 pb-20 md:px-10 md:py-12">
            <h2 className="mb-4 max-w-5xl text-[clamp(2.25rem,4.5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] max-md:max-w-[9ch]">{slide.title}</h2>
            <p className="mb-6 max-w-[38ch] text-sm leading-6 text-ocean max-md:max-w-[23ch]">{slide.detail}</p>
            <div className="flex flex-wrap gap-2"><Link href={slide.href} className="button button-accent min-h-12 gap-3 px-5 text-sm">{slide.cta}<ArrowRightIcon className="size-4 rtl:rotate-180" /></Link><Link href="/offers" className="inline-flex min-h-12 items-center px-3 text-sm font-medium text-ink hover:text-teal">{u(locale,'Offers')}<ArrowUpRightIcon className="ms-2 size-4" /></Link></div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 end-0 -z-10 w-[46%] md:relative md:inset-auto md:z-0 md:w-full"><Image src={slide.image} alt="" fill sizes="(max-width:767px) 46vw, 640px" loading={index===0?'eager':'lazy'} fetchPriority={index===0?'high':undefined} className="object-cover object-right max-md:opacity-70" /></div>
          {product&&index===0 ? <Link href={productHref(product)} className="absolute end-5 bottom-5 z-10 hidden max-w-[280px] items-center gap-3 rounded-xl bg-white p-3 text-ink md:flex"><span className="size-14 shrink-0"><Photo product={product} /></span><div className="min-w-0"><span className="mb-1 block line-clamp-2 text-xs font-medium">{product.name}</span><div className="text-sm"><Price product={product} /></div></div><ArrowUpRightIcon className="size-4 shrink-0" /></Link>:null}
        </div>):[]),
      ]}
    </CampaignSlider>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-b border-border pb-3 text-xs text-ocean"><span>{locale==='ar'?'صيدلية الميناء · رأس الخيمة':'Al Mina Pharmacy · Ras Al Khaimah'}</span><Link href="/contact" className="inline-flex min-h-11 items-center gap-2 font-medium text-ink"><ChatBubbleLeftRightIcon className="size-4" />{u(locale,'Product and order questions, answered by our team.')}<ArrowUpRightIcon className="size-4 shrink-0" /></Link></div>
  </section>;
}

export async function HomeCategories({ categories }: { categories: Category[] }) {
  const locale=await getLocale();if(!categories.length)return null;
  const selected=categories.slice(0,5),bento=selected.length===5;
  return <section aria-label={u(locale,'Shop by care')}><SectionHeading title={u(locale,'Shop by care')} href="/categories" link={u(locale,'All categories')} /><div className={`grid-flow-dense gap-3 ${bento?'scrollbar-none flex snap-x snap-proximity overflow-x-auto overscroll-x-contain pb-2 lg:grid lg:grid-cols-4 lg:grid-rows-2':'grid grid-cols-2 md:grid-cols-4'}`}>{selected.map((category,index)=><div key={category._id} className={`${bento&&index===0?'lg:col-span-2 lg:row-span-2':''} min-w-[170px] snap-start lg:min-w-0 [&>a]:h-full [&>a]:min-h-[170px] lg:[&>a]:min-h-[170px] ${bento&&index===0?'lg:[&>a]:min-h-full lg:[&_h3]:text-3xl':''}`} data-editorial-stack><CategoryTile category={category} /></div>)}</div></section>;
}

export async function HomeProductCarousel({ products }: { products: Product[] }) {
  const locale = await getLocale();
  const slides = products.filter(product => product.stock > 0).slice(0,4);
  if (!slides.length) return null;
  return <section aria-label={u(locale,"Featured product highlights")}><SectionHeading title={u(locale,"In the spotlight")} description={u(locale,"A closer look at products from our current range.")} href="/categories" /><CampaignSlider locale={locale} label={u(locale,"Featured product highlights")} controlLabel={u(locale,"product")}>
    {slides.map((product,index) => <article key={product._id} className={`grid items-center gap-5 overflow-hidden rounded-2xl p-5 md:grid-cols-2 md:px-10 md:py-8 ${index%2 ? 'bg-care-peach' : 'bg-care-blue'}`}>
      <Link href={productHref(product)} className="block h-44 rounded-2xl bg-white p-5 md:order-2 md:h-72" aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}><Photo product={product} /></Link>
      <div className="min-w-0 md:order-1"><p className="mb-2 text-xs font-medium tracking-[0.08em] text-muted uppercase">{product.brand || product.familyBrand || product.category.name}</p><h3 className="mb-3 max-w-[24ch] text-2xl leading-[1.1] font-semibold tracking-[-0.03em] md:text-4xl">{product.familyName || product.name}</h3>{product.summary ? <p className="mb-4 line-clamp-2 max-w-[48ch] text-sm leading-6 text-muted">{product.summary}</p> : null}<div className="mb-5 text-xl md:text-2xl"><Price product={product} /></div><Link href={productHref(product)} className="button min-h-11 rounded-full text-sm">{u(locale,"Explore product ")}<ArrowRightIcon className="rtl:rotate-180 size-4" /></Link></div>
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}

export async function HomeEditorial() {
 const locale=await getLocale();
 const stories=[
  {title:u(locale,'The skincare shelf'),detail:u(locale,'Explore cleansers, moisturisers and daily skincare from our current range.'),image:'/design/home/skincare-campaign.webp',href:'/collections/skin-essentials',tone:'bg-care-mint'},
  {title:u(locale,'Care for their little world'),detail:u(locale,'Discover baby care, feeding and everyday family essentials.'),image:'/design/home/family-campaign.webp',href:'/collections/baby-care',tone:'bg-care-peach'},
  {title:u(locale,'Everyday personal care'),detail:u(locale,'Browse body, hair and personal care products for your daily routine.'),image:'/design/home/wellness-editorial.webp',href:'/collections/daily-care',tone:'bg-care-blue'},
 ];
 return <section aria-label={u(locale,'Explore care collections')}><SectionHeading title={u(locale,'Explore care collections')} href="/categories" /><div className="flex flex-col gap-3 md:flex-row">{stories.map((story,index)=><details key={story.href} name="home-care-stories" open={index===0} className={`group/story relative min-w-0 overflow-hidden rounded-2xl md:flex-1 md:open:flex-[2] ${story.tone}`} data-editorial-stack><summary className="relative z-10 flex min-h-20 cursor-pointer list-none items-start justify-between gap-3 p-5 text-lg font-semibold md:min-h-[380px] md:group-open/story:min-h-24 md:text-xl"><span className="relative z-10 max-w-[16ch]">{story.title}</span><Image src={story.image} alt="" width={600} height={300} sizes="300px" className="pointer-events-none absolute inset-x-4 bottom-4 hidden h-52 w-[calc(100%-2rem)] rounded-xl object-cover object-right md:block md:group-open/story:hidden" /><ArrowUpRightIcon className="size-5 shrink-0 transition-transform group-open/story:rotate-90" /></summary><div className="relative px-5 pb-5"><p className="relative z-10 mb-5 max-w-[28ch] text-sm leading-6 text-ocean">{story.detail}</p><Image src={story.image} alt="" width={600} height={300} sizes="(max-width:767px) 90vw, 600px" className="mb-4 h-40 w-full rounded-xl object-cover object-right" /><Link href={story.href} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">{u(locale,'Explore products')}<ArrowRightIcon className="size-4 rtl:rotate-180" /></Link></div></details>)}</div></section>;
}

export async function HomeSupport() {
  const locale = await getLocale();
  return (
    <section className="relative overflow-hidden rounded-2xl bg-ink px-6 py-8 text-white md:px-10 md:py-12">
      <div className="absolute -top-24 -right-16 size-72 rounded-full border border-white/10" aria-hidden="true" />
      <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <span className="mb-5 flex size-11 items-center justify-center rounded-full bg-white/10">
            <ChatBubbleLeftRightIcon className="size-5" />
          </span>
          <h2 data-reveal-text className="mb-3 max-w-[26ch] text-2xl leading-[1.1] font-semibold tracking-[-0.03em] md:text-[34px]">
            {locale === "en" ? <>Your neighbourhood pharmacy, just a conversation away.</> : <>صيدليتك القريبة، على بُعد محادثة.</>}
          </h2>
          <p className="mb-0 max-w-[44ch] text-sm leading-6 text-white/80">{u(locale,"Speak to Al Mina for product and order enquiries.")}</p>
        </div>
        <div className="flex flex-wrap md:justify-end">
          <Link href="/contact" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-white/90">{u(locale,"Let’s talk ")}<ArrowRightIcon className="rtl:rotate-180 size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function HomeBenefits() {
  const locale = await getLocale();
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-white/60 px-2 py-4 text-xs text-muted md:gap-6 md:px-6 md:py-4 md:text-[13px]">
      {[
        { icon: ShieldCheckIcon, label: "Shop with clear product details" },
        { icon: TruckIcon, label: "Delivery details at checkout" },
        {
          icon: ChatBubbleLeftRightIcon,
          label: "Help from your local pharmacy",
        },
      ].map(({ icon: BenefitIcon, label }) => (
        <div
          key={u(locale,label)}
          className="flex flex-col items-center gap-2 text-center md:flex-row md:justify-center md:text-left"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-teal">
            <BenefitIcon className="size-4" />
          </span>
          {u(locale,label)}
        </div>
      ))}
    </div>
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
    tone: string;
  }[];
}) {
  const locale = await getLocale();
  const visible = collections.filter(
    (collection) => collection.products.length >= 2,
  );
  if (!visible.length) return null;
  return (
    <section
      data-scroll-reveal
      aria-label={u(locale,"Featured collections")}
      className={`grid gap-3 md:gap-4 ${visible.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
    >
      {visible.slice(0, 4).map((collection) => (
        <div
          key={collection.href}
          className={`grid grid-cols-[1fr_0.78fr] items-stretch gap-3 overflow-hidden rounded-2xl p-4 md:p-5 ${visible.length === 1 ? "md:grid-cols-[1fr_240px]" : ""} ${collection.tone}`}
        >
          <div className="flex flex-col justify-between py-1">
            <div>
              <h2 className="mb-2 text-xl leading-[1.1] font-semibold tracking-[-0.025em] text-ink md:text-2xl">
                {u(locale,collection.title)}
              </h2>
              <p className="mb-3 max-w-[34ch] text-xs leading-5 text-ocean">
                {u(locale,collection.detail)}
              </p>
            </div>
            <Link
              href={collection.href}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
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
      <div className="brand-rail flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-2 md:flex-wrap">
        {brands.map((brand) => {
          const match = products.find(product => ((product.brand || product.familyBrand)?.toLowerCase() === brand.toLowerCase() || product.name.toLowerCase().startsWith(brand.toLowerCase())) && productImage(product) !== "/product-placeholder.svg");
          return (
            <Link
              href={`/search?q=${encodeURIComponent(brand)}`}
              key={brand}
              className="group flex min-h-14 min-w-[180px] shrink-0 snap-start items-center gap-3 rounded-xl border border-border bg-white py-2 pr-3 pl-2 text-sm font-medium tracking-[-0.01em] text-ink transition-colors hover:border-ink"
            >
              {match ? <span className="block size-10 shrink-0 overflow-hidden rounded-full bg-subtle p-1.5"><Photo product={match} /></span> : <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-teal">{brand.slice(0,1).toUpperCase()}</span>}
              <span className="min-w-0 flex-1 truncate">{brand}</span><ArrowUpRightIcon className="size-3.5 shrink-0 text-muted transition-colors group-hover:text-ink" />
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
    <section className="rounded-2xl border border-border bg-white p-4 md:p-6">
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
            className="grid grid-cols-[72px_1fr] items-center gap-3 rounded-2xl bg-page p-3"
          >
            <Link
              href={productHref(product)}
              aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}
              className="block size-[72px] rounded-[14px] bg-white p-1.5"
            >
              <Photo product={product} />
            </Link>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold tracking-[0.1em] text-teal uppercase">{u(locale,title)}</p>
              <h3 className="mb-1.5 text-sm leading-5 font-medium">
                <Link
                  href={productHref(product)}
                  className="text-ink hover:text-teal"
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
      <p className="mt-4 mb-0 text-xs leading-5 text-muted">
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
      <div className="scrollbar-none flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-1 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <CompactProductCard key={product._id} product={product} />
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
