import type { MetadataRoute } from 'next';
import { getWebEnvironment } from '../lib/server/env';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const env = getWebEnvironment();
  if (env.APP_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } };
  // Crawlers may read other excluded HTML so they can see its noindex directive; robots disallow alone cannot prevent
  // URL-only indexing. Search results are the exception: each one runs a live search, so every crawler is asked to stay away.
  // No `Allow: /` line: a crawler that takes the first matching line would then ignore the exclusions below it.
  return { rules: { userAgent: '*', disallow: ['/api/', '/search'] }, sitemap: `${env.WEB_ORIGIN}/sitemap.xml` };
}
