const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    gdriveFileId:{ type: String, required: true, default: '1Ru3bJPvlSfkEJ74gEjdgO9jSQtJNFtCu'},
    product_id: { type: String, required: true },
    name: { type: String, required: true,  },
    image: { type: String, default: '6ac0f6cd-aec0-4484-af8f-27c627b5d1a4.webp' },
     category: { type: mongoose.Schema.Types.ObjectId,
          ref:'Category',
      required: true },
    
    featured: { type: Boolean, required: true, default: false },
    price: { type: Number, required: true },
    vat: { type: Boolean, required: true, default: false },
    stock: { type: Number, required: true },
    sale: { type: Boolean, required: true, default: false },
    disabled: {type: Boolean, default: false},
    barcode: {type: String, required: true}


});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
