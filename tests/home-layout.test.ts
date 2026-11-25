import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultHomeLayout, growthPagePath, growthPageSchema, homeBuiltinKeys, homeLayoutSchema, legacyGrowthPageSchema, sectionLive, withTopSections } from '@almina/contracts';

const art = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
const base = { enabled: true, subtitle: '', background: 'none', viewAllHref: '', banner: null, startsAt: null, endsAt: null };

test('the default layout is today\'s homepage order, unpublished', () => {
  const layout = defaultHomeLayout('en');
  assert.equal(layout.published, false);
  assert.deepEqual(layout.sections.map(section => section.type === 'builtin' && section.key), [...homeBuiltinKeys]);
  assert.equal(homeLayoutSchema.safeParse(layout).success, true);
});

test('custom sections validate their content and links', () => {
  const layout = (sections: unknown[]) => homeLayoutSchema.safeParse({ locale: 'en', published: true, revision: 1, sections });
  assert.equal(layout([{ ...base, type: 'products', id: 'deals', title: 'Deals', source: { kind: 'offers' } }]).success, true);
  // Titles are required except for strips and carousels; every image needs a description; links stay on this site.
  assert.equal(layout([{ ...base, type: 'products', id: 'deals', title: '', source: { kind: 'offers' } }]).success, false);
  assert.equal(layout([{ ...base, type: 'strip', id: 's', title: '', strip: { image: art, alt: '', href: '/offers' } }]).success, false);
  assert.equal(layout([{ ...base, type: 'strip', id: 's', title: '', strip: { image: art, alt: 'Deals', href: 'https://evil.example/' } }]).success, false);
  assert.equal(layout([{ ...base, type: 'strip', id: 's', title: '', strip: { image: art, alt: 'Deals', href: '/offers' } }]).success, true);
  assert.equal(layout([{ ...base, type: 'images', id: 'i', title: 'Shop by need', tiles: [{ image: '', alt: 'x' }] }]).success, false);
  assert.equal(layout([{ ...base, type: 'categories', id: 'c', title: 'Cats', categoryIds: ['not-an-id'] }]).success, false);
  assert.equal(layout([{ ...base, type: 'products', id: 'p', title: 'Picks', source: { kind: 'selected', productIds: [] } }]).success, false);
  // Ids are unique and a built-in section appears once.
  assert.equal(layout([{ type: 'builtin', key: 'brands', id: 'brands' }, { type: 'builtin', key: 'brands', id: 'brands-2' }]).success, false);
  assert.equal(layout([{ ...base, type: 'products', id: 'x', title: 'A', source: { kind: 'offers' } }, { ...base, type: 'products', id: 'x', title: 'B', source: { kind: 'offers' } }]).success, false);
  // Sections never carry prices or stock: unknown fields are rejected.
  assert.equal(layout([{ ...base, type: 'products', id: 'p', title: 'Picks', source: { kind: 'offers' }, price: 10 }]).success, false);
});

test('schedules and the enabled switch decide what is live', () => {
  const now = Date.parse('2026-11-25T12:00:00Z');
  const section = homeLayoutSchema.parse({ locale: 'en', revision: 0, sections: [{ ...base, type: 'products', id: 'p', title: 'P', source: { kind: 'offers' } }] }).sections[0]!;
  assert.equal(sectionLive(section, now), true);
  assert.equal(sectionLive({ ...section, enabled: false }, now), false);
  assert.equal(sectionLive({ ...section, startsAt: '2026-11-26T00:00:00.000Z' } as typeof section, now), false);
  assert.equal(sectionLive({ ...section, endsAt: '2026-11-25T00:00:00.000Z' } as typeof section, now), false);
});

test('layouts saved before the carousel could move keep it at the top; a saved position wins', () => {
  const old = defaultHomeLayout('en').sections.filter(section => section.type === 'builtin' && !['promo', 'hero'].includes(section.key));
  assert.deepEqual(withTopSections(old).slice(0, 3).map(section => section.id), ['promo', 'hero', 'categories']);
  const moved = [old[0]!, { type: 'builtin' as const, key: 'hero' as const, id: 'hero', enabled: true }, ...old.slice(1)];
  assert.deepEqual(withTopSections(moved).slice(0, 3).map(section => section.id), ['promo', 'categories', 'hero']);
});

test('combined filters need at least one condition and a sensible price range', () => {
  const layout = (source: unknown) => homeLayoutSchema.safeParse({ locale: 'en', revision: 0, sections: [{ ...base, type: 'products', id: 'p', title: 'P', source }] }).success;
  assert.equal(layout({ kind: 'filtered', categoryId: 'aaaaaaaaaaaaaaaaaaaaaaaa', brand: 'CeraVe', maxPrice: 50, inStock: true, sort: 'price-asc' }), true);
  assert.equal(layout({ kind: 'filtered', sort: 'name' }), false);
  assert.equal(layout({ kind: 'filtered', minPrice: 60, maxPrice: 50 }), false);
  assert.equal(layout({ kind: 'filtered', inStock: true, filter: '{}' }), false);
});

test('a custom page holds homepage-style sections and publishes without body text', () => {
  const page = { kind: 'page', slug: 'summer', title: 'Summer care', description: 'Seasonal picks.', published: true,
    sections: [{ ...base, type: 'products', id: 'p', title: 'Picks', source: { kind: 'offers' } }] };
  assert.equal(growthPageSchema.safeParse(page).success, true);
  assert.equal(growthPagePath(growthPageSchema.parse(page)), '/pages/summer');
  assert.equal(growthPageSchema.safeParse({ ...page, sections: [] }).success, false);
  assert.equal(growthPageSchema.safeParse({ ...page, kind: 'guide' }).success, false);
  assert.equal(growthPageSchema.safeParse({ ...page, sections: [{ type: 'builtin', key: 'brands', id: 'brands' }] }).success, false);
  assert.ok(!('sections' in (legacyGrowthPageSchema.parse(page) as Record<string, unknown>)));
});
