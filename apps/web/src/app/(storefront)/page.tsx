import { getHomepageCampaigns } from '../../lib/server/growth';
import { getLocale } from '../../lib/server/i18n';
import { shopText as u } from '../../lib/i18n-storefront';
import { getWebEnvironment } from '../../lib/server/env';
import { RecentlyViewed } from '../../components/recently-viewed';
import { Suspense, cache } from "react";
import Link from '../../components/app-link';
import { CatalogLoading } from "../../components/catalog-loading";
import {
  HomeManagedCampaigns,
  HomeBrandStrip,
  HomeCategories,
  HomeEditorial,
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
  homeCollections,
  catalogueBrands,
  uniqueProducts,
} from "../../lib/catalog/merchandising";
import { getCollectionProducts } from "../../lib/server/collections";

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
// Request-scoped sharing only: prices and inventory are never cached across visitors.
const featuredProducts = cache(() => getProducts({ featured: true }));
const homepageCampaigns = cache(async () => getHomepageCampaigns(await getLocale()).catch(() => []));

export default function HomePage() {
  return <div className="home-page">
    <Suspense fallback={<CatalogLoading />}><HomeLead /></Suspense>
    <Suspense fallback={<CatalogLoading showHeading={false} />}><HomeContent /></Suspense>
  </div>;
}
async function HomeLead() {
  const [banners, campaigns, categories, featured] = await Promise.allSettled([
    getBanners(), homepageCampaigns(), getCategories(), featuredProducts(),
  ]);
  const locale = await getLocale();
  const products = featured.status === 'fulfilled' ? featured.value.products.filter(product => product.stock > 0) : [];
  return <div className="home-lead"><h1 className="sr-only">{u(locale, 'Al Mina Pharmacy — health, beauty and everyday care')}</h1>
    <HomeHero products={products} banners={banners.status === 'fulfilled' ? banners.value : []} campaigns={campaigns.status === 'fulfilled' ? campaigns.value : []} />
    <HomeCategories categories={categories.status === 'fulfilled' ? [...categories.value].sort((a,b) => categoryRank(a.name)-categoryRank(b.name)) : []} products={products} />
  </div>;
}
function categoryRank(name: string) {
  const index = [
    "skincare",
    "vitamins",
    "baby care",
    "oral care",
    "hair care",
    "first aid",
  ].findIndex((label) => name.toLowerCase().replace(/\s+/g, "").includes(label.replace(/\s+/g, "")));
  return index < 0 ? 99 : index;
}
async function HomeContent() {
  const locale = await getLocale();
  const [catalogue, settledCollections, campaigns] = await Promise.all([
    Promise.allSettled([
      featuredProducts(),
      getProducts(),
      getProducts({ offers: true }),
    ] as const),
    Promise.allSettled(
      homeCollections.map((collection) => getCollectionProducts(collection)),
    ),
    homepageCampaigns(),
  ]);
  const collectionResults = settledCollections.map((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const featured =
    catalogue[0].status === "fulfilled" ? catalogue[0].value.products : [];
  const general =
    catalogue[1].status === "fulfilled" ? catalogue[1].value.products : [];
  const offers =
    catalogue[2].status === "fulfilled"
      ? catalogue[2].value.products.filter((product) => product.stock > 0)
      : [];
  const all = uniqueProducts([
    ...offers,
    ...featured,
    ...collectionResults.flat(),
    ...general,
  ]);
  const available = all.filter((product) => product.stock > 0);
  const photoReady = available.filter(
    (product) => productImage(product) !== "/product-placeholder.svg",
  );
  // Prefer a varied first shelf, then fill it from photo-ready inventory.
  const represented = new Set<string>();
  const varied = photoReady.filter((product) => {
    const key =
      product.brand || product.name.split(" ")[0] || product.category._id;
    if (represented.has(key)) return false;
    represented.add(key);
    return true;
  });
  const shelf = uniqueProducts([...varied, ...photoReady, ...available]).slice(
    0,
    4,
  );
  // Prefer new discoveries, but keep useful collections visible in a small catalogue.
  const offerShelf = offers.filter(
    (product) => !shelf.some((item) => item._id === product._id),
  );
  return (
      <div className="contents">
        <HomeShelf
          title={u(locale,"Your everyday essentials")}
          description={u(locale,"Small essentials. A little more care, every day.")}
          products={shelf}
          href="/collections/daily-care"
        />
        {!all.length ? (
          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-xl">{u(locale,"The catalogue is taking a moment.")}</h2>
            <p className="text-sm text-muted">
              {u(locale,"You can try again or contact the pharmacy for product enquiries.")}
            </p>
            <Link className="button rounded-full text-sm" href="/">
              {u(locale,"Try again")}
            </Link>
          </section>
        ) : null}
        {offerShelf.length >= 2 ? (
          <HomeShelf
            title={u(locale,"A little more value")}
            description={u(locale,"Current offers, with the savings shown upfront.")}
            products={offerShelf}
            href="/offers"
          />
        ) : null}
        <HomeEditorial />
        <HomeBrandStrip brands={catalogueBrands(available)} />
        <HomeManagedCampaigns campaigns={campaigns} />
        <RecentlyViewed locale={locale} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />
      </div>
  );
}
