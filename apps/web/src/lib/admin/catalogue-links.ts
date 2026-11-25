import { catalogueContextParams, type CatalogueContext } from '@almina/contracts';

const query = (params: URLSearchParams) => params.size ? `?${params}` : '';
/** The editor keeps the list it was opened from in its address, so "next" means the next row of that list. */
export function editorHref(id: string, context: Partial<CatalogueContext> = {}) {
  return `/admin/products/${id}${query(catalogueContextParams(context))}`;
}
export function listHref(context: Partial<CatalogueContext> = {}, offset = 0, limit?: number) {
  const params = catalogueContextParams(context);
  if (offset > 0) params.set('offset', String(offset));
  if (limit && limit !== 25) params.set('limit', String(limit));
  return `/admin/products${query(params)}`;
}
export function queueQuery(id: string, context: CatalogueContext) {
  const params = catalogueContextParams(context);
  params.set('id', id);
  return params;
}
