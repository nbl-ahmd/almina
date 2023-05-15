const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const sharp = require('sharp');
const Product = require('../models/Product');
const Category = require('../models/Category');
const productRouter = express.Router();
const uploadDir = path.join(__dirname, '..', 'public/products');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Load dependencies
// const { nanoid } = require('nanoid');

// Define the prefix for product IDs
const PRODUCT_ID_PREFIX = 'PD';

// Keep track of the last used product number
let lastProductNumber = 0;

// Generate a new product ID
function generateProductId() {
    // Increment the last used product number
    lastProductNumber++;

    // Combine the prefix and the number to form the product ID
    return `${PRODUCT_ID_PREFIX}-${lastProductNumber.toString().padStart(4, '0')}`;
}

productRouter.post('/', upload.single('image'), async (req, res) => {
     const category = await Category.findById(req.body.category);
    const {
        name,
        price,
        stock
    } = req.body;
    const vat = req.body.vat == 'true';
    const sale = req.body.sale == 'true';
    const featured = req.body.featured == 'true';
    const image = req.file;
    // const product_id = generateProductId(); 
    
    // if (!category) return res.status(400).send('Invalid Category')
    // crop the image into a square
    const croppedImage = await sharp(image.buffer)
        .resize({ width: 500, height: 500, fit: 'cover' })
        .webp()
        .toBuffer();

    // generate a new filename for the resized image
    const Filename = uuidv4() + '.webp';

    // save the resized image to the resized directory
    await sharp(croppedImage).toFile(path.join(uploadDir, Filename));

    const product = new Product({
        product_id: 'a',
        name,
         image: Filename,
         category,
         featured,
         price,
         vat,
         stock,
         sale

    }); // save the resized filename to the database
    product.save()
        .then(() => {
            res.status(201).json({ message: 'Product added successfully' });
        })
        .catch(error => {
            console.log(error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

productRouter.get('/', (req, res) => {
    Product.find().populate('category')
        .then(products => {
            res.status(200).json(products);
        })
        .catch(error => {
            console.log(error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

productRouter.get('/images/:filename', (req, res) => {
    const { filename } = req.params;
    res.sendFile(path.join(uploadDir, filename)); // serve the resized image instead of the original image
});

module.exports = productRouter;







