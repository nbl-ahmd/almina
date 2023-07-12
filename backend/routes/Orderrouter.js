const express = require('express');
const Orderrouter = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');

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

// POST /api/orders
Orderrouter.post('/', async (req, res) => {
  try {
    const orderID = await generateOrderID();
    const order = await Order.create({ ...req.body, orderId: orderID });

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

Orderrouter.get('/:id', async(req,res)=>{
  const order = await Order.findById(req.params.id);
  console.log(req.params.id);

  if(!order){
      res.status(500).json({message: 'The order with the given ID was not found.'})
  }
  res.status(200).send(order);
})

Orderrouter.put('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.dispatched = true;
    await order.save();

    res.json({ message: 'Order dispatched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dispatch order' });
  }
});



module.exports = Orderrouter;
