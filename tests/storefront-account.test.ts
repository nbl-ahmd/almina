import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { artworkShapeWarning, bannerPhoneMaxWidth, heroArtwork, stripArtwork } from '../apps/web/src/lib/storefront/artwork';
import { campaignFrames } from '../apps/web/src/lib/storefront/campaign-frames';
import { shareTargets, whatsappLink } from '../apps/web/src/lib/storefront/contact';
import { canReorder, canReview, filterOrders, orderState, orderSteps, type AccountOrder } from '../apps/web/src/lib/account/orders';
import { signInPath } from '../apps/web/src/lib/account/signin-path';
import { brandDirectory, brandPageState, brandProblem, newBrandPage } from '../apps/web/src/lib/admin/brand-directory';
import { canVisit, sections } from '../apps/web/src/lib/admin/policy';
import { accountText } from '../apps/web/src/lib/account/copy';

const source = (path: string) => readFileSync(new URL('../apps/web/src/' + path, import.meta.url), 'utf8');
const order = (value: Partial<AccountOrder>): AccountOrder => ({ orderId: 'OD1', status: 'pending', createdAt: '2026-11-20T08:00:00.000Z',
  totals: { totalMinor: 1000, lines: [{ productId: 'b'.repeat(24), name: 'CeraVe Moisturising Cream', quantity: 1 }] }, ...value });

test('banner frames follow the screen width, and image sources switch at the same breakpoint as the frames', () => {
  assert.equal(heroArtwork.desktop.width / heroArtwork.desktop.height, 16 / 5);
  assert.equal(heroArtwork.mobile.width / heroArtwork.mobile.height, 2);
  const css = source('app/(storefront)/storefront-system.css');
  assert.ok(css.includes(`@media (min-width: ${bannerPhoneMaxWidth + 1}px) {\n  @scope (.storefront-shell) {\n    .qc-hero { aspect-ratio: 16 / 5; }`));
  for (const file of ['components/hero-banner.tsx', 'components/home-sections.tsx', 'components/homepage.tsx']) assert.ok(!source(file).includes('<source media="(max-width: 767px)"'), file);
});

test('the upload warning appears only when a file’s shape differs from its frame', () => {
  assert.equal(artworkShapeWarning({ width: 1600, height: 500 }, heroArtwork.desktop), null);
  assert.equal(artworkShapeWarning({ width: 1920, height: 600 }, heroArtwork.desktop), null);
  // The live banner that showed grey bands: 8:3 art in a 16:5 and a 2:1 frame.
  assert.match(artworkShapeWarning({ width: 2048, height: 768 }, heroArtwork.desktop)!, /2048 × 768.*1600 × 500.*at the sides/);
  assert.match(artworkShapeWarning({ width: 2048, height: 768 }, heroArtwork.mobile)!, /above and below/);
  assert.equal(artworkShapeWarning({ width: 0, height: 0 }, heroArtwork.desktop), null);
  assert.equal(campaignFrames({ homepagePlacement: 'hero', stripSlot: 'home-middle' }), heroArtwork);
  assert.equal(campaignFrames({ homepagePlacement: 'strip', stripSlot: 'home-middle' }), stripArtwork);
  assert.equal(campaignFrames({ homepagePlacement: 'popup', stripSlot: 'home-middle' }), null);
});

test('WhatsApp uses the verified pharmacy number, otherwise the published one', () => {
  assert.match(whatsappLink(null, 'Hi'), /^https:\/\/wa\.me\/971504825007\?text=Hi$/);
  assert.match(whatsappLink({ verified: false, whatsapp: '971500000000' }, 'Hi'), /wa\.me\/971504825007/);
  assert.match(whatsappLink({ verified: true, whatsapp: '971500000000' }, 'Hi'), /wa\.me\/971500000000/);
  assert.match(whatsappLink({ verified: true, whatsapp: '' }, 'Hi'), /wa\.me\/971504825007/);
});

test('shared products carry only their name and canonical address', () => {
  const targets = shareTargets('Cream & Lotion 50 ml', 'https://shop.invalid/products/cream--PD1');
  assert.equal(new URL(targets.whatsapp).searchParams.get('text'), 'Cream & Lotion 50 ml\nhttps://shop.invalid/products/cream--PD1');
  assert.ok(targets.email.startsWith('mailto:?subject=Cream%20%26%20Lotion%2050%20ml&body=https'));
});

test('order search and filters cover progress, order number and product name', () => {
  const orders = [order({ orderId: 'OD1' }), order({ orderId: 'OD2', status: 'dispatched' }), order({ orderId: 'OD3', status: 'cancelled' })];
  assert.deepEqual(filterOrders(orders, 'active', '').map(row => row.orderId), ['OD1']);
  assert.deepEqual(filterOrders(orders, 'dispatched', '').map(row => row.orderId), ['OD2']);
  assert.deepEqual(filterOrders(orders, 'cancelled', '').map(row => row.orderId), ['OD3']);
  assert.equal(filterOrders(orders, 'all', 'cerave').length, 3);
  assert.deepEqual(filterOrders(orders, 'all', 'od2').map(row => row.orderId), ['OD2']);
  assert.equal(filterOrders(orders, 'all', 'absent').length, 0);
});

