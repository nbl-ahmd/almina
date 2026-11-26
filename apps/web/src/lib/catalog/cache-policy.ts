// Only public presentation content may use the persistent data cache. Product pages, search, cart, checkout, store status,
// staff and customer reads always come from the API. See docs/migration/BANDWIDTH_OPTIMIZATION_2026-11-26.md.
export const catalogContentTags = { categories: 'catalog:categories', banners: 'catalog:banners', products: 'catalog:products', growth: 'storefront:growth' } as const;
export function catalogReadPolicy(path: string, content = false) {
  const tag = content ? ({ '/api/category': catalogContentTags.categories, '/api/banners': catalogContentTags.banners } as Record<string, string>)[path] : undefined;
  return tag ? { cache: 'force-cache' as const, next: { revalidate: 60, tags: [tag] } }
    : { cache: 'no-store' as const };
}
/** Seconds a browse list or published storefront content may be reused (CATALOG_CACHE_SECONDS, 0 to 300; 0 turns it off). */
export function storefrontCacheSeconds(raw = process.env.CATALOG_CACHE_SECONDS): number {
  if (raw === undefined || raw === '') return 60;
  const seconds = Number(raw);
  return Number.isInteger(seconds) && seconds >= 0 && seconds <= 300 ? seconds : 60;
}
/** A bounded cache for browse lists and published content. The current time window is part of the cache key, so an entry is
 *  never served after its window ends (no stale-while-revalidate: a quiet page cannot show hours-old stock). Staff changes
 *  made through the website purge the tag at once. */
export function windowedReadPolicy(tag: string, seconds = storefrontCacheSeconds(), now = Date.now()) {
  if (!seconds) return { cache: 'no-store' as const };
  return { cache: 'force-cache' as const, next: { revalidate: seconds, tags: [tag] }, headers: { 'x-almina-cache-window': String(Math.floor(now / (seconds * 1000))) } };
}
