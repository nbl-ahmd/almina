import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../apps/web/src/app/globals.css', import.meta.url), 'utf8');
const frameStart = css.indexOf('/* Google Identity Services renders');
const frame = css.slice(frameStart);

function layerBlocks(source: string) {
  const blocks: Array<[number, number]> = [];
  for (let index = 0; index < source.length; index++) {
    if (!source.startsWith('@layer', index)) continue;
    const brace = source.indexOf('{', index), statement = source.indexOf(';', index);
    if (brace === -1 || (statement !== -1 && statement < brace)) continue;
    let depth = 0;
    for (let cursor = brace; cursor < source.length; cursor++) {
      if (source[cursor] === '{') depth++;
      if (source[cursor] === '}' && --depth === 0) { blocks.push([index, cursor]); break; }
    }
  }
  return blocks;
}

test('Google sign-in frame survives an unstyled or blocked Google stylesheet', () => {
  assert.ok(frameStart > 0, 'the Google sign-in frame must stay in the global stylesheet');
  // Google injects unlayered styles at runtime; layered declarations lose to them
  // regardless of specificity, which is what produced a full-width logo before.
  assert.equal(layerBlocks(css).some(([start, end]) => frameStart > start && frameStart < end), false, 'the frame must not be inside @layer');
  assert.match(frame, /\.google-signin \{ display: flex; width: 100%; min-height: 3rem; \}/);
  assert.match(frame, /\.google-signin svg \{ width: 18px; height: 18px; flex: none; \}/);
  assert.match(frame, /\.google-signin div\[role="button"\] \{/, 'the frame selector must outrank Google’s two-class rules');
  assert.match(frame, /\.google-signin \.L6cTce \{[^}]*clip: rect\(0,0,0,0\)/, 'the duplicate accessible label must stay visually hidden');
  assert.equal(frame.includes('!important'), false, 'the frame must not rely on !important');
});

test('the sign-in surface offers one honest message per unavailable provider', () => {
  const signIn = readFileSync(new URL('../apps/web/src/components/customer-sign-in.tsx', import.meta.url), 'utf8');
  assert.match(signIn, /Google sign-in could not load\./);
  assert.match(signIn, /options\.emailEnabled \? a\("Continue with an email code below\."\)/);
  // A Google failure replaces the "email is unavailable" note instead of stacking
  // two notes that both send the customer back to the provider that just failed.
  assert.match(signIn, /options && !\(options\.googleClientId && googleFailed\)/);
  assert.match(signIn, /googleFailed\s*\n\s*\? <p role="status"/);
});
