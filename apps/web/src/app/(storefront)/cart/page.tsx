import { Breadcrumb } from '../../../components/storefront';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
import { CartView } from '../../../components/cart-view';
import { ProductCard } from '../../../components/product-card';
import { CartRecommendations } from '../../../components/cart-recommendations';
import { getProducts } from '../../../lib/server/catalog';
export async function generateMetadata() { return { title: t(await getLocale(), 'cartPageTitle'), robots: { index: false, follow: true } }; }
export default async function CartPage() {
  const locale = await getLocale();
  const products = await getProducts({featured:true}).then(result=>result.products.filter(product=>product.stock>0).slice(0,6)).catch(()=>[]);
  return <div className="cart-page"><Breadcrumb title={t(locale, 'cartPageTitle')} /><div className="mb-5"><h1 className="mb-0 text-2xl font-semibold md:mb-2 md:text-3xl">{t(locale, 'cartPageTitle')}</h1><p className="mb-0 hidden text-sm text-ocean md:block">{t(locale, 'cartPageSubtitle')}</p></div><CartView locale={locale} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} orderingEnabled={getWebEnvironment().CHECKOUT_ENABLED} recommendations={<CartRecommendations title={t(locale,'cartExploreMore')} products={await Promise.all(products.map(async product=>({id:product._id,card:<ProductCard product={product} />})))} /> } /></div>;
}
