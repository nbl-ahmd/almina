import type { MetadataRoute } from 'next';
import { getWebEnvironment } from '../lib/server/env';
export const dynamic = 'force-dynamic';
// AI-training, SEO-tool and index crawlers that made almost every request for the search page on 23–26 November 2026. Each one
// ran a live search. Search engines are not named, so nothing changes for them.
const searchPageCrawlers = ['GPTBot', 'ClaudeBot', 'Bytespider', 'MJ12bot', 'SERankingBacklinksBot', 'EDPCompanyIndex'];
export default function robots(): MetadataRoute.Robots {
  const env = getWebEnvironment();
  if (env.APP_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } };
  // Allow crawling excluded HTML so crawlers can observe its noindex directive.
  // Robots disallow alone cannot prevent URL-only indexing.
  // A crawler with its own group ignores the `*` group, so the shared exclusion is repeated there. No `Allow: /` in that group:
  // a crawler that takes the first matching line would then ignore the exclusions below it.
  return { rules: [
    { userAgent: '*', allow: '/', disallow: ['/api/'] },
    { userAgent: searchPageCrawlers, disallow: ['/api/', '/search'] },
  ], sitemap: `${env.WEB_ORIGIN}/sitemap.xml` };
}
