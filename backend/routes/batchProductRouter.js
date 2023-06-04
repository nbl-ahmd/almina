const express = require('express');
const batchProductRouter = express.Router();
const csvParser = require('csv-parser');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Category = require('../models/Category');
const { log } = require('console');

const uploadDir = path.join(__dirname, '../public/csv');




const randomColor = () => {
    // Generate random RGB values between 0 and 255
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
  
    // Return the RGB color string
    return `${r}, ${g}, ${b}`;
  };

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Set up multer upload middleware
const upload = multer({ storage });

batchProductRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const products = [];

 // ...

try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', async (data) => {
          try {
            const category = await Category.findOne({ name: data.category });
  
            let categoryId;
            if (category) {
              categoryId = category._id; // Assign the existing category ID to the product
            } else {
              const newCategory = new Category({ name: data.category, color:  randomColor()});
              await newCategory.save();
              categoryId = newCategory._id; // Assign the newly created category ID to the product
            }
  
            console.log('Processing data:', data);
            console.log('Category found:', category);
  
            const product = new Product({
              product_id: data.product_id,
              name: data.name,
              category: categoryId,
              featured: data.featured === 'TRUE',
              price: parseFloat(data.price),
              vat: data.vat === 'TRUE',
              stock: parseInt(data.stock),
              sale: data.sale === 'TRUE',
              disabled: data.disabled === 'TRUE'
            });
            log('prdct :' + product);
            await product.save();
          } catch (error) {
            console.error('Error processing category:', error);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  
    console.log('Products to insert:', products);
  
    if (products.length > 0) {
      const result = await Product.insertMany(products);
      console.log('Products inserted:', result);
      res.json({ success: true, count: result.length });
    } else {
      console.log('No products to insert');
      res.json({ success: true, count: 0 });
    }
  } catch (error) {
    console.error('Error inserting products:', error);
    res.status(500).json({ error: 'Error inserting products' });
  }
  
  // ...
  
});

module.exports = batchProductRouter;
