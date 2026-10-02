import { getCategories } from '../../lib/server/catalog';
import { CategoryGrid, Breadcrumb } from '../../components/storefront';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories' };
export default async function CategoriesPage() { return <><Breadcrumb title="Categories" /><h1>Categories</h1><CategoryGrid categories={await getCategories()} /></>; }
