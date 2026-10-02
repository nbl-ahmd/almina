// Synthetic UI fixture only; no database client, startup module, credentials or providers.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { checkoutInputSchema, quoteInputSchema } from '@almina/contracts';
import { calculateQuote } from '../../apps/api/src/modules/orders/commerce.js';
import { approvedPolicy } from '../migrations/commerce.js';
const require = createRequire(import.meta.url);
const express = require('../../backend/node_modules/express');
const { createLegacyApp } = require('../../backend/app.js');
const origin = 'http://127.0.0.1:4501';
const product = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', product_id: 'PD0001', category: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Synthetic care product', barcode: '123', price: 25, sale: true, salePrice: 20, stock: 4, vat: true, images: [] };
const routers: Record<string, ReturnType<typeof express.Router>> = {};
for (const resource of ['category', 'banners', 'products', 'orders', 'store', 'auth', 'batch', 'whatsapp']) routers[resource] = express.Router();
routers.store.get('/status', (_req: unknown, res: { json: (body: unknown) => void }) => res.json({ status: 'open' }));
routers.products.get('/:id', (_req: unknown, res: { json: (body: unknown) => void }) => res.json(product));
routers.products.get('/', (_req: unknown, res: { json: (body: unknown) => void }) => res.json([product]));
routers.category.get('/', (_req: unknown, res: { json: (body: unknown) => void }) => res.json([]));
routers.banners.get('/', (_req: unknown, res: { json: (body: unknown) => void }) => res.json([]));
routers.auth.get('/me', (_req: unknown, res: { status: (n: number) => { json: (body: unknown) => void } }) => res.status(401).json({ error: 'Anonymous fixture' }));
const attempts = new Map();
let lastIntent: unknown;
let delayNext = false;
routers.orders.post('/quote', (req: { body: unknown }, res: { json: (body: unknown) => void }) => res.json(calculateQuote(quoteInputSchema.parse(req.body), [product], approvedPolicy)));
routers.orders.post('/', async (req: { body: unknown }, res: { json: (body: unknown) => void; status: (n: number) => unknown }) => {
  const input = checkoutInputSchema.parse(req.body); lastIntent = input;
  let order = attempts.get(input.idempotencyKey);
  const replayed = !!order;
  if (!order) { order = { id: 'cccccccccccccccccccccccc', orderId: `OD${5001 + attempts.size}`, status: 'pending',
    totals: calculateQuote(input, [product], approvedPolicy) }; attempts.set(input.idempotencyKey, order); }
  if (delayNext) { delayNext = false; await new Promise(resolve => setTimeout(resolve, 15000)); }
  res.status(replayed ? 200 : 201); res.json({ ...order, replayed });
});
const app = createLegacyApp({ origins: [origin], development: true, routers });
const terminal = app._router.stack.splice(-2);
const html = readFileSync('frontend/build/index.html', 'utf8');
const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1];
if (!csp) throw new Error('Build the legacy frontend first');
app.use((_req: unknown, res: { set: (key: string, value: string) => void }, next: () => void) => {
  res.set('Content-Security-Policy', csp.replaceAll('&#x27;', "'").replaceAll('&apos;', "'") + "; frame-ancestors 'none'"); next();
});
app.get('/__fixture/health', (_req: unknown, res: { send: (body: unknown) => void }) => res.send('almina-synthetic-commerce'));
app.get('/__fixture/orders', (_req: unknown, res: { json: (body: unknown) => void }) => res.json({ count: attempts.size, lastIntent }));
app.post('/__fixture/delay', (_req: unknown, res: { end: () => void }) => { delayNext = true; res.end(); });
app.use(express.static(path.resolve('frontend/build')));
app.get('*', (_req: unknown, res: { sendFile: (file: string) => void }) => res.sendFile(path.resolve('frontend/build/index.html')));
app._router.stack.push(...terminal);
createServer(app).listen(4501, '127.0.0.1', () => console.log('Synthetic commerce UI fixture on loopback port 4501'));
