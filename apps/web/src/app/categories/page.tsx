import { metadataFor } from '../../lib/server/seo';
import type { Query } from '../../lib/seo';
import { getCategories } from '../../lib/server/catalog';
import { CategoryGrid, Breadcrumb } from '../../components/storefront';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) { return metadataFor('Categories', 'Browse healthcare, skincare and wellness categories at Al Mina Pharmacy.', '/categories', await searchParams); }
export default async function CategoriesPage() { return <><Breadcrumb title="Categories" /><div className="page-heading"><p className="eyebrow">CARE FOR EVERY ROUTINE</p><h1>Categories</h1><p>Find your essentials, one category at a time.</p></div><CategoryGrid categories={await getCategories()} /></>; }
