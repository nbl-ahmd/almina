const express = require('express');
const Orderrouter = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const nodemailer = require('nodemailer');
const webpush = require('web-push');



// npx web-push generate-vapid-keys

// =======================================

// Public Key:
// BPJRLHqL62nj3j6L8lAsRnjdRKNaLkRxrpFQwmEgDbqMbYDZeRR4vyj9X-tIGVzHkt4pbgFbgIOd_Lma6p4i3Bk

// Private Key:
// Fw-Pj6RU4RnxSPbi2ravY3Ja9YxsaTvpyu86yteG2S8

// =======================================




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
    console.error('Error generating order ID:', error);
    throw error;
  }
}
const vapidKeys = {
  publicKey: 'BPJRLHqL62nj3j6L8lAsRnjdRKNaLkRxrpFQwmEgDbqMbYDZeRR4vyj9X-tIGVzHkt4pbgFbgIOd_Lma6p4i3Bk',
  privateKey: 'Fw-Pj6RU4RnxSPbi2ravY3Ja9YxsaTvpyu86yteG2S8',
};

webpush.setVapidDetails('mailto:nabeelkerala2000@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);

Orderrouter.post('/subscribe', (req, res) => {
  const pushSubscription = req.body.subscription;

  const notificationPayload = {
    title: 'New Order Placed',
    body: 'A new order has been received.',
    icon: 'https://cdn-icons-png.flaticon.com/128/1008/1008010.png', // Replace with your icon path
  };

  webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload))
    .then(response => {
      console.log('Push notification sent');
      res.status(200).json({ success: true });
    })
    .catch(error => {
      console.error('Push notification error:', error);
      res.status(500).json({ success: false, error: 'Push notification error' });
    });
});
// POST /api/orders
Orderrouter.post('/', async (req, res) => {
  try {
    const orderID = await generateOrderID();
    const order = await Order.create({ ...req.body, orderId: orderID });
    const { io } = req.app.locals;
    // Update the stock of the ordered products
    const orderedItems = order.cartItems;
    await Promise.all(orderedItems.map(item => {
      const { _id, quantity } = item;
      return Product.findByIdAndUpdate(_id, { $inc: { stock: -quantity } });
    }));

    

    res.status(201).json(order);
    io.emit('newOrder', order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
  
});


Orderrouter.post('/email', async (req, res) => {
  try {

    console.log(req.body.html);
  const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: 'info@alminapharmacy.com',
      pass: 'Mina@online',
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });
  const { recipient, htmlContent } = req.body;
  
  const options = {
    from: 'info@alminapharmacy.com',
    to: recipient,
    subject: 'Your order has been placed successfully',
    html: htmlContent,
  };
  
  await transporter.sendMail(options);
}
catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Failed to send mail' });
}

})

Orderrouter.get('/', (req, res) => {
  Order.find()
  .populate({
    path: 'cartItems._id', // Populates the cartItems._id field
    model: 'Product',      // Specifies the model to populate from
    populate: {
      path: 'category',    // Populates the category field within the Product schema
      model: 'Category'    // Replace 'Category' with your actual Category model name
    }
  })
    .then(orders => {
      res.status(200).json(orders);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

Orderrouter.get('/:id', async(req,res)=>{
  const order = await Order.findById(req.params.id).populate({
    path: 'cartItems._id', // Populates the cartItems._id field
    model: 'Product',      // Specifies the model to populate from
    populate: {
      path: 'category',    // Populates the category field within the Product schema
      model: 'Category'    // Replace 'Category' with your actual Category model name
    }
  });
  console.log(req.params.id);

  if(!order){
      res.status(500).json({message: 'The order with the given ID was not found.'})
  }
  res.status(200).send(order);
})

Orderrouter.put('/edit/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    

    // Check if the request body contains updated order data
    const updatedOrderData = req.body;
    const updateFields = {};
    console.log(updatedOrderData);
    const order = await Order.findByIdAndUpdate(orderId, updatedOrderData, { new: true });
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
    const order = await Order.findById(orderId);
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




module.exports = Orderrouter;
