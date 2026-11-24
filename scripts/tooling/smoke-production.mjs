import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { productionApiOrigin } from './production-vercel-config.mts';

// Read-only public endpoints only. Never run checkout, sign-in or fixture writes here.
const web = 'https://alminapharmacy.com';
const checks = [
  ['/', 'html'], ['/account', 'html'], ['/wholesale', 'html'],
  ['/robots.txt', 'text'], ['/sitemap.xml', 'xml'], ['/api/customer/options', 'options'],
];

// The Render API often redeploys from the same merge while this workflow publishes the frontend. Pages that read
// from it (the sitemap) answer 503 until it is back, so wait for API readiness first and give 5xx answers a short retry.
// Any other status, a 5xx that persists, or a malformed body still fails the deployment.
async function apiReady() {
  const deadline = Date.now() + 5 * 60_000;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL('/health/ready', productionApiOrigin), { signal: AbortSignal.timeout(60000), redirect: 'error' });
      const body = response.ok ? await response.json() : null;
      if (response.status === 200 && body?.status === 'ready') return;
      last = `HTTP ${response.status}`;
    } catch (error) { last = error instanceof Error ? error.name : 'request failed'; }
    await delay(15000);
  }
  assert.fail(`API readiness did not reach "ready" within 5 minutes (${last})`);
}

async function fetchStable(path) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(web + path, { signal: AbortSignal.timeout(60000), redirect: 'error' });
    if (response.status < 500 || attempt === 4) return response;
    console.log(`Production GET ${path}: ${response.status}, retrying (${attempt}/3)`);
    await delay(10000);
  }
}

await apiReady();
console.log('Production API readiness: OK');
await Promise.all(checks.map(async ([path, kind]) => {
  const response = await fetchStable(path);
  assert.equal(response.status, 200, path);
  const body = await response.text();
  if (kind === 'html') {
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.ok(body.includes('<html') && !body.includes('Application error: a server-side exception'), path);
  } else if (kind === 'options') {
    assert.equal(typeof JSON.parse(body).data?.emailEnabled, 'boolean', path);
  } else if (kind === 'xml') assert.match(body, /<sitemapindex\b|<urlset\b/);
  else assert.match(body, /User-Agent:/i);
  console.log(`Production GET ${path}: OK`);
}));
