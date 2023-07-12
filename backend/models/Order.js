const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  dispatched: {
    type: Boolean,
  },
  customer: {
   
    name: {
      type: String,
      required: true
    },
    mobile: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    emirate: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    buildingname: {
      type: String,
      
    },
    flatno: {
      type: String,
      
    },
    note: {
      type: String,
      
    },
    payment: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    totalprice: {
      type: String,
      required: true
    },
    maplink: {
      type: String,
     
    },

  },
  cartItems: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
