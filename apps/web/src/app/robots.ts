import type { MetadataRoute } from 'next';
import { getWebEnvironment } from '../lib/server/env';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const env = getWebEnvironment();
  if (env.APP_ENV !== 'production') return { rules: { userAgent: '*', disallow: '/' } };
  // Allow crawling excluded HTML so crawlers can observe its noindex directive.
  // Robots disallow alone cannot prevent URL-only indexing.
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/_next/'] }, sitemap: `${env.WEB_ORIGIN}/sitemap.xml` };
}
