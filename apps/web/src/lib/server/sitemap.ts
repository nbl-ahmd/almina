import 'server-only';
import { publicSitemapCache } from '../security/request-work';
import { sitemapPageSchema, successSchema } from '@almina/contracts';
import { getWebEnvironment } from './env';
import { categoryPath, productPath } from '../catalog/model';

export type SitemapKind = 'products' | 'categories';
export async function sitemapPage(kind: SitemapKind, cursor?: string) {
  const query = new URLSearchParams({ kind, ...(cursor ? { cursor } : {}) });
  const response = await fetch(new URL(`/api/v1/catalog/sitemap?${query}`, getWebEnvironment().API_ORIGIN), {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Sitemap catalog unavailable');
  const { data } = successSchema(sitemapPageSchema).parse(await response.json());
  if (kind === 'products' && data.items.some(item => !item.productId)) throw new Error('Invalid sitemap catalog');
  return { paths: data.items.map(item => kind === 'products' ? productPath(item.name, item.productId!) : categoryPath(item.name, item.id)), nextCursor: data.nextCursor };
}
export function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}
export function xmlResponse(type: 'urlset' | 'sitemapindex', urls: string[]) {
  const tag = type === 'urlset' ? 'url' : 'sitemap';
  const body = `<?xml version="1.0" encoding="UTF-8"?><${type} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<${tag}><loc>${escapeXml(url)}</loc></${tag}>`).join('')}</${type}>`;
  if (urls.length > 50000 || Buffer.byteLength(body) > 50 * 1024 * 1024) throw new Error('Sitemap protocol limit exceeded');
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': publicSitemapCache, 'Vercel-CDN-Cache-Control': 'public, s-maxage=300' } });
}
export function unavailableSitemap() {
  return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
}
