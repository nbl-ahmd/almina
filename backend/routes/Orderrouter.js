const express = require('express');
const Orderrouter = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const nodemailer = require('nodemailer');
const { sendOrderConfirmation } = require('../integrations/order-email.cjs');




// Function to generate a unique order ID
async function generateOrderID() {
  try {
    const existingOrders = await Order.find();
    let maxID = 5000;
    for (const order of existingOrders) {
      const orderID = parseInt(order.orderId.substring(2));
      if (orderID > maxID) {
        maxID = orderID;
      }
    }
    return `OD${String(maxID + 1).padStart(4, '0')}`;
  } catch (error) {

    throw error;
  }
}
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

// POST /api/orders
Orderrouter.post('/', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).some(key => !['customer', 'cartItems'].includes(key))) return res.status(400).json({ error: 'Invalid request' });
    const orderID = await generateOrderID();
    const order = await Order.create({ customer: req.body.customer, cartItems: req.body.cartItems, orderId: orderID, dispatched: false, canceled: false });
    const { io } = req.app.locals;
    // Update the stock of the ordered products
    const orderedItems = order.cartItems;
    await Promise.all(orderedItems.map(item => {
      const { _id, quantity } = item;
      return Product.findByIdAndUpdate(_id, { $inc: { stock: -quantity } });
    }));



    res.status(201).json(order);
    io.emit('newOrder', order);
    void sendOrderConfirmation(order).catch(() => console.error('Order confirmation delivery failed')); // No PII/provider error logging.
  } catch (error) {

    res.status(500).json({ error: 'Failed to create order' });
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
  Order.find(req.identity.role === 'admin' ? {} : { 'customer.city': { $in: req.identity.cities } })
  .populate({
    path: 'cartItems._id', // Populates the cartItems._id field
    model: 'Product',      // Specifies the model to populate from
    populate: {
      path: 'category',    // Populates the category field within the Product schema
      model: 'Category'    // Replace 'Category' with your actual Category model name
    }
  }).sort({ createdAt: -1 }) // Sort by 'createdAt' field in descending order;
    .then(orders => {
      res.status(200).json(orders);
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
  });


  if(!order){
      return res.status(404).json({message: 'Order not found'})
  }
  res.status(200).send(order);
})

Orderrouter.put('/edit/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {


    // Check if the request body contains updated order data
    const updatedOrderData = req.body;
    if (!updatedOrderData || Object.keys(updatedOrderData).some(key => !['billno', 'billamount', 'dispatched', 'canceled'].includes(key))) return res.status(400).json({ error: 'Invalid request' });

    const order = await Order.findByIdAndUpdate(orderId, { $set: updatedOrderData }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order dispatched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update and dispatch the order' });
  }
});

Orderrouter.put('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const {billno} = req.body;
  const {billamount} = req.body;
  try {
    const order = await Order.findOne({ _id: orderId, ...(req.identity.role === 'admin' ? {} : { 'customer.city': { $in: req.identity.cities } }) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.dispatched = true;
    order.billno = billno;
    order.billamount = billamount;
    await order.save();

    res.json({ message: 'Order dispatched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dispatch order' });
  }
});
Orderrouter.put('/cancel/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findOne({ _id: orderId, ...(req.identity.role === 'admin' ? {} : { 'customer.city': { $in: req.identity.cities } }) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.canceled = true;
    await order.save();

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});




module.exports = Orderrouter;
