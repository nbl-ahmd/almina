import { Breadcrumb } from '../../../components/storefront';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
import { CartView } from '../../../components/cart-view';
import { ProductGrid } from '../../../components/storefront';
import { getProducts } from '../../../lib/server/catalog';
export async function generateMetadata() { return { title: t(await getLocale(), 'cartPageTitle'), robots: { index: false, follow: true } }; }
export default async function CartPage() {
  const locale = await getLocale();
  const products = await getProducts({featured:true}).then(result=>result.products.slice(0,2)).catch(()=>[]);
  return <div className="cart-page pb-28 md:pb-0"><Breadcrumb title={t(locale, 'cartPageTitle')} /><div className="mb-5"><h1 className="mb-0 text-2xl font-semibold md:mb-2 md:text-3xl">{t(locale, 'cartPageTitle')}</h1><p className="mb-0 hidden text-sm md:block">{t(locale, 'cartPageSubtitle')}</p></div><CartView locale={locale} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} recommendations={products.length ? <section className="mt-6 [&_.product-grid]:md:grid-cols-2 [&_.product-grid]:lg:grid-cols-2"><h2 className="mb-4 text-base font-semibold">{t(locale, 'cartExploreMore')}</h2><ProductGrid headingLevel={3} variant="home" products={products} /></section> : null} /></div>;
}
