import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Compatibility/rollback client only. Next.js remains the production target.
// Preserve the existing compiled fixture/hosting output path and strict CSP.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1' },
  build: { outDir: 'build', emptyOutDir: true, sourcemap: true, manifest: true, target: ['chrome109', 'firefox115', 'safari16.4'] },
});
