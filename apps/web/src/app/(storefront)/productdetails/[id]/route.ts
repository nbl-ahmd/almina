import { NextResponse } from 'next/server';
import { getProductByPublicId } from '../../../../lib/server/catalog';
import { productHref } from '../../../../lib/catalog/model';
import { getWebEnvironment } from '../../../../lib/server/env';
import { productReplacement } from '../../../../lib/server/product-replacements';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const replacement = productReplacement(id);
    const product = await getProductByPublicId(id) ?? (replacement ? await getProductByPublicId(replacement) : null);
    if (!product) return new Response('Product not found', { status: 404 });
    const url = new URL(request.url);
    url.pathname = productHref(product);
    return NextResponse.redirect(url, { status: getWebEnvironment().STOREFRONT_REDIRECTS_VERIFIED ? 308 : 307, headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('Catalog temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
