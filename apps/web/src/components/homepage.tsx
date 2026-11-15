import Image from 'next/image';
import Link from './app-link';
import { ArrowRightIcon, ArrowUpRightIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { GrowthPage } from '@almina/contracts';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { getWebEnvironment } from '../lib/server/env';
import { productImage } from '../lib/server/catalog';
import { productHref, type Category, type Product } from '../lib/catalog/model';
import { CampaignArtwork } from './campaign-artwork';
import { CampaignSlider } from './campaign-slider';
import { CategoryTile } from './category-tile';
import { CompactProductCard, ProductCard, ProductPhoto, ProductPrice } from './product-card';

type Banner = { image: string; name: string; href: string | null };
async function SectionHeading({ title, href, link = 'View all', description }: { title: string; href: string; link?: string; description?: string }) {
 const locale = await getLocale();
 return <div className="sf-section-heading"><div><h2>{u(locale, title)}</h2>{description ? <p>{u(locale, description)}</p> : null}</div><Link href={href}>{u(locale, link)}<ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link></div>;
}
export async function HomeHero({ products, banners = [], campaigns = [] }: { products: Product[]; banners?: Banner[]; campaigns?: GrowthPage[] }) {
 const locale = await getLocale();
 const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
 const photographs = products.filter(product => productImage(product) !== '/product-placeholder.svg');
 const slides = [
  { title: locale === 'ar' ? 'عناية كل يوم. بكل سهولة.' : 'Care for every day.', description: locale === 'ar' ? 'الصحة والجمال واحتياجات العائلة من صيدلية الميناء في رأس الخيمة.' : 'Health, beauty and family essentials. From your pharmacy in Ras Al Khaimah.', href: '/products', cta: locale === 'ar' ? 'تسوق الآن' : 'Shop the essentials' },
  { title: locale === 'ar' ? 'مساحة لعنايتك اليومية.' : 'A little time for everyday care.', description: locale === 'ar' ? 'اكتشف منتجات العناية الشخصية من مجموعتنا الحالية.' : 'Discover personal care and everyday essentials from our current range.', href: '/collections/daily-care', cta: locale === 'ar' ? 'اكتشف المنتجات' : 'Explore everyday care' },
 ];
 return <section className="home-hero" aria-label={u(locale, 'Discover Al Mina')}><h1 className="sr-only">{u(locale, 'Al Mina Pharmacy — health, beauty and everyday care')}</h1><CampaignSlider locale={locale} label={u(locale, 'Pharmacy promotions')} controlLabel={u(locale, 'promotion')}>{[
  ...heroCampaigns.map((page, index) => <CampaignArtwork cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} key={page.slug} page={page} eager={index === 0} />),
  ...banners.slice(0, 8).map((banner, index) => { const image = <Image src={banner.image} alt={banner.name} width={1440} height={540} sizes="(max-width:767px) 100vw, 1232px" loading={index === 0 && !heroCampaigns.length ? 'eager' : 'lazy'} className="h-auto w-full rounded-3xl" />; return banner.href ? <Link key={banner.image} href={banner.href}>{image}</Link> : <div key={banner.image}>{image}</div>; }),
  ...(!heroCampaigns.length && !banners.length ? slides.map((slide, index) => { const product = photographs[index] ?? photographs[0]; return <div className="sf-hero" key={slide.href}><div className="sf-hero-copy"><h2>{slide.title}</h2><p>{slide.description}</p><Link href={slide.href} className="button button-accent">{slide.cta}<ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link></div>{product ? <div className="sf-hero-media"><Link href={productHref(product)} aria-label={locale === 'ar' ? `عرض ${product.name}` : `View ${product.name}`} className="sf-hero-product"><ProductPhoto product={product} eager={index === 0} /></Link></div> : null}</div>; }) : []),
 ]}</CampaignSlider></section>;
}
export async function HomeCategories({ categories }: { categories: Category[] }) {
 const locale = await getLocale();
 if (!categories.length) return null;
 return <section aria-label={u(locale, 'Shop by care')}><SectionHeading title={u(locale, 'Shop by care')} href="/categories" link="All categories" /><div className="category-strip">{categories.slice(0, 6).map(category => <CategoryTile key={category._id} category={category} />)}</div></section>;
}
export async function HomeShelf({ products, title, description, href }: { products: Product[]; title: string; description: string; href: string }) {
 if (!products.length) return null;
 return <section><SectionHeading title={title} description={description} href={href} /><div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{products.slice(0, 4).map(product => <ProductCard key={product._id} product={product} />)}</div></section>;
}
export async function HomeCompactShelf({ products, title, description, href }: { products: Product[]; title: string; description: string; href: string }) {
 if (!products.length) return null;
 return <section><SectionHeading title={title} description={description} href={href} /><div className="scrollbar-none flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 lg:grid-cols-4">{products.slice(0, 4).map(product => <CompactProductCard key={product._id} product={product} />)}</div></section>;
}
export async function HomeProductCarousel({ products }: { products: Product[] }) {
 const locale = await getLocale();
 const visible = products.filter(product => product.stock > 0).slice(0, 4);
 if (!visible.length) return null;
 return <section><SectionHeading title="In the spotlight" description="A closer look at products from our current range." href="/products" /><CampaignSlider locale={locale} label={u(locale, 'Featured product highlights')} controlLabel={u(locale, 'product')}>{visible.map(product => <div className="sf-hero" key={product._id}><div><h2 className="!text-2xl md:!text-4xl">{product.familyName || product.name}</h2>{product.summary ? <p>{product.summary}</p> : null}<div className="mb-5 text-xl"><ProductPrice product={product} /></div><Link className="button button-accent" href={productHref(product)}>{u(locale, 'Explore product ')}<ArrowRightIcon className="size-4 rtl:rotate-180" /></Link></div><Link href={productHref(product)} className="sf-hero-product justify-self-center" aria-label={locale === 'ar' ? `عرض ${product.name}` : `View ${product.name}`}><ProductPhoto product={product} /></Link></div>)}</CampaignSlider></section>;
}
export async function HomeBenefits() {
 const locale = await getLocale();
 const items = [[ShieldCheckIcon, 'Shop with clear product details'], [TruckIcon, 'Delivery details at checkout'], [ChatBubbleLeftRightIcon, 'Help from your local pharmacy']] as const;
 return <div className="grid grid-cols-3 gap-3 border-y border-border py-4 text-xs text-muted">{items.map(([Glyph, text]) => <div key={text} className="flex flex-col items-center gap-2 text-center md:flex-row md:justify-center"><Glyph className="size-5 shrink-0 text-teal" aria-hidden="true" /><span>{u(locale, text)}</span></div>)}</div>;
}
export async function HomeSupport() {
 const locale = await getLocale();
 return <section className="sf-support"><div><h2>{u(locale, 'Your neighbourhood pharmacy, just a conversation away.')}</h2><p>{u(locale, 'Speak to Al Mina for product and order enquiries.')}</p></div><Link href="/contact" className="button button-accent">{u(locale, 'Let’s talk ')}<ChatBubbleLeftRightIcon className="size-4" /></Link></section>;
}
export async function HomeEditorial() {
 const locale = await getLocale();
 const destinations = [['/collections/skin-essentials', 'The skincare shelf', 'Explore cleansers, moisturisers and daily skincare from our current range.'], ['/collections/baby-care', 'Care for their little world', 'Discover baby care, feeding and everyday family essentials.'], ['/collections/daily-care', 'Everyday personal care', 'Browse body, hair and personal care products for your daily routine.']];
 return <section><SectionHeading title={locale === 'ar' ? 'اكتشف ما يناسب يومك' : 'Find your everyday essentials'} href="/health-guides" link="Care & buying guides" /><div className="sf-destinations">{destinations.map(([href, title, detail]) => <Link href={href!} key={href}><div><h3>{u(locale, title!)}</h3><p>{u(locale, detail!)}</p></div><ArrowUpRightIcon className="size-5 shrink-0" aria-hidden="true" /></Link>)}</div></section>;
}
export async function HomeBrandStrip({ brands }: { brands: string[]; products: Product[] }) {
 const locale = await getLocale();
 if (!brands.length) return null;
 return <section><SectionHeading title={locale === 'ar' ? 'تسوق حسب العلامة التجارية' : 'Explore your favourite brands'} href="/brands" link="Shop brands" /><div className="brand-rail flex flex-wrap gap-3">{brands.slice(0, 10).map(brand => <Link className="inline-flex min-h-12 items-center rounded-xl border border-border bg-white px-5 text-sm font-semibold text-ink" href={'/search?' + new URLSearchParams({ q: brand })} key={brand}>{brand}</Link>)}</div></section>;
}
export async function HomeBannerStrip({ banners }: { banners: Banner[] }) {
 const locale = await getLocale();
 if (!banners.length) return null;
 return <section className="grid gap-4 md:grid-cols-2" aria-label={u(locale, 'Pharmacy campaigns')}>{banners.slice(0, 2).map(banner => { const image = <Image src={banner.image} alt={banner.name} width={1200} height={400} sizes="(max-width:767px) 100vw, 50vw" className="h-auto w-full rounded-2xl" />; return banner.href ? <Link key={banner.image} href={banner.href}>{image}</Link> : <div key={banner.image}>{image}</div>; })}</section>;
}
export function HomeManagedCampaigns({ campaigns }: { campaigns: GrowthPage[] }) {
 const supporting = campaigns.filter(page => page.homepagePlacement === 'secondary');
 if (!supporting.length) return null;
 return <section className="grid gap-4 md:grid-cols-2" aria-label={supporting[0]?.locale === 'ar' ? 'حملات الصيدلية' : 'Pharmacy campaigns'}>{supporting.map(page => <CampaignArtwork key={page.slug} page={page} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />)}</section>;
}
