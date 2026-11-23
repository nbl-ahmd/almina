const express = require('express');
const Orderrouter = express.Router();
const { createCommerceService } = require('../commerce/dist/service.cjs');
const commerceFor = req => createCommerceService(req.app.locals.getCommerceDb, req.app.locals.stripePayments);

const wrapAlert = handler => require('../security/boundary.cjs').wrap(async(req,res)=>{if(Object.keys(req.query).length&&req.method!=='GET')throw require('../security/boundary.cjs').fail(400,'INVALID_REQUEST');const domain=require('../commerce/dist/service.cjs');res.json(await handler(domain,await req.app.locals.getCommerceDb(),req));});
Orderrouter.get('/notifications',wrapAlert((domain,db,req)=>domain.notificationFeed(db,req.query,req.identity.id)));
Orderrouter.post('/notifications/read',wrapAlert((domain,db,req)=>domain.markNotifications(db,req.body,req.identity.id)));
Orderrouter.get('/notifications/preferences',wrapAlert((domain,db,req)=>{if(Object.keys(req.query).length)throw require('../security/boundary.cjs').fail(400,'INVALID_REQUEST');return domain.alertPreferences(db,req.identity.id);}));
Orderrouter.put('/notifications/preferences',wrapAlert((domain,db,req)=>domain.saveAlertPreferences(db,req.body,req.identity.id)));
Orderrouter.post('/notifications/test',wrapAlert((domain,db,req)=>domain.testStaffNotification(db,req.body,req.identity.id)));
Orderrouter.get('/notifications/rules',wrapAlert(async(domain,db,req)=>{if(Object.keys(req.query).length)throw require('../security/boundary.cjs').fail(400,'INVALID_REQUEST');await domain.administrator(db,req.identity.id);return domain.alertRules(db);}));
Orderrouter.put('/notifications/rules',wrapAlert((domain,db,req)=>domain.saveAlertRules(db,req.body,req.identity.id)));

Orderrouter.get('/notification-settings', require('../security/boundary.cjs').wrap(async (req,res) => {
  if(Object.keys(req.query).length)return res.status(400).json({code:'INVALID_REQUEST'});
  const domain=require('../commerce/dist/service.cjs');
  res.json({...domain.staffNotificationSettings(process.env),registeredDeviceIds:await domain.staffDeviceFingerprints(await req.app.locals.getCommerceDb(),req.identity.id)});
}));

// Push subscriptions belong to the authenticated staff member, never to a caller-supplied user.
Orderrouter.post('/subscribe', require('../security/boundary.cjs').wrap(async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.staffSubscriptionInput(req.body, req.query);
  await domain.registerStaffSubscription(await req.app.locals.getCommerceDb(), req.body, req.identity.id, req.query);
  res.status(204).end();
}));

Orderrouter.delete('/subscribe', require('../security/boundary.cjs').wrap(async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.staffUnsubscriptionInput(req.body, req.query);
  await domain.removeStaffSubscription(await req.app.locals.getCommerceDb(), req.body, req.identity.id, req.query);
  res.status(204).end();
}));

// Strict intent-only contract: old tabs supplying prices/totals must refresh.
Orderrouter.post('/quote', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid request' });
  res.json(await commerceFor(req).quote(req.body));
});
Orderrouter.post('/', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid request' });
  const result = await commerceFor(req).checkout(req.body);
  res.status(result.replayed ? 200 : 201).json(result);
  if (!result.replayed) {
    // Domain records a durable notification job in the same commit; providers never run inside it.
    req.app.locals.io?.emit('newOrder', { _id: result.id, orderId: result.orderId });
  }
});

Orderrouter.post('/email', require('../security/boundary.cjs').wrap(async (req, res) => {
  if (Object.keys(req.query).length) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  await require('../integrations/order-email.cjs').sendAdministrativeEmail(req.body);
  res.status(204).end();
}));

