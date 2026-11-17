import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// @ts-expect-error Local install/audit tooling is JavaScript.
import { advisory, unresolvedFindings, verifyPicomatch } from '../scripts/tooling/picomatch-security.mjs';

const require = createRequire(import.meta.url);

test('pinned mitigation is idempotent, verified, and expires for upstream review', async () => {
  await verifyPicomatch({ apply: true });
  await verifyPicomatch();
  await assert.rejects(verifyPicomatch({ now: Date.parse('2026-12-17T00:00:00Z') }), /expired/);
});

test('single-branch wildcard extglobs cannot generate backtracking expressions', () => {
  // Run matching out of process: an accidental regression is killed, not hung.
  execFileSync(process.execPath, ['--input-type=commonjs', '-e', `
    const assert = require('node:assert/strict');
    const pm = require('picomatch');
    for (const body of ['*', '*a', 'a*', '?*a', '*|x', '**a', '*(a)', '*[ab]']) {
      for (const type of ['+', '*']) {
        const pattern = type + '(' + body + ')';
        assert.equal(pm.isMatch('a'.repeat(200) + '!', pattern), false);
        assert.equal(pm.isMatch('a'.repeat(200) + '!', pattern, {maxExtglobRecursion: false}), false);
        assert.equal(pm.isMatch(pattern, pattern), true);
      }
    }
  `], { timeout: 3000, stdio: 'pipe' });
});

test('normal catalogue tooling globs and literal extglobs retain matching', () => {
  const pm = require('picomatch');
  assert.equal(pm.isMatch('apps/web/src/app/page.tsx', '**/*.{ts,tsx}'), true);
  assert.equal(pm.isMatch('page.js', '*.{ts,tsx}'), false);
  assert.equal(pm.isMatch('foo.ts', '@(foo|bar).ts'), true);
  assert.equal(pm.isMatch('abab', '+(ab)'), true);
  assert.equal(pm.isMatch('apps/web/src/app/page.tsx', '**/*.tsx', { ignore: '**/node_modules/**' }), true);
});

test('audit accepts only the verified advisory and findings derived exclusively from it', () => {
  const known = {
    picomatch: { severity: 'high', nodes: ['node_modules/picomatch'], via: [{ url: advisory }] },
    tinyglobby: { severity: 'high', via: ['picomatch'] },
    resolver: { severity: 'high', via: ['tinyglobby'] },
  };
  assert.equal(unresolvedFindings(known, false).length, 3);
  assert.deepEqual(unresolvedFindings(known, true), []);
  assert.deepEqual(unresolvedFindings({ ...known, resolver: { severity: 'high', via: ['tinyglobby', 'minor'] }, minor: { severity: 'moderate', via: [{ severity: 'moderate', url: 'minor' }] } }, true), []);
  const newAdvisory = { url: 'https://github.com/advisories/GHSA-other' };
  assert.equal(unresolvedFindings({ ...known, picomatch: { ...known.picomatch, via: [newAdvisory] } }, true).length, 3);
  assert.equal(unresolvedFindings({ ...known, picomatch: { ...known.picomatch, via: [{ url: advisory }, newAdvisory] } }, true).length, 3);
  assert.equal(unresolvedFindings({ ...known, picomatch: { ...known.picomatch, nodes: ['node_modules/other/node_modules/picomatch'] } }, true).length, 3);
  assert.equal(unresolvedFindings({ ...known, resolver: { severity: 'critical', via: ['tinyglobby', newAdvisory] } }, true).length, 1);
  assert.equal(unresolvedFindings({ ...known, other: { severity: 'high', via: [newAdvisory] } }, true).length, 1);
});


test('audit verification rejects missing/tampered patches and unknown dependency layouts', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'almina-picomatch-'));
  const script = resolve('scripts/tooling/picomatch-security.mjs');
  try {
    await mkdir(join(cwd, 'node_modules/picomatch/lib'), { recursive: true });
    const metadata = { version: '4.0.7' };
    const lock = { packages: { 'node_modules/picomatch': metadata } };
    await writeFile(join(cwd, 'package-lock.json'), JSON.stringify(lock));
    await writeFile(join(cwd, 'node_modules/picomatch/package.json'), JSON.stringify(metadata));
    const source = await readFile('node_modules/picomatch/lib/parse.js', 'utf8');
    const entry = join(cwd, 'node_modules/picomatch/lib/parse.js');
    await writeFile(entry, source);
    execFileSync(process.execPath, [script, '--verify'], { cwd, stdio: 'pipe' });
    await writeFile(entry, source + '// tampered');
    assert.throws(() => execFileSync(process.execPath, [script, '--verify'], { cwd, stdio: 'pipe' }), /absent or modified/);
    await writeFile(entry, source);
    await writeFile(join(cwd, 'package-lock.json'), JSON.stringify({ packages: {} }));
    assert.throws(() => execFileSync(process.execPath, [script, '--verify'], { cwd, stdio: 'pipe' }), /layout changed/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
