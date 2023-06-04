const express = require('express');
const Orderrouter = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');


// POST /api/orders
Orderrouter.post('/', async (req, res) => {
  try {
    const order = await Order.create(req.body);

    // Update the stock of the ordered products
    const orderedItems = order.cartItems;
    await Promise.all(orderedItems.map(item => {
      const { _id, quantity } = item;
      return Product.findByIdAndUpdate(_id, { $inc: { stock: -quantity } });
    }));

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});


Orderrouter.get('/', (req, res) => {
  Order.find().populate('cartItems._id')
    .then(orders => {
      res.status(200).json(orders);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    });
});

module.exports = Orderrouter;
