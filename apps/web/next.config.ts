import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import { readWebEnvironment } from '@almina/config/env';

// Validate at dev/build/start, but never inject the resulting env into next.config.env.
readWebEnvironment(process.env);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const config: NextConfig = {
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
};

export default config;
