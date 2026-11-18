import { createHash } from 'node:crypto';
import type { Document } from 'mongodb';
export { compareImageIdentity, imageReviewProductIdentity, reviewGtin, reviewStrength } from '@almina/contracts';

export const reviewDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function imageReviewProductRevision(product: Document): string {
  // Stock and prices may change during a review; identity and media must not.
  return reviewDigest(['_id', 'name', 'product_id', 'brand', 'manufacturer', 'strength', 'productForm', 'packLabel', 'variantSize', 'variantPackSize', 'variantFlavour', 'mpn', 'barcode', 'gtin', 'images', 'cloudinaryImages', 'gdriveFileIds', 'mediaRevision', 'archivedAt'].map(key => [key, product[key] ?? null]));
}
