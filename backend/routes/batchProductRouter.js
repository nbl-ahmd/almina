const express = require('express');
const batchProductRouter = express.Router();
const csv = require('csvtojson');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const multer = require('multer');
const uploadDir = path.join(__dirname, '..', 'public/csv');
const upload = multer({ dest: uploadDir });
const { v4: uuidv4 } = require('uuid');

async function generateProductID(maxID) {
  try {
    const newProductID = `PD${String(maxID + 1).padStart(4, '0')}`;
    return newProductID;
  } catch (error) {
    console.error('Error generating Product ID:', error);
    throw error;
  }
}

const randomColor = () => {
  // Generate random RGB values between 0 and 255
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Return the RGB color string
  return `${r}, ${g}, ${b}`;
};

batchProductRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const products = [];
    const color = randomColor();

    // Convert CSV to JSON
    const jsonArray = await csv().fromFile(filePath.replace(/^"(.+(?="$))"$/, '$1'));

    const existingProducts = await Product.find();
    let maxID = 5000;
    for (const product of existingProducts) {
      const productID = parseInt(product.product_id.substring(2));
      if (productID > maxID) {
        maxID = productID;
      }
    }

    for (const data of jsonArray) {
      try {
        let categoryName = data.category.trim(); // Trim whitespace from category name

        if (!categoryName) {
          categoryName = 'General';
        }

        let category = await Category.findOne({ name: categoryName });

        if (!category) {
          // Create a new category if it doesn't exist
          category = new Category({ name: categoryName, color: color });
          category = await category.save();
          console.log(`Category '${categoryName}' not found for product '${data.name}'. Created new category.`);
        }
        const productId = await generateProductID(maxID); // Pass the current maximum ID to generateProductID
        maxID++; // Increment the maximum ID for the next product
        const product = new Product({
          name: data.name,
          vat: (data.vat === 'TRUE' ? true : false),
          price: data.price,
          barcode: data.barcode, // Provide the barcode field
          featured: (data.featured === 'TRUE' ? true : false),
          sale: (data.sale === 'TRUE' ? true : false),
          stock: data.stock, // Provide the stock field
          product_id: productId, // Assign the generated product ID
          category: category._id, // Use the category ID instead of the entire category object
        });

        products.push(product);
      } catch (error) {
        console.error('Error processing product:', error);
        res.status(500).json({ error: 'Error processing products' });
        return;
      }
    }

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
});

module.exports = batchProductRouter;
