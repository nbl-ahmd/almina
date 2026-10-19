import { categoryContent } from '../../../../lib/catalog/category-content';
import { notFound, permanentRedirect } from 'next/navigation';
import { resolveCategory } from '../../../../lib/server/catalog';
import { categoryHref } from '../../../../lib/catalog/model';
import { getWebEnvironment } from '../../../../lib/server/env';
import { CatalogList, type SearchParams } from '../../../../components/catalog-list';
import { metadataFor } from '../../../../lib/server/seo';
import { breadcrumbData } from '../../../../lib/seo';
import { StructuredData } from '../../../../components/structured-data';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params, searchParams }: Props) {
  const category = await resolveCategory((await params).slug);
  if (!category) notFound();
  return metadataFor(category.name, categoryContent(category.name).description, categoryHref(category), await searchParams);
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await resolveCategory(slug);
  if (!category) notFound();
  const query = await searchParams;
  if (`/categories/${slug}` !== categoryHref(category) && getWebEnvironment().STOREFRONT_REDIRECTS_VERIFIED) {
    const retained = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') retained.append(key, value);
      else if (Array.isArray(value)) for (const item of value) retained.append(key, item);
    }
    permanentRedirect(`${categoryHref(category)}${retained.size ? `?${retained}` : ''}`);
  }
  return <><StructuredData data={breadcrumbData(getWebEnvironment().WEB_ORIGIN, [{ name: 'Home', path: '/' }, { name: 'Categories', path: '/categories' }, { name: category.name, path: categoryHref(category) }])} /><CatalogList title={category.name} category={category._id} params={query} parents={[{ name: 'Categories', path: '/categories' }]} /></>;
}
