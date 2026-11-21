import { catalogueLineMinor } from '../catalog/cart-display';
import { t, type Locale } from '../i18n';
import 'server-only';
import { cartSchema, productOptionLabel, displayPrice, productHref, type CartLine } from '../catalog/model';
import { getProductById, legacyRead, productImage } from './catalog';
export async function readCart(lines: CartLine[], locale: Locale = 'en') {
  const parsed = cartSchema.parse(lines);
  return Promise.all(parsed.map(async line => {
    const product = await getProductById(line.id);
    return product ? { ...line, name: product.name, variantLabel: productOptionLabel(product), price: displayPrice(product), lineTotalMinor: catalogueLineMinor(displayPrice(product), line.quantity), stock: product.stock,
      image: productImage(product), href: productHref(product), available: product.stock >= line.quantity, reminderEligible: product.productType === 'general' && product.contentReviewed === true } :
      { ...line, name: t(locale,'cartUnavailableProduct'), variantLabel: '', price: null, lineTotalMinor: null, stock: 0, image: '/product-placeholder.svg', href: '/products', available: false, reminderEligible: false };
  }));
}
export async function validateCartAddition(id: string, quantity: number, locale: Locale = 'en') {
  cartSchema.parse([{ id, quantity }]);
  const [product, status] = await Promise.all([getProductById(id), legacyRead('/api/store/status')]);
  if (!status || typeof status !== 'object' || !('status' in status) || status.status !== 'open') return t(locale,'cartStoreClosed');
  if (!product) return t(locale,'cartProductUnavailable');
  if (product.stock < quantity) return t(locale,'cartLowStock');
  return null;
}
