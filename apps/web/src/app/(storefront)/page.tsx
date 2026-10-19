import { getWebEnvironment } from '../../lib/server/env';
import { RecentlyViewed } from '../../components/recently-viewed';
import { ScrollReveal } from "../../components/scroll-reveal";
import { Suspense } from "react";
import Link from "next/link";
import { CatalogLoading } from "../../components/catalog-loading";
import {
  HomeBrandStrip,
  HomeCollectionTiles,
  HomeCompactShelf,
  HomeRoutine,
  HomeCategories,
  HomeEditorial,
  HomeHero,
  HomeProductCarousel,
  HomeShelf,
  HomeSupport,
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
  collectionHref,
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
export default function HomePage() {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <HomeContent />
    </Suspense>
  );
}
function categoryRank(name: string) {
  const index = [
    "skincare",
    "vitamins",
    "baby care",
    "oral care",
    "hair care",
    "first aid",
  ].findIndex((label) => name.toLowerCase().includes(label));
  return index < 0 ? 99 : index;
}
async function HomeContent() {
  const [catalogue, settledCollections] = await Promise.all([
    Promise.allSettled([
      getCategories(),
      getProducts({ featured: true }),
      getProducts(),
      getProducts({ offers: true }),
      getBanners(),
    ] as const),
    Promise.allSettled(
      homeCollections.map((collection) => getCollectionProducts(collection)),
    ),
  ]);
  const collectionResults = settledCollections.map((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const categories =
    catalogue[0].status === "fulfilled" ? catalogue[0].value : [];
  const featured =
    catalogue[1].status === "fulfilled" ? catalogue[1].value.products : [];
  const general =
    catalogue[2].status === "fulfilled" ? catalogue[2].value.products : [];
  const offers =
    catalogue[3].status === "fulfilled"
      ? catalogue[3].value.products.filter((product) => product.stock > 0)
      : [];
  const banners = catalogue[4].status === "fulfilled" ? catalogue[4].value : [];
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
  const hero = photoReady.slice(0, 3);
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
  const skin = collectionResults[0] ?? [];
  const daily = (collectionResults[2] ?? []).filter(
    (product) => !shelf.some((item) => item._id === product._id),
  );
  const budget = collectionResults[3] ?? [];
  const budgetCategories = new Set<string>();
  const variedBudget = budget.filter((product) => {
    if (budgetCategories.has(product.category._id)) return false;
    budgetCategories.add(product.category._id);
    return true;
  });
  const budgetShelf = uniqueProducts([...variedBudget, ...budget]);
  const showBudget =
    budget.length >= 4 &&
    new Set(budget.map((product) => product.category._id)).size >= 2;
  const collectionTiles = homeCollections
    .slice(0, 3)
    .map((collection, index) => ({
      title: collection.title,
      detail: collection.description,
      href: collectionHref(collection),
      products: (collectionResults[index] ?? []).filter(
        (product) => productImage(product) !== "/product-placeholder.svg",
      ),
      tone: ["bg-[#eef0ff]", "bg-[#fff1e8]", "bg-[#eaf6f0]"][index]!,
    }));
  return (
    <div className="home-page flex flex-col gap-5 pb-2 [&_section]:mb-0 md:gap-7">
      <ScrollReveal>
        <HomeHero
          products={hero.length ? hero : available.slice(0, 2)}
          banners={banners}
        />
        <HomeCategories
          categories={[...categories].sort(
            (a, b) => categoryRank(a.name) - categoryRank(b.name),
          )}
        />
        <HomeShelf
          title="Your everyday essentials"
          description="Small essentials. A little more care, every day."
          products={shelf}
          href="/products"
        />
        {!all.length ? (
          <section className="rounded-2xl border border-border p-6">
            <h2 className="text-xl">The catalogue is taking a moment.</h2>
            <p className="text-sm text-muted">
              You can try again or contact the pharmacy for product enquiries.
            </p>
            <Link className="button rounded-full text-sm" href="/">
              Try again
            </Link>
          </section>
        ) : null}
        <HomeCollectionTiles collections={collectionTiles} />
        <HomeProductCarousel products={uniqueProducts([...varied, ...hero]).slice(0,4)} />
        <HomeRoutine products={skin} />
        <HomeCompactShelf
          title="Personal care for every day"
          description="Discover body, hair and personal care essentials."
          products={daily.length >= 2 ? daily : []}
          href="/collections/daily-care"
        />
        <HomeEditorial />
        <HomeCompactShelf
          title="AED 50 & under"
          description="Available essentials within your budget."
          products={showBudget ? budgetShelf : []}
          href="/collections/under-50"
        />
        <HomeBrandStrip brands={catalogueBrands(available)} products={photoReady} />
        <HomeShelf
          title="A little more value"
          description="Current offers, with the savings shown upfront."
          products={offers}
          href="/offers"
        />
        <RecentlyViewed cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} /><HomeSupport />
      </ScrollReveal>
    </div>
  );
}
