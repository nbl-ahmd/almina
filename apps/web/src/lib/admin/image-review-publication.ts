import { imageReviewPublishSchema, type ImageReviewList } from '@almina/contracts';

export const imagePublicationStorageKey = 'almina-image-publication-v1';
type Request = ReturnType<typeof imageReviewPublishSchema.parse>;
export type ImagePublicationPlan = { version: 1; next: number; groups: { productId: string; request: Request }[] };

/** Snapshot all pages before writing, keeping each product's gallery in one transaction. */
export function planImagePublication(rows: ImageReviewList['items'], uuid: () => string): ImagePublicationPlan {
  const groups = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.status !== 'approved' || !row.approvalId || !row.selectedProductId) continue;
    const ids = groups.get(row.selectedProductId) ?? new Set<string>();
    ids.add(row.approvalId); groups.set(row.selectedProductId, ids);
  }
  return { version: 1, next: 0, groups: [...groups].map(([productId, ids]) => {
    if (ids.size > 8) throw new Error(`${productId} has more than eight approved images. Review its gallery before publishing.`);
    return { productId, request: imageReviewPublishSchema.parse({ requestId: uuid(), approvalIds: [...ids].sort() }) };
  }) };
}

export function readImagePublication(raw: string): ImagePublicationPlan {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('next' in value) || !Number.isInteger(value.next) || !('groups' in value) || !Array.isArray(value.groups)) throw new Error('Invalid saved publication. Review the queue before retrying.');
  const groups = value.groups.map((group: unknown) => {
    if (!group || typeof group !== 'object' || !('productId' in group) || typeof group.productId !== 'string' || !('request' in group)) throw new Error('Invalid saved publication group.');
    return { productId: group.productId, request: imageReviewPublishSchema.parse(group.request) };
  });
  const next = value.next as number;
  if (next < 0 || next > groups.length) throw new Error('Invalid saved publication position.');
  return { version: 1, next, groups };
}

/** Persist before sending and after receiving. Lost responses replay the same server receipt. */
export async function runImagePublication(plan: ImagePublicationPlan, save: (value: ImagePublicationPlan) => void, publish: (request: Request) => Promise<unknown>, progress: (done: number, total: number, productId: string) => void) {
  save(plan);
  while (plan.next < plan.groups.length) {
    const group = plan.groups[plan.next]!;
    progress(plan.next, plan.groups.length, group.productId);
    try { await publish(group.request); }
    catch (error) { throw new Error(`${group.productId}: ${error instanceof Error ? error.message : 'Publication failed.'} Progress is saved. Resolve the issue and click Publish all again to resume.`); }
    plan.next += 1; save(plan);
  }
  return plan.groups.reduce((count, group) => count + group.request.approvalIds.length, 0);
}
