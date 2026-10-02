import { notFound, permanentRedirect } from 'next/navigation';
import { resolveCategory } from '../../../lib/server/catalog';
import { categoryHref, objectId } from '../../../lib/catalog/model';
import { getWebEnvironment } from '../../../lib/server/env';
import { CatalogList, type SearchParams } from '../../../components/catalog-list';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params }: Props) {
  const category = await resolveCategory((await params).slug);
  return { title: category?.name ?? 'Category not found', alternates: category ? { canonical: categoryHref(category) } : undefined };
}
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await resolveCategory(slug);
  if (!category) notFound();
  const query = await searchParams;
  if (objectId.test(slug) && getWebEnvironment().STOREFRONT_REDIRECTS_VERIFIED) {
    const retained = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') retained.append(key, value);
      else if (Array.isArray(value)) for (const item of value) retained.append(key, item);
    }
    permanentRedirect(`${categoryHref(category)}${retained.size ? `?${retained}` : ''}`);
  }
  return <CatalogList title={category.name} category={category._id} params={query} />;
}
