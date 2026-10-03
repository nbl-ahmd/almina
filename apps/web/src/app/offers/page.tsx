import { metadataFor } from '../../lib/server/seo';
import { CatalogList, type SearchParams } from '../../components/catalog-list';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) { return metadataFor('Offers', 'Browse current product offers and sale prices at Al Mina Pharmacy.', '/offers', await searchParams); }
export default async function OffersPage({ searchParams }: { searchParams: Promise<SearchParams> }) { return <CatalogList title="Offers" offers params={await searchParams} />; }
