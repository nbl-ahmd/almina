import { CategoryTile } from "./category-tile";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheckIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
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
export function HomeHero({
  products,
  banners = [],
}: {
  products: Product[];
  banners?: Banner[];
}) {
  const product = products[0];
  const fallback = [
    {
      image: "/design/home/skincare-campaign.webp",
      title: "Good skin days start here.",
      detail: "Cleansers, moisturisers and everyday skincare.",
      href: "/collections/skin-essentials",
      tone: "bg-[#eef7ef]",
    },
    {
      image: "/design/home/family-campaign.webp",
      title: "Little essentials. Lots of care.",
      detail: "Discover baby and family care essentials.",
      href: "/collections/baby-care",
      tone: "bg-[#fff2e9]",
    },
  ];
  const artwork = banners.slice(0, 8);
  return (
    <section
      aria-label="Discover Al Mina"
      className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(240px,1fr)]"
    >
      <h1 className="sr-only">
        Al Mina Pharmacy — health, beauty and everyday care
      </h1>
      <div className="min-w-0">
        <CampaignSlider label="Pharmacy promotions" controlLabel="promotion">
          {artwork.length
            ? artwork.map((banner, index) => {
                const image = (
                  <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-[#f5f5fb] md:aspect-[2.7/1]">
                    <Image
                      src={banner.image}
                      alt={banner.name}
                      fill
                      sizes="(max-width: 1023px) 100vw, 75vw"
                      loading={index === 0 ? "eager" : "lazy"}
                      className="object-contain"
                    />
                  </div>
                );
                return banner.href ? (
                  <Link href={banner.href} key={banner.image} className="block">
                    {image}
                  </Link>
                ) : (
                  <div key={banner.image}>{image}</div>
                );
              })
            : fallback.map((slide, index) => (
                <div
                  key={slide.href}
                  className={`relative flex min-h-[230px] items-center overflow-hidden rounded-2xl p-5 md:min-h-[310px] md:p-8 ${slide.tone}`}
                >
                  <Image
                    src={slide.image}
                    alt=""
                    fill
                    sizes="(max-width: 1023px) 100vw, 75vw"
                    loading={index === 0 ? "eager" : "lazy"}
                    className="object-cover object-right"
                  />
                  <div className="relative z-10 max-w-[48%]">
                    <h2 className="mb-3 text-[clamp(1.55rem,3vw,2.8rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-[#193c35]">
                      {slide.title}
                    </h2>
                    <p className="mb-4 hidden max-w-[30ch] text-sm leading-6 text-[#415a4d] sm:block">
                      {slide.detail}
                    </p>
                    <Link
                      href={slide.href}
                      className="button min-h-11 rounded-full px-4 text-xs md:text-sm"
                    >
                      Explore now <ArrowRightIcon className="size-4" />
                    </Link>
                  </div>
                </div>
              ))}
        </CampaignSlider>
      </div>
      {product ? (
        <article className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-white p-3 lg:mb-[52px] lg:flex lg:flex-col lg:items-stretch">
          <Link
            className="block size-18 overflow-hidden rounded-xl bg-white lg:h-36 lg:w-full"
            href={productHref(product)}
            aria-label={`View ${product.name}`}
          >
            <Photo product={product} eager />
          </Link>
          <div className="min-w-0">
            <h2 className="mb-2 text-sm leading-5 font-medium">
              <Link
                className="text-ink hover:text-brand"
                href={productHref(product)}
              >
                {product.familyName || product.name}
              </Link>
            </h2>
            <div className="text-base">
              <Price product={product} />
            </div>
          </div>
          <Link
            href={productHref(product)}
            aria-label={`Shop ${product.name}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-subtle text-brand lg:mt-auto lg:w-full lg:rounded-xl"
          >
            <span className="hidden text-xs font-medium lg:inline">
              Shop product
            </span>
            <ArrowRightIcon className="size-4" />
          </Link>
        </article>
      ) : null}
    </section>
  );
}
export function HomeCategories({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return <section><SectionHeading title="Explore your everyday care" href="/categories" link="All categories" /><div className="scrollbar-none grid auto-cols-[minmax(142px,1fr)] grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-1 sm:auto-cols-[minmax(190px,1fr)] lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-4">{categories.slice(0,8).map(category => <CategoryTile key={category._id} category={category} />)}</div></section>;
}
export function HomeProductCarousel({ products }: { products: Product[] }) {
  const slides = products.filter(product => product.stock > 0).slice(0,4);
  if (!slides.length) return null;
  return <section aria-label="Featured product highlights"><SectionHeading title="In the spotlight" description="A closer look at products from our current range." href="/products" /><CampaignSlider label="Featured product highlights" controlLabel="product">
    {slides.map((product,index) => <article key={product._id} className={`grid items-center gap-4 overflow-hidden rounded-2xl p-5 md:grid-cols-2 md:px-10 md:py-6 ${index%2 ? 'bg-[#fff0e7]' : 'bg-[#eeedfc]'}`}>
      <Link href={productHref(product)} className="block h-40 rounded-2xl bg-white p-4 md:order-2 md:h-64" aria-label={`View ${product.name}`}><Photo product={product} /></Link>
      <div className="min-w-0 md:order-1"><h3 className="mb-3 max-w-[25ch] text-xl leading-tight font-semibold md:text-3xl">{product.familyName || product.name}</h3>{product.summary ? <p className="mb-3 line-clamp-2 max-w-[48ch] text-sm leading-6 text-muted">{product.summary}</p> : null}<div className="mb-4 text-xl md:text-2xl"><Price product={product} /></div><Link href={productHref(product)} className="button min-h-11 rounded-full text-sm">Explore product <ArrowRightIcon className="size-4" /></Link></div>
    </article>)}
  </CampaignSlider></section>;
}
function SectionHeading({
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
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <div>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight md:text-[26px]">
          {title}
        </h2>
        {description ? (
          <p className="mb-0 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      <Link
        className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium text-brand md:gap-2 md:text-sm"
        href={href}
      >
        {link}
        <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
}
export function HomeShelf({
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
  if (!products.length) return null;
  return (
    <section>
      <SectionHeading title={title} description={description} href={href} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
export function HomeEditorial() {
  return (
    <section
      className="grid gap-4 md:grid-cols-2"
      data-scroll-reveal
      aria-label="Explore care collections"
    >
      <Link
        className="group relative flex min-h-[200px] items-center overflow-hidden rounded-3xl bg-[#eeecfa] p-6 text-ink md:min-h-[220px] md:p-6"
        href="/search?q=skin"
      >
        <div className="relative z-10 max-w-[45%]">
          <h2 className="mb-3 text-[26px] font-medium leading-tight tracking-tight">
            Your skin.
            <br />
            Your daily ritual.
          </h2>
          <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#263261]">
            Explore skincare <ArrowRightIcon className="size-4" />
          </span>
        </div>
        <Image
          src="/design/home/wellness-editorial.webp"
          alt=""
          width={768}
          height={512}
          sizes="(max-width: 767px) 100vw, 50vw"
          className="absolute inset-y-0 right-0 h-full w-[52%] object-cover object-right"
        />
      </Link>
      <Link href="/collections/baby-care" className="group relative isolate flex min-h-[200px] items-center overflow-hidden rounded-3xl bg-[#fff0e8] p-6 text-ink md:min-h-[220px]">
        <Image src="/design/home/family-campaign.webp" alt="" fill sizes="(max-width:767px) 100vw, 50vw" className="-z-10 object-cover object-right" />
        <div className="max-w-[48%]"><h2 className="mb-3 text-2xl font-medium leading-tight tracking-tight md:text-[26px]">For their little world.</h2><span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#80402d]">Explore baby care <ArrowRightIcon className="size-4" /></span></div>
      </Link>
    </section>
  );
}
export function HomeSupport() {
  return (
    <section className="grid gap-5 rounded-3xl bg-[#edf1ff] px-5 py-5 md:grid-cols-[1.2fr_1fr] md:items-center md:px-9">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand">
          <ChatBubbleLeftRightIcon className="size-6" />
        </span>
        <div>
          <h2 className="mb-2 text-xl font-medium md:text-2xl">
            Your neighbourhood pharmacy,
            <br className="hidden md:block" /> just a conversation away.
          </h2>
          <p className="mb-0 text-sm text-muted">
            Speak to Al Mina for product and order enquiries.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 md:justify-end">
        <Link href="/contact" className="button rounded-full px-5 text-sm">
          Let’s talk <ArrowRightIcon className="size-4" />
        </Link>
        <a
          className="button button-secondary rounded-full px-5 text-sm"
          href="tel:+971504825007"
        >
          Call pharmacy
        </a>
      </div>
    </section>
  );
}
export function HomeBenefits() {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border pb-5 text-center text-[11px] text-muted md:py-3 md:text-sm">
      {[
        { icon: ShieldCheckIcon, label: "Shop with clear product details" },
        { icon: TruckIcon, label: "Delivery details at checkout" },
        {
          icon: ChatBubbleLeftRightIcon,
          label: "Help from your local pharmacy",
        },
      ].map(({ icon: BenefitIcon, label }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-2 md:flex-row md:justify-center"
        >
          <BenefitIcon className="size-5 shrink-0 text-brand" />
          {label}
        </div>
      ))}
    </div>
  );
}

export function HomeBannerStrip({
  banners,
}: {
  banners: { image: string; name: string; href: string | null }[];
}) {
  if (!banners.length) return null;
  return (
    <section
      aria-label="Pharmacy campaigns"
      className={`grid gap-3 ${banners.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
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
export function HomeCollectionTiles({
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
  const visible = collections.filter(
    (collection) => collection.products.length >= 2,
  );
  if (!visible.length) return null;
  return (
    <section
      data-scroll-reveal
      aria-label="Featured collections"
      className={`grid gap-3 ${visible.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}
    >
      {visible.slice(0, 4).map((collection) => (
        <div
          key={collection.href}
          className={`grid grid-cols-[1fr_0.8fr] items-center gap-3 overflow-hidden rounded-2xl p-4 md:p-5 ${visible.length === 1 ? "md:grid-cols-[1fr_180px]" : ""} ${collection.tone}`}
        >
          <div>
            <h2 className="mb-2 text-xl font-medium leading-tight text-ink md:text-2xl">
              {collection.title}
            </h2>
            <p className="mb-2 text-xs leading-5 text-muted">
              {collection.detail}
            </p>
            <Link
              href={collection.href}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand"
            >
              Shop collection <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <Link
            href={productHref(collection.products[0]!)}
            aria-label={`View ${collection.products[0]!.name}`}
            className="block h-32 overflow-hidden rounded-xl bg-white p-2"
          >
            <Photo product={collection.products[0]!} />
          </Link>
        </div>
      ))}
    </section>
  );
}
export function HomeBrandStrip({ brands, products }: { brands: string[]; products: Product[] }) {
  if (brands.length < 2) return null;
  return (
    <section>
      <SectionHeading
        title="Find your familiar brands"
        href="/products"
        link="Explore products"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {brands.map((brand) => (
          <Link
            href={`/search?q=${encodeURIComponent(brand)}`}
            key={brand}
            className="flex min-h-28 items-center gap-3 rounded-2xl border border-border bg-white p-3 text-base font-semibold tracking-tight text-ink hover:border-brand hover:text-brand"
          >
            {products.find(product => ((product.brand || product.familyBrand)?.toLowerCase() === brand.toLowerCase() || product.name.toLowerCase().startsWith(brand.toLowerCase())) && productImage(product) !== "/product-placeholder.svg") ? <span className="block size-16 shrink-0 overflow-hidden rounded-xl bg-white"><Photo product={products.find(product => ((product.brand || product.familyBrand)?.toLowerCase() === brand.toLowerCase() || product.name.toLowerCase().startsWith(brand.toLowerCase())) && productImage(product) !== "/product-placeholder.svg")!} /></span> : null}
            <span className="min-w-0 flex-1 wrap-anywhere">{brand}</span><ArrowRightIcon className="size-4 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </section>
  );
}
export function HomeRoutine({ products }: { products: Product[] }) {
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
    <section className="rounded-2xl bg-[#f0f2fc] p-4 md:p-5">
      <SectionHeading
        title="Make space for daily skincare"
        description="Explore individual products for your routine."
        href="/collections/skin-essentials"
        link="Shop skincare"
      />
      <div
        className={`grid gap-3 ${steps.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {steps.map(({ title, product }) => (
          <article
            key={product._id}
            className="grid grid-cols-[80px_1fr] items-center gap-3 rounded-xl bg-white p-3"
          >
            <Link
              href={productHref(product)}
              aria-label={`View ${product.name}`}
              className="block size-20"
            >
              <Photo product={product} />
            </Link>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium text-brand">{title}</p>
              <h3 className="mb-2 text-sm leading-5 font-medium">
                <Link
                  href={productHref(product)}
                  className="text-ink hover:text-brand"
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
      <p className="mt-3 mb-0 text-xs text-muted">
        Sold individually. Check each product’s details for suitability and
        directions.
      </p>
    </section>
  );
}

export function HomeCompactShelf({
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
  if (products.length < 2) return null;
  return (
    <section>
      <SectionHeading title={title} description={description} href={href} />
      <div className="scrollbar-none flex snap-x gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <CompactProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
