'use client';
import { adminRequest } from '../../components/admin/controls';

/** Session cache for combobox options, so editing many products does not refetch them. */
let brandCache: string[] | null = null;
let brandLoad: Promise<string[]> | null = null;

export async function loadBrands(): Promise<string[]> {
  if (brandCache) return brandCache;
  // One request for every brand name, so opening the editor does not spend the staff request allowance page by page.
  brandLoad ??= (async () => {
    const response = await fetch('/api/growth/admin/brands', { cache: 'no-store' });
    if (!response.ok) throw new Error('Brands could not be loaded. Type the brand and select it again.');
    const body = await response.json() as { data?: unknown };
    const found = Array.isArray(body.data) ? body.data.filter((brand): brand is string => typeof brand === 'string' && Boolean(brand.trim())).map(brand => brand.trim()) : [];
    // Brands created under Catalogue → Brands are offered even before a product carries the name (best effort).
    const created = await fetch('/api/growth/admin/pages?kind=brand&locale=en&merchandising=1', { cache: 'no-store' })
      .then(async result => result.ok ? ((await result.json() as { data?: { items?: { title?: unknown }[] } }).data?.items ?? []) : []).catch(() => []);
    const known = new Set(found.map(brand => brand.toLowerCase()));
    for (const page of created) if (typeof page.title === 'string' && page.title.trim() && !known.has(page.title.trim().toLowerCase())) found.push(page.title.trim());
    brandCache = [...new Set(found)].sort((a, b) => a.localeCompare(b));
    return brandCache;
  })().finally(() => { brandLoad = null; });
  return brandLoad;
}
export function rememberBrand(name: string) {
  if (brandCache && !brandCache.some(brand => brand.toLowerCase() === name.toLowerCase())) brandCache = [...brandCache, name].sort((a, b) => a.localeCompare(b));
}

export async function createCategory(name: string): Promise<{ value: string; label: string }> {
  const body = new FormData();
  body.set('name', name);
  await adminRequest('category', 'POST', body);
  // The create endpoint returns no identifier; read the category back by name.
  for (let offset = 0; offset < 1000; offset += 100) {
    const page = await adminRequest(`category?limit=100&offset=${offset}`);
    const rows = Array.isArray(page) ? page as { _id: string; name: string }[] : [];
    const match = rows.find(row => row.name.toLowerCase() === name.toLowerCase());
    if (match) return { value: match._id, label: match.name };
    if (rows.length < 100) break;
  }
  throw new Error('Category added, but it could not be selected. Reload the page and choose it.');
}
