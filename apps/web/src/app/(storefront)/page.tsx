import { getHomepageCampaigns } from '../../lib/server/growth';
import { getLocale } from '../../lib/server/i18n';
import { shopText as u } from '../../lib/i18n-storefront';
import { getWebEnvironment } from '../../lib/server/env';
import { RecentlyViewed } from '../../components/recently-viewed';
import { Suspense } from "react";
import Link from '../../components/app-link';
import system from "../../components/storefront-system/tokens.module.css";
import type { Locale } from "../../lib/i18n";
import {
  HomeManagedCampaigns,
  HomeBrandStrip,
  HomeCategories,
  HomeCollectionSection,
  HomeDiscovery,
  HomeHero,
  HomeShelf,
} from "../../components/homepage";
import {
  getBanners,
  getCategories,
  getProducts,
  productImage,
} from "../../lib/server/catalog";
import { metadataFor } from "../../lib/server/seo";
import type { Query } from "../../lib/seo";
import {
  catalogueBrands,
  collectionProducts,
  homeCollections,
  prioritizeShelf,
  uniqueProducts,
} from "../../lib/catalog/merchandising";
import { displayPrice } from "../../lib/catalog/model";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  return metadataFor(
    "Al Mina Pharmacy Ras Al Khaimah",
    "Shop health, skincare and everyday essentials at Al Mina Pharmacy in Ras Al Khaimah. Explore products, prices and current offers.",
    "/",
    await searchParams,
  );
}
async function homeCatalogue() {
  const [featured, general] = await Promise.allSettled([
    getProducts({ featured: true, inStock: true }),
    getProducts({ inStock: true }),
  ]);
  const products = uniqueProducts([
    ...(featured.status === "fulfilled" ? featured.value.products : []),
    ...(general.status === "fulfilled" ? general.value.products : []),
  ]).filter(product => product.stock > 0);
  return {
    products,
    incomplete: featured.status === "rejected" || general.status === "rejected",
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const campaigns = getHomepageCampaigns(locale).catch(() => []);
  const banners = getBanners().catch(() => []);
  return (
    <div className={`home-page ${system.system}`} lang={locale} data-storefront-home>
      <div className="home-content">
        <h1 className="sr-only">{u(locale, "Al Mina Pharmacy — health, beauty and everyday care")}</h1>
        <div className="home-lead">
          <Suspense fallback={<HomeHero locale={locale} loading />}>
            <HomeCampaign locale={locale} banners={banners} campaigns={campaigns} />
          </Suspense>
          <Suspense fallback={null}><HomeCategoryLane /></Suspense>
        </div>
        <Suspense fallback={<section className="home-shelf-skeleton">
          <p className="sr-only" role="status">{locale === "ar" ? "جارٍ تحميل المنتجات…" : "Loading products…"}</p>
          <div className="home-shelf-skeleton-heading" aria-hidden="true" />
          <div className="home-product-grid" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(index => <div className="home-skeleton-card" key={index}><span /><span /><span /></div>)}
          </div>
        </section>}>
          <HomeProducts locale={locale} />
        </Suspense>
        <Suspense fallback={null}><HomeSupportingCampaigns campaigns={campaigns} /></Suspense>
        <RecentlyViewed locale={locale} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />
      </div>
    </div>
  );
}

type Campaigns = ReturnType<typeof getHomepageCampaigns>;
async function HomeCampaign({ locale, banners, campaigns }: {
  locale: Locale;
  banners: ReturnType<typeof getBanners>;
  campaigns: Campaigns;
}) {
  const [publishedBanners, publishedCampaigns] = await Promise.all([banners, campaigns]);
  return <HomeHero locale={locale} banners={publishedBanners} campaigns={publishedCampaigns} />;
}

async function HomeCategoryLane() {
  const categories = await getCategories().catch(() => []);
  return <HomeCategories categories={categories.filter(category => !category.disabled)} />;
}

async function HomeProducts({ locale }: { locale: Locale }) {
  const { products, incomplete } = await homeCatalogue();
  if (!products.length) {
    return (
      <section className="home-empty" aria-labelledby="home-empty-heading">
        <h2 id="home-empty-heading">{incomplete
          ? u(locale, "The catalogue is taking a moment.")
          : locale === "ar" ? "لا توجد منتجات متوفرة لعرضها الآن" : "No in-stock products to show right now"}</h2>
        {incomplete ? <p>{u(locale, "You can try again or contact the pharmacy for product enquiries.")}</p> : null}
        {incomplete
          // eslint-disable-next-line @next/next/no-html-link-for-pages -- Retrying the current URL must make a fresh document request.
          ? <a className="home-action" href="/">{u(locale, "Try again")}</a>
          : <Link className="home-action" href="/products">{locale === "ar" ? "تصفح المنتجات" : "Browse products"}</Link>}
      </section>
    );
  }

  const withPhotos = products.filter(product => productImage(product) !== "/product-placeholder.svg");
  const represented = new Set<string>();
  const varied = withPhotos.filter(product => {
    const key = (product.brand || product.name.split(" ")[0] || product.category._id).toLowerCase();
    if (represented.has(key)) return false;
    represented.add(key);
    return true;
  });
  const shelf = uniqueProducts([...varied, ...withPhotos, ...products]).slice(0, 5);

  return (
    <>
      <HomeShelf title={u(locale, "Your everyday essentials")} products={shelf} href="/products" />
      <Suspense fallback={null}><HomeOffers locale={locale} exclude={shelf.map(product => product._id)} /></Suspense>
      <HomeCollectionSection locale={locale} collection="skin-essentials"
        products={prioritizeShelf(collectionProducts(homeCollections[0], products), shelf)} />
      <HomeDiscovery locale={locale} />
      <HomeBrandStrip brands={catalogueBrands(products.filter(product => product.brand?.trim() || product.familyBrand?.trim()))} />
      <HomeCollectionSection locale={locale} collection="baby-care"
        products={prioritizeShelf(collectionProducts(homeCollections[1], products), shelf)} />
    </>
  );
}

async function HomeOffers({ locale, exclude }: { locale: Locale; exclude: string[] }) {
  const result = await getProducts({ offers: true, inStock: true }).catch(() => null);
  const offers = uniqueProducts((result?.products ?? []).filter(product =>
    product.stock > 0 && product.sale && displayPrice(product) < product.price && !exclude.includes(product._id),
  ));
  if (!offers.length) return null;
  return <HomeShelf title={u(locale, "A little more value")} products={offers} href="/offers" />;
}

async function HomeSupportingCampaigns({ campaigns }: { campaigns: Campaigns }) {
  return <HomeManagedCampaigns campaigns={await campaigns} />;
}
