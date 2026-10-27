import 'server-only';
import {searchProducts,type SearchMetadata} from './search';
import { cache } from 'react';
import { getWebEnvironment } from './env';
import { readCategory, readProduct, objectId, publicId, slugIdentity, type Product } from '../catalog/model';
import { catalogReadPolicy } from '../catalog/cache-policy';
import { bannerDestination } from '../catalog/merchandising';
import { publicImage } from '../catalog/image-delivery';
import { CatalogUnavailable, catalogArray, readCatalogResponse } from './catalog-response';

export async function legacyRead(path: string, content = false, allowMissing = false): Promise<unknown> {
  const env = getWebEnvironment();
  const development = env.APP_ENV === 'development';
  let response: Response;
  try {
    response = await fetch(new URL(path, env.LEGACY_API_ORIGIN), {
      ...catalogReadPolicy(path, content), signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' },
      redirect: 'error',
    });
  } catch { throw new CatalogUnavailable('connection', development); }
  return readCatalogResponse(response, allowMissing, development);
}
function array(value: unknown): unknown[] {
  return catalogArray(value, getWebEnvironment().APP_ENV === 'development');
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
export async function getProducts(options: { page?: number; category?: string; offers?: boolean; featured?: boolean; q?: string; inStock?: boolean; minPrice?: number; maxPrice?: number; sort?: 'relevance'|'price-asc'|'price-desc'|'name'; brand?:string;locale?:'en'|'ar';literal?:boolean;form?:string;size?:string;audience?:string;bodyArea?:string;concern?:string;feature?:string } = {}) {
  const page = Math.max(1, Math.min(options.q?10:1000, options.page ?? 1));
  if(options.q){
    try{return await searchProducts({q:options.q.slice(0,80),page,locale:options.locale??'en',sort:options.sort??'relevance',
      ...(options.category&&objectId.test(options.category)?{category:options.category}:{}),...(options.brand?{brand:options.brand}:{}),
      ...Object.fromEntries((['form','size','audience','bodyArea','concern','feature'] as const).flatMap(key=>options[key]?[[key,options[key]]]:[])),
      ...(options.featured?{featured:'true'}:{}),...(options.offers?{offers:'true'}:{}),...(options.inStock===undefined?{}:{inStock:String(options.inStock)}),
      ...(options.minPrice===undefined?{}:{minPrice:options.minPrice}),...(options.maxPrice===undefined?{}:{maxPrice:options.maxPrice}),...(options.literal?{literal:'true'}:{})});}
    catch{return {products:[] as Product[],hasNext:false,page,search:undefined as SearchMetadata|undefined,searchUnavailable:true};}
  }
  const filter: Record<string, boolean | string> = { disabled: false };
  if (options.category && objectId.test(options.category)) filter.category = options.category;
  if (options.offers) filter.sale = true;
  if (options.featured) filter.featured = true;
  const params = new URLSearchParams({ disabledCat: 'false', groupFamilies:'true', limit: '30', offset: String((page - 1) * 30) });
  if (options.inStock !== undefined) params.set('inStock', String(options.inStock));
  if (options.minPrice !== undefined) params.set('minPrice', String(options.minPrice));
  if (options.maxPrice !== undefined) params.set('maxPrice', String(options.maxPrice));
  if (options.sort) params.set('sort', options.sort);
  params.set('filter', JSON.stringify(filter));
  const raw = array(await legacyRead(`/api/products?${params}`));
  return { products: raw.map(readProduct).filter(product => product !== null), hasNext: raw.length === 30, page,search:undefined as SearchMetadata|undefined,searchUnavailable:false };
}
const getProductDetail = cache(async (id: string) => {
  if (!publicId.test(id)) return {product:null,variants:[] as Product[],related:[] as Product[]};
  const data = await legacyRead(`/api/products/details/${encodeURIComponent(id)}`, false, true);
  if (!data || typeof data !== 'object' || !('product' in data)) return {product:null,variants:[] as Product[],related:[] as Product[]};
  const raw = data as {product:unknown;variants?:unknown;relatedProducts?:unknown};
  return {product:readProduct(raw.product),related:Array.isArray(raw.relatedProducts)?raw.relatedProducts.map(readProduct).filter((item):item is Product=>item!==null):[],variants:Array.isArray(raw.variants)?raw.variants.map(readProduct).filter((item):item is Product=>item!==null):[]};
});
export const getProductByPublicId = cache(async (id:string)=>(await getProductDetail(id)).product);
export async function getProductRecommendations(product:Product){return (await getProductDetail(product.product_id)).related;}
export async function getProductVariants(product:Product) {
  return product.familyKey ? (await getProductDetail(product.product_id)).variants : [];
}
export async function getProductById(id: string): Promise<Product | null> {
  if (!objectId.test(id)) return null;
  const data = await legacyRead(`/api/products/${id}`, false, true);
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
  const cloudinary = publicImage(product.cloudinaryImages?.[0], getWebEnvironment().CLOUDINARY_CLOUD_NAME, getWebEnvironment().APP_ENV === 'production');
  if (cloudinary) return cloudinary;
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
    return name ? [{ image: `https://cdn.alminapharmacy.com/cdn/banners/${name}`, name: typeof raw.name === 'string' ? raw.name : 'Al Mina Pharmacy offers', href: bannerDestination(raw.link) }] : [];
  });
}

export function productImages(product: Product) {
  const cloudinary = product.cloudinaryImages?.flatMap(value => {
    const image = publicImage(value, getWebEnvironment().CLOUDINARY_CLOUD_NAME, getWebEnvironment().APP_ENV === 'production');
    return image ? [image] : [];
  }) ?? [];
  const images = product.images?.flatMap(value => {
    const name = fileName(value);
    return name ? [`${getWebEnvironment().LEGACY_API_ORIGIN}/api/products/images/${name}`] : [];
  }) ?? [];
  return [...new Set([productImage(product), ...cloudinary, ...images])];
}
