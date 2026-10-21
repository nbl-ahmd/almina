import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { readWebEnvironment } from '@almina/config/env';

// Validate at dev/build/start, but never inject the resulting env into next.config.env.
const environment = readWebEnvironment(process.env);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogApiOrigin = process.env.LEGACY_API_ORIGIN ?? process.env.API_ORIGIN ?? 'https://almina-of4b.onrender.com';
const catalogApiUrl = new URL(catalogApiOrigin);

const verificationTag = process.env.AL_MINA_VERIFICATION_TAG;
if (verificationTag && !/^[a-z0-9-]{1,40}$/.test(verificationTag)) throw new Error('Invalid verification build tag');

const config: NextConfig = {
  // Isolate visual verification/build output from a running developer session.
  distDir: process.env.ALMINA_LOCAL_DEMO === '1' ? '.next-demo' : process.env.AL_MINA_ISOLATED_DEV === '1' ? '.next-admin-dev' : process.env.AL_MINA_ISOLATED_BUILD === '1' ? (verificationTag ? `.next-verification-${verificationTag}` : '.next-verification') : '.next',
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  // Resolve metadata/404/redirect decisions before committing HTTP headers for every UA.
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: [
      ...(environment.CLOUDINARY_CLOUD_NAME ? [{ protocol: 'https' as const, hostname: 'res.cloudinary.com', pathname: `/${environment.CLOUDINARY_CLOUD_NAME}/image/upload/**`, search: '' }] : []),
      { protocol: 'https', hostname: 'cdn.alminapharmacy.com', pathname: '/cdn/**' },
      // Transitional read-only fallback for existing Drive-backed image routes.
      {
        protocol: catalogApiUrl.protocol === 'http:' ? 'http' : 'https',
        hostname: catalogApiUrl.hostname,
        ...(catalogApiUrl.port ? { port: catalogApiUrl.port } : {}),
        pathname: '/api/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ...(process.env.APP_ENV === 'production' || process.env.APP_ENV === 'staging' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] }, ...['/', '/products/:path*', '/categories/:path*', '/search', '/offers', '/cart', '/checkout', '/about', '/contact', '/map'].map(source => ({ source, headers: [
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
    ] }))];
  },
};

export default config;
