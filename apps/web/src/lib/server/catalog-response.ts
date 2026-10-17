type CatalogFailure = 'connection' | 'missing-route' | 'http' | 'format';
const developmentHints: Record<CatalogFailure, string> = {
  connection: 'Cannot reach the catalog API. Start the full compatibility API with npm run dev:api and check API_ORIGIN / LEGACY_API_ORIGIN.',
  'missing-route': 'The configured API does not serve this catalog route. Start the full compatibility API with npm run dev:api; the foundation API serves /api/v1 only.',
  http: 'The catalog API returned an unsuccessful response. Check that its local database is enabled and available.',
  format: 'The catalog API returned an unexpected response format. LEGACY_API_ORIGIN must serve the compatibility catalog routes.',
};
export class CatalogUnavailable extends Error {
  constructor(reason: CatalogFailure = 'format', development = false) {
    super(`Catalog service unavailable${development ? `. ${developmentHints[reason]}` : ''}`);
    this.name = 'CatalogUnavailable';
  }
}
export async function readCatalogResponse(response: Response, allowMissing: boolean, development: boolean): Promise<unknown> {
  if (response.status === 404) {
    if (allowMissing) return null;
    throw new CatalogUnavailable('missing-route', development);
  }
  if (!response.ok) throw new CatalogUnavailable('http', development);
  try { return await response.json() as unknown; }
  catch { throw new CatalogUnavailable('format', development); }
}
export function catalogArray(value: unknown, development: boolean): unknown[] {
  if (!Array.isArray(value)) throw new CatalogUnavailable('format', development);
  return value;
}
