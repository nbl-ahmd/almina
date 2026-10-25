import { getGrowthPages } from '../../../../lib/server/growth';
import { growthPagePath } from '@almina/contracts';
import { homeCollections, collectionHref } from '../../../../lib/catalog/merchandising';
import { getCollectionProducts } from '../../../../lib/server/collections';
import { getWebEnvironment } from '../../../../lib/server/env';
import { sitemapPage, xmlResponse, unavailableSitemap } from '../../../../lib/server/sitemap';
import { policyPaths } from '../../../../lib/policies';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; page: string }> }) {
  const { kind, page } = await params;
  if (!['static', 'products', 'categories'].includes(kind) || !/^(first|[A-Za-z0-9_-]{1,512})\.xml$/.test(page)) return new Response('Not found', { status: 404 });
  if (kind === 'static' && page !== 'first.xml') return new Response('Not found', { status: 404 });
  try {
    const env = getWebEnvironment();
    if (env.APP_ENV !== 'production') return xmlResponse('urlset', []);
    const staticKind = kind === 'static';
    const eligibleCollections = staticKind ? (await Promise.all(homeCollections.map(async collection => (await getCollectionProducts(collection)).length ? collectionHref(collection) : null))).filter((path): path is string => path !== null) : [];
    const editorial: string[] = [];
    if (staticKind) for (const locale of ['en', 'ar']) for (let offset = 0; offset <= 10000; offset += 50) {
      const growth = await getGrowthPages(undefined, locale, offset);
      editorial.push(...growth.items.map(growthPagePath));
      if (!growth.hasNext) break;
    }
    const hasGuides = editorial.some(path => path.includes('/health-guides/'));
    const staticPaths = ['/', '/products', '/categories', '/offers', '/about', '/contact', '/ras-al-khaimah', '/brands',
      ...(hasGuides ? ['/health-guides'] : []), policyPaths.returns, policyPaths.shipping, policyPaths.terms, policyPaths.privacy];
    const paths = staticKind ? [...new Set([...staticPaths, ...editorial, ...eligibleCollections])]
      : (await sitemapPage(kind as 'products' | 'categories', page === 'first.xml' ? undefined : page.slice(0, -4))).paths;
    return xmlResponse('urlset', paths.map(path => new URL(path, env.WEB_ORIGIN).href));
  } catch { return unavailableSitemap(); }
}
