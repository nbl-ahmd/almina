import { Breadcrumb } from '../../../components/storefront';
import { getWebEnvironment } from '../../../lib/server/env';
import { CartView } from '../../../components/cart-view';
import { ProductGrid } from '../../../components/storefront';
import { getProducts } from '../../../lib/server/catalog';
export const metadata = { title: 'Your cart', robots: { index: false, follow: true } };
export default async function CartPage() {
  const products = await getProducts({featured:true}).then(result=>result.products.slice(0,2)).catch(()=>[]);
  return <div className="cart-page pb-28 md:pb-0"><Breadcrumb title="Your cart" /><div className="mb-5"><h1 className="mb-0 text-2xl font-semibold md:mb-2 md:text-3xl">Your cart</h1><p className="mb-0 hidden text-sm text-ocean md:block">Review your items and adjust quantities here.</p></div><CartView cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} recommendations={products.length ? <section className="mt-6 [&_.product-grid]:md:grid-cols-2 [&_.product-grid]:lg:grid-cols-2"><h2 className="mb-4 text-base font-semibold">Explore more products</h2><ProductGrid headingLevel={3} variant="home" products={products} /></section> : null} /></div>;
}
