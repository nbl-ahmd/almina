import { z } from 'zod';

export const objectId = /^[a-f0-9]{24}$/i;
export const publicId = /^[A-Za-z0-9_-]{1,80}$/;
const categorySchema = z.object({ _id: z.string().regex(objectId), name: z.string().min(1),
  image: z.string().optional(), disabled: z.boolean().optional() });
const productSchema = z.object({ _id: z.string().regex(objectId), product_id: z.string().regex(publicId),
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
  const result = productSchema.safeParse(value);
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
  const identity = slug.split('--').at(-1);
  return slug.includes('--') && identity && publicId.test(identity) ? identity : null;
}
export const productHref = (product: Product) => `/products/${productSlug(product)}`;
export const categoryHref = (category: Category) => `/categories/${categorySlug(category)}`;
export const productPath = (name: string, id: string) => `/products/${nameSlug(name)}--${id}`;
export const categoryPath = (name: string, id: string) => `/categories/${nameSlug(name)}--${id}`;
export const money = (value: number) => `AED ${value.toFixed(2)}`;
// Preserve legacy displayed sale-price behavior; this is not a checkout quote.
export const displayPrice = (product: Product) => product.salePrice || product.price;
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
