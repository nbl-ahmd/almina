import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  banner: { js: "import { createRequire as createSecurityRequire } from 'node:module'; const require = createSecurityRequire(import.meta.url);" },
  external: ['express', 'mongodb', 'zod', 'helmet', 'express-rate-limit', 'bcryptjs'],
  sourcemap: false,
});
