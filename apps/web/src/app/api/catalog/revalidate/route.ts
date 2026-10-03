import { revalidateTag } from 'next/cache';
import { getWebEnvironment } from '../../../../lib/server/env';
import { authorizeCatalogRevalidation, RevalidationRejected } from '../../../../lib/catalog/revalidation';

// Existing server-side staff identity is the boundary. No anonymous cache purge.
export async function POST(request: Request) {
  try {
    const tag = await authorizeCatalogRevalidation(request, getWebEnvironment());
    revalidateTag(tag, { expire: 0 });
    return Response.json({ revalidated: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: 'Catalog revalidation unavailable' }, {
      status: error instanceof RevalidationRejected ? error.status : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
