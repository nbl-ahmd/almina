const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    gdriveFileId:{ type: String, required: true, default: '1ON-zKEP9L5OEM_Adh5Q-NWajkgLdvmWu'  },
    product_id: { type: String, required: true },
    name: { type: String, required: true,  },
    image: { type: String, required: true, default:'ba8b0d0f-86c7-4242-8133-4480e722860c.webp' },
     category: { type: mongoose.Schema.Types.ObjectId,
          ref:'Category',
      required: true },
    
    featured: { type: Boolean, required: true, default: false },
    price: { type: Number, required: true },
    vat: { type: Boolean, required: true, default: false },
    stock: { type: Number, required: true },
    sale: { type: Boolean, required: true, default: false },
    disabled: {type: Boolean, default: false}


});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
