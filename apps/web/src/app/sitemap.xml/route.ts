import { getWebEnvironment } from '../../lib/server/env';
import { sitemapPage, xmlResponse, unavailableSitemap, type SitemapKind } from '../../lib/server/sitemap';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const env = getWebEnvironment();
    if (env.APP_ENV !== 'production') return xmlResponse('sitemapindex', []);
    const groups = await Promise.all((['products', 'categories'] as SitemapKind[]).map(async kind => {
      const urls: string[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = await sitemapPage(kind, cursor);
        if (page.paths.length) urls.push(`${env.WEB_ORIGIN}/sitemaps/${kind}/${cursor ?? 'first'}.xml`);
        if (urls.length > 49999) throw new Error('Sitemap index capacity exceeded');
        cursor = page.nextCursor ?? undefined;
        if (cursor && seen.has(cursor)) throw new Error('Repeated sitemap cursor');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return urls;
    }));
    return xmlResponse('sitemapindex', [`${env.WEB_ORIGIN}/sitemaps/static/first.xml`, ...groups.flat()]);
  } catch { return unavailableSitemap(); }
}
