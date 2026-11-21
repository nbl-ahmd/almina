import { z } from 'zod';
import { productContentFields, familyProfile, productFamilyFields, variantLabel, productBusinessIdPattern } from '@almina/contracts';

export const objectId = /^[a-f0-9]{24}$/i;
export const publicId = productBusinessIdPattern;
const categorySchema = z.object({ _id: z.string().regex(objectId), name: z.string().min(1),
  image: z.string().optional(), disabled: z.boolean().optional() });
const productSchema = z.object({ ...productFamilyFields, ...productContentFields, familyOptionCount:z.number().int().min(1).max(60).optional(),familyPriceVaries:z.boolean().optional(), _id: z.string().regex(objectId), product_id: z.string().regex(publicId),
  name: z.string().min(1), category: categorySchema, price: z.number().finite().nonnegative(),
  salePrice: z.number().finite().nonnegative().optional(), stock: z.number().int().nonnegative(),
  disabled: z.boolean().optional(), sale: z.boolean().optional(), featured: z.boolean().optional(),
  image: z.string().optional(), images: z.array(z.string()).optional(),
  cloudinaryImages: z.array(z.string()).max(8).optional(),
  description: z.string().optional(), saleBadge: z.string().optional() });
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export function readCategory(value: unknown): Category | null {
  const result = categorySchema.safeParse(value);
  return result.success && result.data.disabled !== true ? result.data : null;
}
export function readProduct(value: unknown): Product | null {
  const raw = value && typeof value === 'object' ? value as Record<string,unknown> : {};
  const core = Object.fromEntries(Object.entries(raw).filter(([key])=>!(key in productFamilyFields)));
  const result = productSchema.safeParse({...core,...(familyProfile(raw)??{})});
  return result.success && result.data.disabled !== true && result.data.category.disabled !== true ? result.data : null;
}
function nameSlug(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'item';
}
// The existing identifier is the identity; the readable prefix may change without breaking links.
export const productSlug = (product: Product) => `${nameSlug(product.name)}--${product.product_id}`;
export const categorySlug = (category: Category) => `${nameSlug(category.name)}--${category._id}`;
export function slugIdentity(slug: string): string | null {
  // Generated readable prefixes cannot contain "--"; reviewed IDs can.
  const separator = slug.indexOf('--');
  const identity = separator >= 0 ? slug.slice(separator + 2) : '';
  return identity && publicId.test(identity) ? identity : null;
}
export const productHref = (product: Product) => `/products/${productSlug(product)}`;
export const categoryHref = (category: Category) => `/categories/${categorySlug(category)}`;
export const productPath = (name: string, id: string) => `/products/${nameSlug(name)}--${id}`;
export const categoryPath = (name: string, id: string) => `/categories/${nameSlug(name)}--${id}`;
export const money = (value: number, locale: 'en' | 'ar' = 'en') => locale === 'en' ? `AED ${value.toFixed(2)}` : new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
// Match the server's active-sale rule, including a valid zero-price sale.
// Presentation remains a catalog value, not an authoritative checkout quote.
export const displayPrice = (product: Product) => product.sale === true && product.salePrice !== undefined ? product.salePrice : product.price;
export const cartLineSchema = z.object({ id: z.string().regex(objectId), quantity: z.number().int().min(1).max(999) });
export const cartSchema = z.array(cartLineSchema).max(100).refine(lines => new Set(lines.map(line => line.id)).size === lines.length);
export type CartLine = z.infer<typeof cartLineSchema>;
export function decodeStoredCart(raw: string | null, legacy = false): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    const candidates = legacy ? data.map((line: unknown) => {
      if (!line || typeof line !== 'object') return null;
      const item = line as Record<string, unknown>;
      return { id: item._id, quantity: item.quantity };
    }) : data;
    const result = cartSchema.safeParse(candidates);
    return result.success ? result.data : [];
  } catch { return []; }
}

export const productOptionLabel = (product: Product) => variantLabel(product);

/** Separate a literal terminal pack size while keeping strengths such as 500mg / 5 ml intact. */
export function literalPackFromName(name: string) {
  const size = /[ (]+([0-9]+(?:[.,][0-9]+)?\s*(?:ml|kg|g|litres?|liters?))\)?$/i.exec(name);
  if (!size?.[1]) return null;
  const prefix = name.slice(0, size.index).trimEnd();
  return prefix && !/(?:\/|\bper)$/i.test(prefix) ? { label: size[1], prefix } : null;
}
