const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    archivedAt: Date, archivedBy: String, published: Boolean,
    image: { type: String },
    mediaRevision: Number,
    gdriveFileId:{type: String, required: false},
    product_id: {type: String, required: true },
    name: {type: String, required: true,  },
    images: [{type: String, default: '6ac0f6cd-aec0-4484-af8f-27c627b5d1a4.webp' }],
    cloudinaryImages: [{type: String}],
    gdriveFileIds: [{type: String, required: true, default: '1Ru3bJPvlSfkEJ74gEjdgO9jSQtJNFtCu'}],
    category: {type: mongoose.Schema.Types.ObjectId,ref:'Category',required: true },    
    featured: {type: Boolean, required: true, default: false },
    price: {type: Number, required: true },
    vat: {type: Boolean, required: true, default: false },
    stock: { type: Number, required: true },
    sale: { type: Boolean, required: true, default: false },
    disabled: {type: Boolean, default: false},
    barcode: {type: String, required: true},
    salePrice: { type: Number, required: false },
    salePercent: {type: Number, required: false},
    saleBadge: {type: String, required: false},
    saleType: {type: String, required: false},
    description: {type: String, required: false},
    createdAt: {
        type: Date,
        default: Date.now
      }


});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