test('order progress shows recorded times only and never claims delivery', () => {
  const steps = orderSteps(order({ status: 'packed', timeline: [{ status: 'pending', at: '2026-11-20T08:00:00.000Z' }, { status: 'confirmed', at: '2026-11-20T09:00:00.000Z' }, { status: 'packed', at: '2026-11-20T10:00:00.000Z' }] }));
  assert.deepEqual(steps.map(step => step.state), ['done', 'done', 'current', 'upcoming']);
  assert.equal(steps[3]!.at, undefined);
  // Orders without history still show where they are, with only the order time.
  const older = orderSteps(order({ status: 'dispatched' }));
  assert.deepEqual(older.map(step => [step.state, Boolean(step.at)]), [['done', true], ['done', false], ['done', false], ['done', false]]);
  const cancelled = orderSteps(order({ status: 'cancelled', timeline: [{ status: 'confirmed', at: '2026-11-20T09:00:00.000Z' }, { status: 'cancelled', at: '2026-11-20T09:30:00.000Z' }] }));
  assert.deepEqual(cancelled.map(step => [step.status, step.state]), [['pending', 'done'], ['confirmed', 'done'], ['cancelled', 'stopped']]);
  assert.equal(orderState(order({ paymentState: 'awaiting_payment' })).label, 'Awaiting payment');
  assert.equal(orderState(order({ status: 'cancelled', paymentState: 'expired' })).label, 'Payment expired');
  for (const status of ['pending', 'confirmed', 'packed', 'dispatched', 'cancelled', 'refunded', 'legacy_conflict']) {
    const state = orderState(order({ status }));
    assert.doesNotMatch(state.label + state.note, /delivered|arriv/i);
    for (const text of [state.label, state.note]) assert.notEqual(accountText('ar', text), text, text);
  }
});

test('rating and reordering are offered only where the API accepts them', () => {
  assert.deepEqual(['pending', 'confirmed', 'packed', 'dispatched', 'cancelled', 'refunded'].filter(status => canReview(order({ status }))), ['confirmed', 'packed', 'dispatched']);
  assert.equal(canReview(order({ status: 'dispatched', channel: 'wholesale' })), false);
  assert.equal(canReorder(order({ status: 'refunded' })), false);
  assert.equal(canReorder(order({ status: 'pending' })), true);
});

test('only the sign-in screens receive Google sign-in security headers', () => {
  for (const path of ['/account', '/account/orders', '/account/orders/OD5050', '/wholesale']) assert.ok(signInPath.test(path), path);
  for (const path of ['/', '/checkout', '/accounts', '/account/orders/a/b', '/account/other']) assert.ok(!signInPath.test(path), path);
});

test('the brand directory joins product brands with brand pages in both languages', () => {
  const english = { ...newBrandPage('CeraVe'), published: true, revision: 1 };
  const arabic = { ...newBrandPage('سيرافي', 'ar', 'cerave'), revision: 1 };
  const added = { ...newBrandPage('Synthetic Labs'), revision: 1 };
  const rows = brandDirectory(['CeraVe', 'cerave', 'Bioderma'], [arabic, english, added]);
  assert.deepEqual(rows.map(row => [row.name, row.slug, row.onProducts]), [['Bioderma', 'bioderma', true], ['CeraVe', 'cerave', true], ['Synthetic Labs', 'synthetic-labs', false]]);
  assert.equal(brandPageState(rows[0]!, 'en'), 'automatic');
  assert.equal(brandPageState(rows[0]!, 'ar'), 'none');
  assert.equal(brandPageState(rows[1]!, 'en'), 'published');
  assert.equal(brandPageState(rows[1]!, 'ar'), 'draft');
  assert.equal(brandPageState(rows[2]!, 'en'), 'draft');
});

test('a new brand starts as a publishable draft and explains what is missing', () => {
  const page = newBrandPage('Dolce & Gabbana');
  assert.equal(page.slug, 'dolce-gabbana'); assert.equal(page.published, false); assert.equal(page.kind, 'brand');
  assert.equal(brandProblem({ ...page, published: true }), null);
  assert.match(brandProblem({ ...page, title: 'A' })!, /brand name/);
  // Short, very long and non-Latin names open in the editor instead of failing, and say why they cannot be saved.
  assert.match(brandProblem(newBrandPage('3M'))!, /at least 3 characters/);
  assert.equal(brandProblem(newBrandPage('Very Long Brand '.repeat(20))), null);
  assert.match(brandProblem(newBrandPage('عناية'))!, /web address/);
  assert.match(brandProblem({ ...page, published: true, body: '' })!, /page text/);
  assert.match(brandProblem({ ...page, slug: '' })!, /web address/);
});

test('only administrators open the Brands section', () => {
  assert.ok((sections as readonly string[]).includes('brands'));
  assert.equal(canVisit('admin', 'brands'), true);
  assert.equal(canVisit('user', 'brands'), false);
  assert.equal(canVisit('user', 'brands', 'branch'), false);
});
