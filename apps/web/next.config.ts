import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { readWebEnvironment } from '@almina/config/env';

// Validate at dev/build/start, but never inject the resulting env into next.config.env.
readWebEnvironment(process.env);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalogApiOrigin = process.env.LEGACY_API_ORIGIN ?? process.env.API_ORIGIN ?? 'https://almina-of4b.onrender.com';
const catalogApiUrl = new URL(catalogApiOrigin);

const config: NextConfig = {
  // Isolate visual verification/build output from a running developer session.
  distDir: process.env.AL_MINA_ISOLATED_BUILD === '1' ? '.next-verification' : '.next',
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  // Resolve metadata/404/redirect decisions before committing HTTP headers for every UA.
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: [
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
    ] }];
  },
};

export default config;
