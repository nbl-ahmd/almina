import 'server-only';
import { getWebEnvironment } from './env';
// Explicit, reviewed equivalence mappings from retired public IDs to live public IDs.
// No replacements are evidenced by the repository; never guess from names/categories.
export function productReplacement(id: string): string | undefined {
  const map = getWebEnvironment().STOREFRONT_PRODUCT_REPLACEMENTS;
  return Object.hasOwn(map, id) ? map[id] : undefined;
}
