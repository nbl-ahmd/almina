import assert from 'node:assert/strict';

// Read-only public endpoints only. Never run checkout, sign-in or fixture writes here.
const web = 'https://alminapharmacy.com';
const checks = [
  ['/', 'html'], ['/account', 'html'], ['/wholesale', 'html'],
  ['/robots.txt', 'text'], ['/sitemap.xml', 'xml'], ['/api/customer/options', 'options'],
];
await Promise.all(checks.map(async ([path, kind]) => {
  const response = await fetch(web + path, { signal: AbortSignal.timeout(60000), redirect: 'error' });
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
const response = await fetch('https://almina-of4b.onrender.com/health/ready', { signal: AbortSignal.timeout(60000) });
assert.equal(response.status, 200, 'API readiness');
assert.equal((await response.json()).status, 'ready', 'API readiness');
console.log('Production API readiness: OK');
