import { notFound } from 'next/navigation';
import { sectionLive } from '@almina/contracts';
import { getHomeLayout } from '../../../../lib/server/growth';
import { getLocale } from '../../../../lib/server/i18n';
import { metadataFor } from '../../../../lib/server/seo';
import { getWebEnvironment } from '../../../../lib/server/env';
import { breadcrumbData, collectionData } from '../../../../lib/seo';
import { productHref } from '../../../../lib/catalog/model';
import { StructuredData } from '../../../../components/structured-data';
import { Breadcrumb, ProductGrid } from '../../../../components/storefront';
import { StorefrontIntro } from '../../../../components/storefront-intro';
import { SectionPicture, sectionProducts } from '../../../../components/home-sections';
import Link from '../../../../components/app-link';

type Props = { params: Promise<{ id: string }> };
// "View all" for a homepage product row built from chosen products (Life Pharmacy section pages). Rows from a category,
// brand or offers link to those pages instead, so this never duplicates an existing listing.
async function find(id: string) {
  const layout = await getHomeLayout(await getLocale());
  const section = layout?.sections.find(item => item.id === id);
  return section && section.type === 'products' && sectionLive(section) ? section : null;
}
export async function generateMetadata({ params }: Props) {
  const section = await find((await params).id);
  if (!section) notFound();
  return metadataFor(section.title, section.subtitle || `${section.title} at Al Mina Pharmacy in Ras Al Khaimah. Compare current prices and availability.`, `/sections/${section.id}`, {});
}
export default async function SectionPage({ params }: Props) {
  const section = await find((await params).id);
  if (!section) notFound();
  const products = await sectionProducts(section, 48);
  const origin = getWebEnvironment().WEB_ORIGIN, cloudName = getWebEnvironment().CLOUDINARY_CLOUD_NAME;
  const path = `/sections/${section.id}`;
  return <div className="section-page grid gap-5">
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: section.title, path }])} />
    <StructuredData data={collectionData(origin, { name: section.title, description: section.subtitle, path }, products.map(item => ({ name: item.name, href: productHref(item) })))} />
    <Breadcrumb title={section.title} />
    {section.banner ? (section.banner.href ? <Link className="qc-strip" href={section.banner.href} aria-label={section.banner.alt}><SectionPicture art={section.banner} cloudName={cloudName} sizes="(max-width: 899px) 100vw, 1280px" width={764} height={176} /></Link>
      : <div className="qc-strip"><SectionPicture art={section.banner} cloudName={cloudName} sizes="(max-width: 899px) 100vw, 1280px" width={764} height={176} /></div>) : null}
    <StorefrontIntro title={section.title} description={section.subtitle} />
    {products.length ? <ProductGrid products={products} headingLevel={2} /> : <p className="empty-state">These products are not available right now.</p>}
  </div>;
}
