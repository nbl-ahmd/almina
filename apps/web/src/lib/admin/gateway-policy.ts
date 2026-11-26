import { catalogContentTags } from '../catalog/cache-policy';
import { adminBodyLimit } from './upload-limits';
export function catalogMutationTags(method: string, path: string): string[] {
  if (!['POST', 'PUT', 'DELETE'].includes(method)) return [];
  // Hiding a category also changes which products browse lists show.
  if (/^category(?:\/(?:disable\/)?[a-f0-9]{24})?$/i.test(path)) return [catalogContentTags.categories, catalogContentTags.products];
  if (/^banners(?:\/[a-f0-9]{24})?$/i.test(path)) return [catalogContentTags.banners];
  if (['batch', 'recovery/commit'].includes(path)) return [catalogContentTags.categories, catalogContentTags.products];
  // A direct artwork upload may have saved a banner or a category.
  if (path === 'media/artwork/commit') return [catalogContentTags.categories, catalogContentTags.banners];
  // Anything staff change about products shows on browse lists at once.
  if (/^(?:products(?:\/(?:visibility|type|publish\/[a-f0-9]{24}|[a-f0-9]{24}))?|media\/products\/[a-f0-9]{24}(?:\/commit)?|catalog-import\/(?:commit|rollback)|image-review\/(?:import|publish|draft))$/i.test(path)) return [catalogContentTags.products];
  return [];
}
export class GatewayBodyTooLarge extends Error {}
export async function readAdminBody(request: Request): Promise<Buffer<ArrayBuffer> | undefined> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > adminBodyLimit)) throw new GatewayBodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.length;
    if (length > adminBodyLimit) { await reader.cancel(); throw new GatewayBodyTooLarge(); }
    chunks.push(item.value);
  }
  return Buffer.concat(chunks);
}

// Only this reviewed product error crosses the gateway. Never forward upstream messages.
export function isProductFamilyConflict(path: string, method: string, status: number, body: unknown) {
  return status === 409 && ['POST','PUT'].includes(method) && /^products(?:\/[a-f0-9]{24})?$/i.test(path)
    && !!body && typeof body === 'object' && 'code' in body && body.code === 'PRODUCT_FAMILY_CONFLICT';
}
