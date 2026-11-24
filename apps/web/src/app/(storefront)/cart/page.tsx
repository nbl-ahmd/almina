import { Breadcrumb } from '../../../components/storefront';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
import { CartView } from '../../../components/cart-view';
import { ProductGrid } from '../../../components/storefront';
import { getProducts } from '../../../lib/server/catalog';
import { cookies } from 'next/headers';
import { readCart } from '../../../lib/server/cart';
import { cartCookieName, decodeCartCookie } from '../../../lib/catalog/cart-cookie';
export async function generateMetadata() { return { title: t(await getLocale(), 'cartPageTitle'), robots: { index: false, follow: true } }; }
export default async function CartPage() {
  const locale = await getLocale();
  const products = await getProducts({featured:true}).then(result=>result.products.slice(0,2)).catch(()=>[]);
  // First paint from the cookie copy of the device cart; CartView reconciles with localStorage on mount.
  const cookieLines = decodeCartCookie((await cookies()).get(cartCookieName)?.value);
  const initialItems = cookieLines ? await readCart(cookieLines, locale).catch(() => undefined) : undefined;
  return <div className="cart-page pb-28 md:pb-0"><Breadcrumb title={t(locale, 'cartPageTitle')} /><CartView locale={locale} {...(cookieLines && initialItems ? { initialLines: cookieLines, initialItems } : {})} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} recommendations={products.length ? <section className="mt-6 [&_.product-grid]:md:grid-cols-2 [&_.product-grid]:lg:grid-cols-2"><h2 className="mb-4 text-base font-semibold">{t(locale, 'cartExploreMore')}</h2><ProductGrid headingLevel={3} variant="home" products={products} /></section> : null} /></div>;
}
