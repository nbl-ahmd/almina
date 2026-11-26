import { AsyncLocalStorage } from 'node:async_hooks';

/** Which kind of request the database work running now belongs to, so traffic can be traced to the pages that cause it. */
export const trafficContext = new AsyncLocalStorage<string>();
/** Work that no request is waiting for: start-up and background jobs. */
export const backgroundTraffic = 'worker';
/** Runs `start` outside any request, so a timer or listener armed during a request is not counted against that request. */
export function outsideRequest<T>(start: () => T): T { return trafficContext.exit(start); }

type Lookup = (method: string, path: string) => { path: string } | undefined | null;
/** A route pattern, never the address itself: identifiers, phone numbers and query strings stay out of the logs. */
export function trafficLabel(method: string, path: string, lookup: Lookup): string {
  const verb = /^[A-Z]{3,7}$/.test(method) ? method : 'OTHER';
  if (path.startsWith('/api/v1/')) {
    // Only short words are kept: a database id, even one made of letters, is longer than any route name.
    const parts = path.slice('/api/v1/'.length).split('/').filter(Boolean).slice(0, 2).map(part => /^[a-z][a-z-]{0,19}$/.test(part) ? part : ':x');
    return `${verb} /api/v1/${parts.join('/')}`;
  }
  return `${verb} ${(path.startsWith('/api/') ? lookup(method, path)?.path : undefined) ?? 'other'}`;
}
/** Express middleware: everything the rest of this request does is attributed to its route pattern. */
export function attributeTraffic(lookup: Lookup) {
  return (request: { method: string; originalUrl: string }, _response: unknown, next: () => void) => {
    trafficContext.run(trafficLabel(request.method, request.originalUrl.split('?')[0]!, lookup), next);
  };
}
