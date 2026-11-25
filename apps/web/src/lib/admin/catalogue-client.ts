'use client';
import type { CatalogueContext, CatalogueQueue } from '@almina/contracts';
import { adminRequest, AdminRateLimitError } from '../../components/admin/controls';
import { queueQuery } from './catalogue-links';

/** Repeats a request that was only refused for being too frequent, waiting as long as the server asks. Staff working through
 *  thousands of products reach the limit; they should see a pause, not a failure. */
export async function withRateLimitRetry<T>(task: () => Promise<T>, onWait?: (seconds: number) => void, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await task(); }
    catch (failure) {
      if (!(failure instanceof AdminRateLimitError) || attempt >= attempts) throw failure;
      onWait?.(failure.retryAfterSeconds);
      await new Promise(resolve => setTimeout(resolve, failure.retryAfterSeconds * 1000));
    }
  }
}
export function nextInQueue(id: string, context: CatalogueContext, onWait?: (seconds: number) => void) {
  return withRateLimitRetry(() => adminRequest(`products/queue?${queueQuery(id, context)}`) as Promise<CatalogueQueue>, onWait);
}
