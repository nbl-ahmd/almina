const express = require('express');
const Orderrouter = express.Router();
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { createCommerceService, legacyOrderDto } = require('../commerce/dist/service.cjs');
const getLegacyDb = async () => {
  if (!mongoose.connection.db || mongoose.connection.readyState !== 1) throw Object.assign(new Error('Unavailable'), { status: 503 });
  return mongoose.connection.db;
};
const commerceFor = req => createCommerceService(req.app.locals.getCommerceDb ?? getLegacyDb);
const nodemailer = require('nodemailer');




// Push subscriptions belong to the authenticated staff member, never to a caller-supplied user.
Orderrouter.post('/subscribe', require('../security/boundary.cjs').wrap(async (req, res) => {
  const subscription = req.body?.subscription;
  let endpoint;
  try { endpoint = new URL(subscription?.endpoint); } catch { return res.status(400).json({ error: 'Invalid subscription' }); }
  const hosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'wns.windows.com'];
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.port
    || !hosts.some(host => endpoint.hostname === host || endpoint.hostname.endsWith('.' + host))
    || typeof subscription?.keys?.p256dh !== 'string' || !/^[A-Za-z0-9_-]{80,100}$/.test(subscription.keys.p256dh)
    || typeof subscription?.keys?.auth !== 'string' || !/^[A-Za-z0-9_-]{20,30}$/.test(subscription.keys.auth)
    || endpoint.href.length > 2048) return res.status(400).json({ error: 'Invalid subscription' });
  await require('mongoose').connection.db.collection('users').updateOne(
    { _id: new (require('mongoose').Types.ObjectId)(req.identity.id) },
    { $set: { subscription: { endpoint: endpoint.href, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } } } });
  res.status(204).end();
}));

Orderrouter.delete('/subscribe', require('../security/boundary.cjs').wrap(async (req, res) => {
  await require('mongoose').connection.db.collection('users').updateOne(
    { _id: new (require('mongoose').Types.ObjectId)(req.identity.id) }, { $unset: { subscription: '' } });
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

Orderrouter.post('/email', async (req, res) => {
  try {


  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      // Verify the SMTP provider certificate.
      rejectUnauthorized: true,
    },
  });
  const { recipient, htmlContent } = req.body;

  const options = {
    from: '"Al Mina Pharmacy" <info@alminapharmacy.com>',
    to: recipient,
    subject: 'Your order has been placed successfully',
    html: htmlContent,
  };

  await transporter.sendMail(options);
  res.status(204).end();
}
catch (error) {

  res.status(500).json({ error: 'Failed to send mail' });
}

})

Orderrouter.get('/', (req, res) => {
  const page = require('../security/admin-pagination.cjs').adminPagination(req.query);
  if (Object.keys(req.query).some(key => !['limit', 'offset', 'status'].includes(key)) || (req.query.status && !['pending', 'confirmed', 'packed', 'dispatched', 'cancelled', 'refunded'].includes(req.query.status))) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const statusFilter = req.query.status ? { $or: [{ status: req.query.status }, { status: { $exists: false }, ...(req.query.status === 'pending' ? { dispatched: { $ne: true }, canceled: { $ne: true } } : req.query.status === 'dispatched' ? { dispatched: true, canceled: { $ne: true } } : req.query.status === 'cancelled' ? { canceled: true, dispatched: { $ne: true } } : { _id: null }) }] } : {};
  Order.find({ ...(req.identity.role === 'admin' ? {} : { 'customer.city': { $in: req.identity.cities } }), ...statusFilter })
  .populate({
    path: 'cartItems._id', // Populates the cartItems._id field
    model: 'Product',      // Specifies the model to populate from
    populate: {
      path: 'category',    // Populates the category field within the Product schema
      model: 'Category'    // Replace 'Category' with your actual Category model name
    }
  }).lean().sort({ createdAt: -1, _id: -1 }).skip(page?.offset ?? 0).limit(page?.limit ?? 0) // Sort by 'createdAt' field in descending order;
    .then(orders => {
      res.status(200).json(orders.map(legacyOrderDto));
    })
    .catch(error => {

      res.status(500).json({ error: 'Internal server error' });
    });
});

Orderrouter.get('/:id', async(req,res)=>{
  const order = await Order.findOne({ _id: req.params.id, ...(req.identity.role === 'admin' ? {} : { 'customer.city': { $in: req.identity.cities } }) }).populate({
    path: 'cartItems._id', // Populates the cartItems._id field
    model: 'Product',      // Specifies the model to populate from
    populate: {
      path: 'category',    // Populates the category field within the Product schema
      model: 'Category'    // Replace 'Category' with your actual Category model name
    }
  }).lean();


  if(!order){
      return res.status(404).json({message: 'Order not found'})
  }
  res.status(200).send(legacyOrderDto(order));
})

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