Orderrouter.get('/', async (req, res) => {
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').retainedOrderList(db, req.query, req.identity));
});
// Staff order-change stream. A change stream on the API process feeds a data-free "orders changed" message; each browser then
// refetches through its own authorised reads. Idle cost is one heartbeat line per connection. The browser reconnects with Last-Event-ID,
// so a resumed connection that missed nothing causes no database work at all.
Orderrouter.get('/events', (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
  const domain = require('../commerce/dist/service.cjs');
  const feed = (req.app.locals.orderLive ??= domain.createOrderLiveFeed({ getDb: () => req.app.locals.getCommerceDb() }));
  const write = chunk => { try { res.write(chunk); } catch { /* The client already left. */ } };
  const unsubscribe = feed.subscribe(revision => write(`id: ${revision}\nevent: orders\ndata: {}\n\n`), req.identity.id);
  if (!unsubscribe) return res.status(429).set('Retry-After', '30').json({ error: 'TOO_MANY_STREAMS' });
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-store, no-transform', 'X-Accel-Buffering': 'no', 'X-Robots-Tag': 'noindex, nofollow' });
  res.flushHeaders?.();
  const current = feed.revision();
  // A browser that reconnects with the current revision missed nothing and refetches nothing.
  write(`retry: 1000\nid: ${current}\nevent: ${req.get('last-event-id') === current ? 'ready' : 'orders'}\ndata: {}\n\n`);
  const heartbeat = setInterval(() => write(': keep-alive\n\n'), 25000);
  const stop = () => { clearInterval(heartbeat); unsubscribe(); };
  req.on('close', stop); res.on('close', stop); res.on('error', stop);
});
// Direct live stream. The staff session cookie belongs to the web origin, so the web gateway mints a one-time ticket for the signed-in
// user and the browser opens this stream on the API itself (no 25 s hosting-limit relay). The stream carries no order data and ends after
// a fixed lifetime, which makes the browser fetch a new ticket and so re-checks access.
Orderrouter.post('/events/ticket', async (req, res) => {
  if (Object.keys(req.query).length || Object.keys(req.body ?? {}).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
  const domain = require('../commerce/dist/service.cjs');
  res.json(await domain.issueStreamTicket(await req.app.locals.getCommerceDb(), req.identity.id));
});
Orderrouter.get('/events/stream', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
  const domain = require('../commerce/dist/service.cjs');
  const userId = await domain.consumeStreamTicket(await req.app.locals.getCommerceDb(), req.get('x-stream-ticket'));
  if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });
  const feed = (req.app.locals.orderLive ??= domain.createOrderLiveFeed({ getDb: () => req.app.locals.getCommerceDb() }));
  const write = chunk => { try { res.write(chunk); } catch { /* The client already left. */ } };
  const unsubscribe = feed.subscribe(revision => write(`id: ${revision}\nevent: orders\ndata: {}\n\n`), userId);
  if (!unsubscribe) return res.status(429).set('Retry-After', '30').json({ error: 'TOO_MANY_STREAMS' });
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'private, no-store, no-transform', 'X-Accel-Buffering': 'no', 'X-Robots-Tag': 'noindex, nofollow' });
  res.flushHeaders?.();
  const current = feed.revision();
  write(`retry: 1000\nid: ${current}\nevent: ${req.get('last-event-id') === current ? 'ready' : 'orders'}\ndata: {}\n\n`);
  const heartbeat = setInterval(() => write(': keep-alive\n\n'), 25000);
  const lifetime = setTimeout(() => res.end(), domain.STREAM_MAX_LIFETIME_MS);
  const stop = () => { clearInterval(heartbeat); clearTimeout(lifetime); unsubscribe(); };
  req.on('close', stop); res.on('close', stop); res.on('error', stop);
});
Orderrouter.get('/receiving', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
  res.json(await require('../commerce/dist/service.cjs').orderReceiving(await req.app.locals.getCommerceDb(), req.identity));
});
for (const [action, status] of [['confirm', 'confirmed'], ['pack', 'packed']]) {
  Orderrouter.post(`/:id/${action}`, async (req, res) => {
    if (Object.keys(req.query).length || Object.keys(req.body ?? {}).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
    res.json(await commerceFor(req).transition(req.params.id, { status }, req.identity));
  });
}
Orderrouter.put('/:id/branch', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
  res.json(await require('../commerce/dist/service.cjs').reassignDelivery(await req.app.locals.getCommerceDb(), req.params.id, req.body, req.identity.id));
});
Orderrouter.put('/:id/routing', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'INVALID_REQUEST' });
  res.json(await require('../commerce/dist/service.cjs').repairOrderArea(await req.app.locals.getCommerceDb(), req.params.id, req.body, req.identity.id));
});
Orderrouter.get('/:id', async (req, res) => {
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').retainedOrderDetail(db, req.params.id, req.query, req.identity));
});

// Legacy URL adapters accept lifecycle/billing commands only. Commercial snapshots cannot be edited.
Orderrouter.put('/edit/:orderId', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid request' });
  if (!req.body || Object.keys(req.body).some(key => !['status', 'billno', 'billamount', 'dispatched', 'canceled'].includes(key))) {
    return res.status(400).json({ error: 'Order commercial fields are immutable' });
  }
  if ((req.body.dispatched && req.body.canceled) || (req.body.status && (req.body.dispatched !== undefined || req.body.canceled !== undefined))) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const status = req.body.status ?? (req.body.canceled === true ? 'cancelled' : req.body.dispatched === true ? 'dispatched' : undefined);
  const input = { status, ...(req.body.billno !== undefined ? { billno: req.body.billno } : {}),
    ...(req.body.billamount !== undefined ? { billamount: req.body.billamount } : {}) };
  const result = await commerceFor(req).transition(req.params.orderId, input, req.identity, !req.body.status);
  res.json(result);
});
Orderrouter.put('/:orderId', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid request' });
  if (!req.body || Object.keys(req.body).some(key => !['dispatched', 'billno', 'billamount'].includes(key))
    || (req.body.dispatched !== undefined && req.body.dispatched !== true)) return res.status(400).json({ error: 'Invalid request' });
  res.json(await commerceFor(req).transition(req.params.orderId, { status: 'dispatched', billno: req.body.billno, billamount: req.body.billamount }, req.identity, true));
});
Orderrouter.put('/cancel/:orderId', async (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'Invalid request' });
  if (!req.body || Object.keys(req.body).some(key => !['cancelled', 'canceled'].includes(key))
    || Object.values(req.body).some(value => value !== true)) return res.status(400).json({ error: 'Invalid request' });
  res.json(await commerceFor(req).transition(req.params.orderId, { status: 'cancelled' }, req.identity));
});

module.exports = Orderrouter;
