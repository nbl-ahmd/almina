import { getWebEnvironment } from '../../../lib/server/env';
// The old unlinked map route listed third-party suburb names, not delivery coverage.
// Preserve the URL with an explicit redirect to actionable delivery enquiries.
export function GET(request: Request) {
  const target = new URL('/contact', getWebEnvironment().WEB_ORIGIN);
  target.search = new URL(request.url).search;
  target.hash = 'delivery';
  return Response.redirect(target, 308);
}
