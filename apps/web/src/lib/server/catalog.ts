import 'server-only';
import { cache } from 'react';
import { getWebEnvironment } from './env';
import { readCategory, readProduct, objectId, publicId, slugIdentity, type Product } from '../catalog/model';
import { catalogReadPolicy } from '../catalog/cache-policy';

export class CatalogUnavailable extends Error {
  constructor() { super('Catalog service unavailable'); }
}
export async function legacyRead(path: string, content = false): Promise<unknown> {
  try {
    const response = await fetch(new URL(path, getWebEnvironment().LEGACY_API_ORIGIN), {
      ...catalogReadPolicy(path, content), signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' },
      redirect: 'error',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new CatalogUnavailable();
    return await response.json() as unknown;
  } catch { throw new CatalogUnavailable(); }
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new CatalogUnavailable();
  return value;
}
// Missing legacy disabled fields are public too; normalize before exposing anything.
export const getCategories = cache(async () => array(await legacyRead('/api/category', true))
  .map(readCategory).filter(category => category !== null));
const getFreshCategories = cache(async () => array(await legacyRead('/api/category'))
  .map(readCategory).filter(category => category !== null));
export async function getCategory(identity: string) {
  if (!objectId.test(identity)) return null;
  // The legacy single-category handler returns 500 for missing IDs. Resolve against the public list instead.
  // Identity/visibility and cart checks bypass the presentation cache.
  return (await getFreshCategories()).find(category => category._id === identity) ?? null;
}
export async function getProducts(options: { page?: number; category?: string; offers?: boolean; featured?: boolean; q?: string } = {}) {
  const page = Math.max(1, Math.min(1000, options.page ?? 1));
  const filter: Record<string, boolean | string> = { disabled: false };
  if (options.category && objectId.test(options.category)) filter.category = options.category;
  if (options.offers) filter.sale = true;
  if (options.featured) filter.featured = true;
  const params = new URLSearchParams({ disabledCat: 'false', limit: '30', offset: String((page - 1) * 30) });
  if (options.q) {
    // The hardened legacy API treats q as literal text and escapes it on the server.
    params.set('q', options.q.slice(0, 80));
    params.set('filter', JSON.stringify([filter]));
  } else params.set('filter', JSON.stringify(filter));
  const raw = array(await legacyRead(`/api/products${options.q ? '/search' : ''}?${params}`));
  return { products: raw.map(readProduct).filter(product => product !== null), hasNext: raw.length === 30, page };
}
export const getProductByPublicId = cache(async (id: string) => {
  if (!publicId.test(id)) return null;
  const data = await legacyRead(`/api/products/details/${encodeURIComponent(id)}`);
  if (!data || typeof data !== 'object' || !('product' in data)) return null;
  return readProduct(data.product);
});
export async function getProductById(id: string): Promise<Product | null> {
  if (!objectId.test(id)) return null;
  const data = await legacyRead(`/api/products/${id}`);
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const category = typeof raw.category === 'string' ? await getCategory(raw.category) : raw.category;
  return readProduct({ ...raw, category });
}
export async function resolveProduct(slug: string) {
  const id = slugIdentity(slug);
  return id ? getProductByPublicId(id) : null;
}
export async function resolveCategory(slug: string) {
  const id = slugIdentity(slug) ?? slug;
  return getCategory(id);
}
function fileName(value: string | undefined) {
  return value && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : null;
}
export function productImage(product: Product) {
  const image = fileName(product.image);
  if (image) return `https://cdn.alminapharmacy.com/cdn/products/${image}`;
  const legacy = fileName(product.images?.[0]);
  return legacy ? `${getWebEnvironment().LEGACY_API_ORIGIN}/api/products/images/${legacy}` : '/product-placeholder.svg';
}
export function categoryImage(image: string | undefined) {
  const name = fileName(image);
  return name ? `https://cdn.alminapharmacy.com/cdn/categories/${name}` : '/product-placeholder.svg';
}
export async function getBanners() {
  return array(await legacyRead('/api/banners', true)).flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const raw = value as Record<string, unknown>;
    const name = fileName(typeof raw.image === 'string' ? raw.image : undefined);
    return name ? [{ image: `https://cdn.alminapharmacy.com/cdn/banners/${name}`, name: typeof raw.name === 'string' ? raw.name : 'Al Mina Pharmacy offers' }] : [];
  });
}

export function productImages(product: Product) {
  const images = product.images?.flatMap(value => {
    const name = fileName(value);
    return name ? [`${getWebEnvironment().LEGACY_API_ORIGIN}/api/products/images/${name}`] : [];
  }) ?? [];
  return [...new Set([productImage(product), ...images])];
}
