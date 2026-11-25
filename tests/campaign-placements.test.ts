import test from 'node:test';
import assert from 'node:assert/strict';
import { growthPageSchema, legacyGrowthPageSchema } from '@almina/contracts';

const base = { kind: 'campaign', slug: 'summer-care', title: 'Summer care', description: 'Sun care for the season.', body: 'Original campaign copy.',
  image: 'https://cdn.alminapharmacy.com/cdn/summer.webp', imageAlt: 'Sun care products on sand', terms: 'While stocks last.', published: true };

test('campaigns saved before banner placements keep today\'s behaviour', () => {
  const page = growthPageSchema.parse({ ...base, homepagePlacement: 'hero', ctaLabel: 'Shop sun care' });
  assert.equal(page.heroLayout, 'image');
  assert.equal(page.textTone, 'dark');
  assert.equal(page.ctaHref, '');
  assert.equal(page.stripSlot, 'home-middle');
  const legacy = legacyGrowthPageSchema.parse(page) as Record<string, unknown>;
  for (const field of ['heroLayout', 'textTone', 'ctaHref', 'stripSlot', 'homepagePlacement']) assert.ok(!(field in legacy), field);
});

test('publish rules follow the placement', () => {
  // A finished hero image needs no button text; an overlay hero does.
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'hero', heroLayout: 'image' }).success, true);
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'hero', heroLayout: 'overlay' }).success, false);
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'hero', heroLayout: 'overlay', ctaLabel: 'Shop now' }).success, true);
  // Strips are artwork with alt text and terms.
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'strip', stripSlot: 'listing' }).success, true);
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'strip', terms: '' }).success, false);
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'strip', imageAlt: '' }).success, false);
  // A popup can be text only, but artwork must be described.
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'popup', image: '', imageAlt: '', terms: '' }).success, true);
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'popup', imageAlt: '' }).success, false);
  assert.equal(growthPageSchema.safeParse({ ...base, homepagePlacement: 'popup', image: '', description: '' }).success, false);
  // Placements stay campaign-only.
  assert.equal(growthPageSchema.safeParse({ ...base, kind: 'guide', homepagePlacement: 'strip' }).success, false);
});

test('button links stay on this site', () => {
  assert.equal(growthPageSchema.safeParse({ ...base, ctaHref: '/categories/skin-care' }).success, true);
  for (const href of ['https://example.com/', '//example.com', '/admin/orders', '/api/v1/growth']) assert.equal(growthPageSchema.safeParse({ ...base, ctaHref: href }).success, false, href);
});
