import 'server-only';
import { cartSchema, displayPrice, productHref, type CartLine } from '../catalog/model';
import { getProductById, legacyRead, productImage } from './catalog';
export async function readCart(lines: CartLine[]) {
  const parsed = cartSchema.parse(lines);
  return Promise.all(parsed.map(async line => {
    const product = await getProductById(line.id);
    return product ? { ...line, name: product.name, price: displayPrice(product), stock: product.stock,
      image: productImage(product), href: productHref(product), available: product.stock >= line.quantity } :
      { ...line, name: 'Unavailable product', price: null, stock: 0, image: '/product-placeholder.svg', href: '/products', available: false };
  }));
}
export async function validateCartAddition(id: string, quantity: number) {
  cartSchema.parse([{ id, quantity }]);
  const [product, status] = await Promise.all([getProductById(id), legacyRead('/api/store/status')]);
  if (!status || typeof status !== 'object' || !('status' in status) || status.status !== 'open') return 'The store is currently closed.';
  if (!product) return 'This product is unavailable.';
  if (product.stock < quantity) return 'Stock is low. Please choose a smaller quantity.';
  return null;
}
