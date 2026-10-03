// Only non-commercial presentation content may use the persistent data cache.
export const catalogContentTags = { categories: 'catalog:categories', banners: 'catalog:banners' } as const;
export function catalogReadPolicy(path: string, content = false) {
  const tag = content ? ({ '/api/category': catalogContentTags.categories, '/api/banners': catalogContentTags.banners } as Record<string, string>)[path] : undefined;
  return tag ? { cache: 'force-cache' as const, next: { revalidate: 60, tags: [tag] } }
    : { cache: 'no-store' as const };
}
