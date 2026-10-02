import { CatalogList, type SearchParams } from '../../components/catalog-list';
export const metadata = { title: 'Offers' };
export default async function OffersPage({ searchParams }: { searchParams: Promise<SearchParams> }) { return <CatalogList title="Offers" offers params={await searchParams} />; }
