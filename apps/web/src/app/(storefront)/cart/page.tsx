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
  const products = await getProducts({ featured: true })
    .then(result => result.products.filter(product => product.stock > 0).slice(0, 6))
    .catch(() => []);

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
