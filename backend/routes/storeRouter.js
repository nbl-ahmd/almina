const express = require('express');
const storeRouter = express.Router();
const Store = require('../models/Store'); // Import your Store model

// Route to update the store status (only accessible by admin)
storeRouter.put('/status', async (req, res) => {
  const { status } = req.body;
  console.log('Received status:', status); // Add this line for debugging

  if (typeof status === 'boolean' ) {
    try {
      console.log('condition status:',status)
      // Update the store status in the database
      const result = await Store.findOneAndUpdate({}, { status: status ? 'open' : 'closed' }, { upsert: true });
      console.log('Update result:', result); // Log the result for debugging

      res.status(200).json({ message: 'Store status updated successfully' });
    } catch (error) {
      console.error('Error updating store status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(400).json({ message: 'Invalid store status' });
  }
});



// Middleware to check if the store is closed
storeRouter.use('/cart/add', async (req, res, next) => {
  try {
    // Fetch the store status from the database
    const store = await Store.findOne({});
    if (store && store.status === 'closed') {
      return res.status(403).json({ message: 'Store is closed' });
    }
    next();
  } catch (error) {
    console.error('Error fetching store status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Example route for adding items to the cart
storeRouter.post('/cart/add', (req, res) => {
  // Your cart logic here
});

// Route to get the store status
storeRouter.get('/status', async (req, res) => {
  try {
    // Fetch the store status from the database
    const store = await Store.findOne({});
    if (store) {
      res.status(200).json({ status: store.status });
    } else {
      res.status(404).json({ message: 'Store not found' });
    }
  } catch (error) {
    console.error('Error fetching store status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export the router
module.exports = storeRouter;
