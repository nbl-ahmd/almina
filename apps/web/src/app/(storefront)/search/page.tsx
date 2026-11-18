import { Suspense } from 'react';
import { PublicCatalogLoading } from '../../../components/catalog-loading';
import { CatalogList, type SearchParams } from '../../../components/catalog-list';
export const metadata = { title: 'Search', robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) { return <Suspense fallback={<PublicCatalogLoading title="Search" />}><CatalogList title="Search" params={await searchParams} /></Suspense>; }
