import { Breadcrumb } from '../../../components/storefront';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
import { CartView } from '../../../components/cart-view';
import { ProductCard } from '../../../components/product-card';
import { getProducts } from '../../../lib/server/catalog';
import tokens from '../../../components/storefront-system/tokens.module.css';
import controls from '../../../components/storefront-system/boundary.module.css';
import styles from '../../../components/cart-view.module.css';

export async function generateMetadata() {
  return { title: t(await getLocale(), 'cartPageTitle'), robots: { index: false, follow: true } };
}

export default async function CartPage() {
  const locale = await getLocale();
  const env = getWebEnvironment();
  const featured = await getProducts({ featured: true })
    .then(result => result.products.filter(product => product.stock > 0))
    .catch(() => []);
  // Sparse or uncurated catalogues should still give the empty cart something to browse.
  const fallback = featured.length < 4
    ? await getProducts({ inStock: true }).then(result => result.products).catch(() => [])
    : [];
  const products = [...featured, ...fallback.filter(product => !featured.some(item => item._id === product._id))].slice(0, 6);

  return <div className={`cart-page ${styles.page} ${tokens.system} ${controls.boundary}`} lang={locale}>
    <div className={styles.content}>
      <Breadcrumb title={t(locale, 'cartPageTitle')} />
      <header className={styles.heading}>
        <h1>{t(locale, 'cartPageTitle')}</h1>
      </header>
      <CartView
        locale={locale}
        cloudName={env.CLOUDINARY_CLOUD_NAME}
        orderingEnabled={env.CHECKOUT_ENABLED}
        recommendations={products.map(product => ({
          id: product._id,
          card: <ProductCard product={product} headingLevel={3} />,
        }))}
      />
    </div>
  </div>;
}
