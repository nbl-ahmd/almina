import { getGrowthPages } from '../../../../lib/server/growth';
import { growthPagePath } from '@almina/contracts';
import { homeCollections, collectionHref, sitemapBrands, brandSlug } from '../../../../lib/catalog/merchandising';
import { getProducts } from '../../../../lib/server/catalog';
import { getCollectionProducts } from '../../../../lib/server/collections';
import { getWebEnvironment } from '../../../../lib/server/env';
import { sitemapPage, xmlResponse, unavailableSitemap } from '../../../../lib/server/sitemap';
import { policyPaths } from '../../../../lib/policies';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; page: string }> }) {
  if (new URL(_request.url).search) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
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
    // Brand landing pages for brands with at least three in-stock products, read from the catalogue (bounded at 100 pages of 30).
    const brandPaths: string[] = [];
    if (staticKind) {
      const products = [];
      for (let catalogPage = 1; catalogPage <= 100; catalogPage++) {
        const result = await getProducts({ page: catalogPage }).catch(() => ({ products: [], hasNext: false }));
        products.push(...result.products);
        if (!result.hasNext) break;
      }
      brandPaths.push(...sitemapBrands(products).map(name => '/brands/' + brandSlug(name)).filter(path => path !== '/brands/'));
    }
    const staticPaths = ['/', '/products', '/categories', '/offers', '/about', '/contact', '/ras-al-khaimah', '/brands',
      ...(hasGuides ? ['/health-guides'] : []), policyPaths.returns, policyPaths.shipping, policyPaths.terms, policyPaths.privacy];
    const paths = staticKind ? [...new Set([...staticPaths, ...editorial, ...eligibleCollections, ...brandPaths])]
      : (await sitemapPage(kind as 'products' | 'categories', page === 'first.xml' ? undefined : page.slice(0, -4))).paths;
    return xmlResponse('urlset', paths.map(path => new URL(path, env.WEB_ORIGIN).href));
  } catch { return unavailableSitemap(); }
}
