import Image from 'next/image';
import Link from './app-link';
import { ArrowRightIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { GrowthPage } from '@almina/contracts';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { getWebEnvironment } from '../lib/server/env';
import { productImage } from '../lib/server/catalog';
import { productHref, type Category, type Product } from '../lib/catalog/model';
import { CampaignArtwork } from './campaign-artwork';
import { CampaignSlider } from './campaign-slider';
import { CategoryTile } from './category-tile';
import { ProductCard, ProductPhoto } from './product-card';

type Banner = { image: string; name: string; href: string | null };
async function SectionHeading({ title, href, link = 'View all', description }: { title: string; href: string; link?: string; description?: string }) {
 const locale = await getLocale();
 return <div className="sf-section-heading"><div><h2>{u(locale, title)}</h2>{description ? <p>{u(locale, description)}</p> : null}</div><Link href={href}>{u(locale, link)}<ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link></div>;
}
export async function HomeHero({ products, banners = [], campaigns = [] }: { products: Product[]; banners?: Banner[]; campaigns?: GrowthPage[] }) {
 const locale = await getLocale(); const ar = locale === 'ar';
 const heroCampaigns = campaigns.filter(page => page.homepagePlacement === 'hero');
 const photographs = products.filter(product => productImage(product) !== '/product-placeholder.svg');
 return <section className="home-campaigns" aria-label={u(locale,'Discover Al Mina')}>
  <div className="home-main-campaign"><CampaignSlider locale={locale} label={u(locale,'Pharmacy promotions')} controlLabel={u(locale,'promotion')}>{[
   ...heroCampaigns.map((page,index) => <CampaignArtwork cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} key={page.slug} page={page} eager={index===0} />),
   ...banners.slice(0,8).map((banner,index) => { const photo=<Image src={banner.image} alt={banner.name} width={1440} height={540} sizes="(max-width:767px) 100vw, 1000px" loading={index===0&&!heroCampaigns.length?'eager':'lazy'} className="h-auto w-full" />;return banner.href?<Link key={banner.image} href={banner.href}>{photo}</Link>:<div key={banner.image}>{photo}</div>; }),
   ...(!heroCampaigns.length&&!banners.length ? [<div className="care-campaign" key="daily-care"><div className="care-campaign-copy"><h2>{ar?'عنايتك اليومية.\nكلّها هنا.':'Everyday care.\nAll here.'}</h2><p>{ar?'اكتشف منتجات الصحة والعناية والجمال من صيدلية الميناء.':'Health, beauty and everyday essentials from Al Mina Pharmacy.'}</p><Link className="button button-dark" href="/products">{ar?'تسوق المنتجات':'Explore the range'}<ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link></div><div className="care-campaign-media">{photographs.slice(0,2).map((product,index)=><Link className={`campaign-pack campaign-pack-${index}`} href={productHref(product)} key={product._id} aria-label={ar?`عرض ${product.name}`:`View ${product.name}`}><ProductPhoto product={product} eager={index===0} /></Link>)}</div></div>] : []),
  ]}</CampaignSlider></div>
  <aside className="home-care-index"><h2>{ar?'اعثر على عنايتك.':'Find your kind of care.'}</h2><p>{ar?'ابدأ بما تبحث عنه.':'Start with what you need.'}</p><div>{[['/brands',ar?'العلامات التجارية':'Shop by brand'],['/offers',ar?'العروض الحالية':'Current offers'],['/categories',ar?'جميع الفئات':'All departments']].map(([href,title])=><Link key={href} href={href!}>{title}<ArrowUpRightIcon className="size-5 rtl:-scale-x-100" aria-hidden="true" /></Link>)}</div></aside>
 </section>;
}
export async function HomeCategories({ categories, products = [] }: { categories: Category[]; products?: Product[] }) {
 const locale = await getLocale(); if(!categories.length)return null;
 return <section className="home-departments" aria-label={u(locale,'Shop by care')}><SectionHeading title="Shop by care" href="/categories" link="All categories" /><div className="category-strip">{categories.slice(0,8).map(category=><CategoryTile key={category._id} category={category} product={products.find(product=>product.category._id===category._id)} />)}</div></section>;
}
export async function HomeShelf({ products, title, description, href }: { products: Product[]; title: string; description: string; href: string }) {
 if(!products.length)return null;
 return <section className="home-product-shelf"><SectionHeading title={title} description={description} href={href} /><div className="home-product-grid">{products.slice(0,4).map(product=><ProductCard key={product._id} product={product} />)}</div></section>;
}
export async function HomeEditorial() {
 const locale=await getLocale();const ar=locale==='ar';
 const destinations=[['/collections/skin-essentials',ar?'العناية بالبشرة':'The skincare department',ar?'اكتشف مجموعة العناية اليومية بالبشرة.':'Explore everyday skincare.'],['/collections/baby-care',ar?'العناية بالطفل':'For their little world',ar?'منتجات الطفل والعائلة من مجموعتنا.':'Baby and family essentials.']];
 return <section className="home-discovery" aria-label={ar?'اكتشف الأقسام':'Explore departments'}>{destinations.map(([href,title,description])=><Link href={href!} key={href}><h2>{title}</h2><p>{description}</p><span>{ar?'اكتشف المنتجات':'Explore products'}<ArrowRightIcon className="size-5 rtl:rotate-180" aria-hidden="true" /></span></Link>)}</section>;
}
export async function HomeBrandStrip({ brands }: { brands: string[] }) {
 const locale=await getLocale();if(!brands.length)return null;
 return <section className="home-brands"><SectionHeading title={locale==='ar'?'العلامات التجارية في مجموعتنا':'Brands in our range'} href="/brands" link="Shop brands" /><div className="brand-rail">{brands.slice(0,10).map(brand=><Link href={'/search?'+new URLSearchParams({q:brand})} key={brand}>{brand}<ArrowUpRightIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" /></Link>)}</div></section>;
}
export function HomeManagedCampaigns({ campaigns }: { campaigns: GrowthPage[] }) {
 const supporting=campaigns.filter(page=>page.homepagePlacement==='secondary');if(!supporting.length)return null;
 return <section className="home-managed-campaigns" aria-label={supporting[0]?.locale==='ar'?'حملات الصيدلية':'Pharmacy campaigns'}>{supporting.map(page=><CampaignArtwork key={page.slug} page={page} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />)}</section>;
}
