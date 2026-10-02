import { NextResponse } from 'next/server';
import { getProductByPublicId } from '../../../lib/server/catalog';
import { productHref } from '../../../lib/catalog/model';
import { getWebEnvironment } from '../../../lib/server/env';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const product = await getProductByPublicId((await params).id);
    if (!product) return new Response('Product not found', { status: 404 });
    const url = new URL(request.url);
    url.pathname = productHref(product);
    return NextResponse.redirect(url, { status: getWebEnvironment().STOREFRONT_REDIRECTS_VERIFIED ? 308 : 307, headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('Catalog temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
