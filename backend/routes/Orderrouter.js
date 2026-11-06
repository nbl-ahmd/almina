const express = require('express');
const Orderrouter = express.Router();
const { createCommerceService } = require('../commerce/dist/service.cjs');
const commerceFor = req => createCommerceService(req.app.locals.getCommerceDb, req.app.locals.stripePayments);

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
