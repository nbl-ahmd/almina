import { Fragment, type ReactNode } from 'react';
import { campaignImageUrl, defaultHomeLayout, sectionLive, type HomeBuiltinKey } from '@almina/contracts';
import { getGrowthPages, getHomeLayout, getHomeLayoutDraft } from '../../lib/server/growth';
import { CustomHomeSection } from '../../components/home-sections';
import { SectionStrips } from '../../components/hero-banner';
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
  HomeCollectionTiles,
  HomeCompactShelf,
  HomeRoutine,
  HomeCategories,
  HomeHero,
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
  prioritizeShelf,
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

export default async function HomePage({ searchParams }: { searchParams: Promise<Query> }) {
  // ?preview=layout shows the saved draft from Website & growth → Homepage, for signed-in admins only.
  const preview = (await searchParams).preview === 'layout';
  return <div className="home-page flex flex-col gap-6 pb-2 [&_section]:mb-0 md:gap-10">
    <Suspense fallback={<CatalogLoading />}><HomeLead /></Suspense>
    <Suspense fallback={<CatalogLoading showHeading={false} />}><HomeContent preview={preview} /></Suspense>
  </div>;
}
async function HomeLead() {
  const [banners, campaigns] = await Promise.allSettled([getBanners(), homepageCampaigns()]);
  const liveBanners = banners.status === 'fulfilled' ? banners.value : [];
  const liveCampaigns = campaigns.status === 'fulfilled' ? campaigns.value : [];
  // Managed artwork needs no inventory search. Only the fallback hero uses a product.
  const featured = liveBanners.length || liveCampaigns.some(page => page.homepagePlacement === 'hero')
    ? [] : (await featuredProducts().catch(() => ({ products: [] }))).products;
  return <><SectionStrips pages={liveCampaigns} slot="home-promo" cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} /><HomeHero products={featured.filter(product => product.stock > 0)} banners={liveBanners} campaigns={liveCampaigns} /></>;
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
async function HomeContent({ preview = false }: { preview?: boolean }) {
  const locale = await getLocale();
  const [catalogue, settledCollections, campaigns, layout, brandPages] = await Promise.all([
    Promise.allSettled([
      getCategories(),
      featuredProducts(),
      getProducts(),
      getProducts({ offers: true }),
    ] as const),
    Promise.allSettled(
      homeCollections.map((collection) => getCollectionProducts(collection)),
    ),
    homepageCampaigns(),
    preview ? getHomeLayoutDraft(locale).then(draft => draft ?? getHomeLayout(locale)) : getHomeLayout(locale),
    getGrowthPages('brand', locale).then(result => result.items).catch(() => []),
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
    8,
  );
  // Prefer new discoveries, but keep useful collections visible in a small catalogue.
  const offerShelf = offers.filter(
    (product) => !shelf.some((item) => item._id === product._id),
  );
  const skin = collectionResults[0] ?? [];
  const dailyProducts = collectionResults[2] ?? [];
  const daily = prioritizeShelf(dailyProducts, shelf);
  const budgetProducts = collectionResults[3] ?? [];
  const budget = prioritizeShelf(budgetProducts, [...shelf, ...daily]);
  const budgetCategories = new Set<string>();
  const variedBudget = budget.filter((product) => {
    if (budgetCategories.has(product.category._id)) return false;
    budgetCategories.add(product.category._id);
    return true;
  });
  const budgetShelf = uniqueProducts([...variedBudget, ...budget]);
  const collectionTiles = homeCollections
    .slice(0, 3)
    .map((collection, index) => ({
      title: collection.title,
      detail: collection.description,
      href: collectionHref(collection),
      products: (collectionResults[index] ?? []).filter(
        (product) => productImage(product) !== "/product-placeholder.svg",
      ),
    }));
  const cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  // Category cards: the admin's image first, else an in-stock product photo from that category, else an icon.
  const categoryPhotos = new Map<string, string>();
  for (const product of photoReady) if (!categoryPhotos.has(product.category._id)) categoryPhotos.set(product.category._id, productImage(product));
  // Only approved artwork hosts reach next/image; anything else is ignored rather than breaking the page.
  const brandLogos = new Map((brandPages ?? []).flatMap(page => { const logo = campaignImageUrl(page.image, cloudName); return logo ? [[page.slug, logo] as const] : []; }));
  // Built-in sections by key. A published homepage layout (Website & growth → Homepage) orders, hides or interleaves them with
  // custom sections; without one, the built-in order below is today's homepage.
  const blocks: Record<HomeBuiltinKey, ReactNode> = {
    categories: <HomeCategories categories={[...categories].sort((a, b) => categoryRank(a.name) - categoryRank(b.name))} photos={categoryPhotos} />,
    'strip-top': <SectionStrips pages={campaigns} slot="home-top" cloudName={cloudName} />,
    essentials: <>
      <HomeShelf title={u(locale,"Your everyday essentials")} description={u(locale,"Small essentials. A little more care, every day.")} products={shelf} href="/collections/daily-care" />
      {!all.length ? (
        <section className="rounded-2xl border p-6">
          <h2 className="text-xl">{u(locale,"The catalogue is taking a moment.")}</h2>
          <p className="text-sm">{u(locale,"You can try again or contact the pharmacy for product enquiries.")}</p>
          <Link className="button rounded-full text-sm" href="/">{u(locale,"Try again")}</Link>
        </section>
      ) : null}
    </>,
    'strip-middle': <SectionStrips pages={campaigns} slot="home-middle" cloudName={cloudName} />,
    collections: <HomeCollectionTiles collections={collectionTiles} />,
    offers: offerShelf.length >= 2 ? <HomeShelf title={u(locale,"A little more value")} description={u(locale,"Current offers, with the savings shown upfront.")} products={offerShelf} href="/offers" /> : null,
    daily: <HomeCompactShelf title={u(locale,"Personal care for every day")} description={u(locale,"Discover body, hair and personal care essentials.")} products={daily} href="/collections/daily-care" />,
    routine: <HomeRoutine products={skin} />,
    budget: <HomeCompactShelf title={u(locale,"AED 50 & under")} description={u(locale,"Available essentials within your budget.")} products={budgetShelf} href="/collections/under-50" />,
    'strip-bottom': <SectionStrips pages={campaigns} slot="home-bottom" cloudName={cloudName} />,
    brands: <HomeBrandStrip brands={catalogueBrands(available)} products={photoReady} logos={brandLogos} />,
    campaigns: <HomeManagedCampaigns campaigns={campaigns} />,
    recent: <RecentlyViewed locale={locale} cloudName={cloudName} />,
    help: <HomeSupport />,
  };
  const sections = (layout ?? defaultHomeLayout(locale)).sections.filter(section => sectionLive(section));
  return <>{preview && layout && 'unpublishedChanges' in layout && (layout.unpublishedChanges || !layout.published) ? <p role="status" className="notice m-0 p-3 text-sm">Previewing the saved draft homepage. Customers still see the published version.</p> : null}{sections.map(section => <Fragment key={section.id}>{section.type === 'builtin' ? blocks[section.key] : <CustomHomeSection section={section} locale={locale} cloudName={cloudName} categories={categories} logos={brandLogos} />}</Fragment>)}</>;
}
