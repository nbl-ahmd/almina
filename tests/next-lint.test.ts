import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { ESLint } from 'eslint';

const require = createRequire(import.meta.url);
test('Next lint root discovery uses the maintained glob replacement and preserves directory filtering', () => {
  const plugin = createRequire(require.resolve('@next/eslint-plugin-next'));
  const { getRootDirs } = plugin('./utils/get-root-dirs.js');
  assert.equal(plugin('fast-glob/package.json').name, '@almina/next-glob');
  const context = { cwd: process.cwd(), settings: { next: { rootDir: 'apps/*' } } };
  assert.deepEqual(getRootDirs(context).map((value: string) => value.replace(/\/$/, '')).sort(), ['apps/api', 'apps/web']);
  assert.deepEqual(getRootDirs({ ...context, settings: { next: { rootDir: 'apps/web' } } }).map((value: string) => value.replace(/\/$/, '')), ['apps/web']);
});
test('Next security and navigation lint rules remain enabled and detect violations', async () => {
  const lint = new ESLint();
  const result = await lint.lintText('export default function Probe(){return <><img src="/image.png" alt="Probe" /><script src="/unsafe.js" /></>}',
    { filePath: 'apps/web/src/app/lint-probe.tsx' });
  const rules = result[0]!.messages.map(message => message.ruleId);
  assert.ok(rules.includes('@next/next/no-img-element'));
  assert.ok(rules.includes('@next/next/no-sync-scripts'));
});
