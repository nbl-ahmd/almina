import { getWebEnvironment } from '../../../../lib/server/env';
import { sitemapPage, xmlResponse, unavailableSitemap } from '../../../../lib/server/sitemap';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; page: string }> }) {
  const { kind, page } = await params;
  if (!['static', 'products', 'categories'].includes(kind) || !/^(first|[A-Za-z0-9_-]{1,512})\.xml$/.test(page)) return new Response('Not found', { status: 404 });
  if (kind === 'static' && page !== 'first.xml') return new Response('Not found', { status: 404 });
  try {
    const env = getWebEnvironment();
    if (env.APP_ENV !== 'production') return xmlResponse('urlset', []);
    const paths = kind === 'static' ? ['/', '/products', '/categories', '/offers']
      : (await sitemapPage(kind as 'products' | 'categories', page === 'first.xml' ? undefined : page.slice(0, -4))).paths;
    return xmlResponse('urlset', paths.map(path => new URL(path, env.WEB_ORIGIN).href));
  } catch { return unavailableSitemap(); }
}
