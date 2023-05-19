const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product_id: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
     category: { type: mongoose.Schema.Types.ObjectId,
          ref:'Category',
      required: true },
    
    featured: { type: Boolean, required: true, default: false },
    price: { type: Number, required: true },
    vat: { type: Boolean, required: true, default: false },
    stock: { type: Number, required: true },
    sale: { type: Boolean, required: true, default: false }


});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
