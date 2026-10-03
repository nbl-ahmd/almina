import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import shared from './packages/config/eslint.mjs';

export default defineConfig([
  globalIgnores(['**/node_modules/**', '**/.next/**', '**/.next-verification/**', '**/.next-admin-dev/**', '**/dist/**', '**/next-env.d.ts', 'frontend/**', 'backend/**']),
  ...shared,
  ...nextVitals.map((config) => ({ ...config, files: ['apps/web/**/*.{js,mjs,ts,tsx}', 'packages/ui/**/*.tsx'] })),
  { settings: { next: { rootDir: 'apps/web/' } } },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    settings: { next: { rootDir: 'apps/web/' } },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['mongodb', '**/apps/api/**', '@almina/config/env', '@almina/config/logger'],
          message: 'Use the guarded src/lib/server modules for server environment/logging. Database access belongs to apps/api.' }],
      }],
    },
  },
  { files: ['apps/web/src/lib/server/**/*.ts'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['apps/web/next.config.ts', 'apps/web/src/proxy.ts'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['**/*.mjs'], languageOptions: { globals: {
    console: 'readonly', process: 'readonly', URL: 'readonly', fetch: 'readonly', AbortSignal: 'readonly',
  } } },
]);
