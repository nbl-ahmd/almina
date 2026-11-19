import { getLocale } from '../../../../lib/server/i18n';
import styles from '../../../../components/storefront-information.module.css';
import { StorefrontInformation } from '../../../../components/storefront-information';
import { StorefrontIntro } from '../../../../components/storefront-intro';
import Link from '../../../../components/app-link';
import { notFound } from "next/navigation";
import {
  findCollection,
  collectionHref,
} from "../../../../lib/catalog/merchandising";
import { getCollectionProducts } from "../../../../lib/server/collections";
import { metadataFor } from "../../../../lib/server/seo";
import { getWebEnvironment } from "../../../../lib/server/env";
import { productHref } from "../../../../lib/catalog/model";
import { ProductGrid, Breadcrumb } from "../../../../components/storefront";
import { StructuredData } from "../../../../components/structured-data";
import { breadcrumbData } from "../../../../lib/seo";
import type { Query } from "../../../../lib/seo";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Query>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const collection = findCollection((await params).slug);
  if (!collection) notFound();
  const products = await getCollectionProducts(collection);
  const metadata = metadataFor(
    collection.title,
    collection.description,
    collectionHref(collection),
    await searchParams,
  );
  return products.length
    ? metadata
    : { ...metadata, robots: { index: false, follow: true } };
}
export default async function CollectionPage({ params }: Props) {
  const locale = await getLocale();
  const ar = locale === "ar";
  const collection = findCollection((await params).slug);
  if (!collection) notFound();
  const products = await getCollectionProducts(collection);
  return (
    <StorefrontInformation locale={locale}>
      <StructuredData
        data={breadcrumbData(getWebEnvironment().WEB_ORIGIN, [
          { name: "Home", path: "/" },
          { name: collection.title, path: collectionHref(collection) },
        ])}
      />
      <Breadcrumb title={collection.title} />
      {products.length ? (
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: collection.title,
            itemListElement: products.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: new URL(productHref(product), getWebEnvironment().WEB_ORIGIN)
                .href,
              name: product.name,
            })),
          }}
        />
      ) : null}
      <div lang="en" dir="ltr"><StorefrontIntro title={collection.title} description={collection.description} /></div>
      {products.length ? (
        <>
          <p className="mb-4 text-sm text-muted">
            {ar ? `${products.length.toLocaleString("ar-AE")} · المنتجات المتاحة` : `${products.length} available products`}
          </p>
          <ProductGrid products={products} />
        </>
      ) : (
        <div className={`${styles.panel} ${styles.state}`}>
          <h2>{ar ? "يجري تحديث هذه المجموعة" : "This collection is being refreshed."}</h2>
          <Link href="/products" className="inline-flex min-h-11 items-center text-sm underline">
            {ar ? "تصفّح جميع المنتجات" : "Explore all products"}
          </Link>
        </div>
      )}
    </StorefrontInformation>
  );
}
