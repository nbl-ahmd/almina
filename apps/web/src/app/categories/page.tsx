import { metadataFor } from '../../lib/server/seo';
import type { Query } from '../../lib/seo';
import { getCategories } from '../../lib/server/catalog';
import { CategoryGrid, Breadcrumb } from '../../components/storefront';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) { return metadataFor('Categories', 'Browse healthcare, skincare and wellness categories at Al Mina Pharmacy.', '/categories', await searchParams); }
export default async function CategoriesPage() { return <><Breadcrumb title="Categories" /><h1>Categories</h1><CategoryGrid categories={await getCategories()} /></>; }
