const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Additive v2 fields. Historical documents retain all legacy values. Core writes use the shared transaction service.
  schemaVersion: { type: Number },
  status: { type: String, enum: ['pending', 'confirmed', 'packed', 'dispatched', 'cancelled', 'refunded', 'legacy_conflict'] },
  statusHistory: [{ status: String, at: Date, actorId: mongoose.Schema.Types.ObjectId }],
  lines: { type: [new mongoose.Schema({ productId: String, sku: String, barcode: String, name: String, quantity: Number,
    unitPriceMinor: Number, salePriceMinor: Number, discountMinor: Number, taxRateBps: Number, taxMinor: Number, lineTotalMinor: Number }, { _id: false })], immutable: true, default: undefined },
  totals: { type: new mongoose.Schema({ currency: String, policyVersion: String, vatMode: String,
    subtotalMinor: Number, discountMinor: Number, taxMinor: Number, deliveryFeeMinor: Number, minimumOrderMinor: Number, totalMinor: Number }, { _id: false }), immutable: true },
  inventory: { deducted: Boolean, restored: Boolean },
  cancellationRestocks: { type: Boolean, immutable: true },
  orderId: {
    type: String,
    required: true
  },
  dispatched: {
    type: Boolean,
  },
  canceled: {
    type: Boolean,
    default: false,
  },
  billno: {
    type: String,
  },
  billamount: {
    type: Number,
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
    totalSalePrice: {
      type: Number,
      required: true
    },
    totalVat: {
      type: Number,
      required: false
    },
    totalAmount: {
      type: Number,
      required: true
    },
    deliveryFee: {
      type: Number,
      required: true
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
