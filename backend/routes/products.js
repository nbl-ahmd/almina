const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const sharp = require('sharp');
const ExifImage = require('exif').ExifImage;
const Product = require('../models/Product');
const Category = require('../models/Category');
const productRouter = express.Router();
const uploadDir = path.join(__dirname, '..', 'public/products');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fs = require('fs');

//google
const { Readable } = require('stream');
const { google } = require('googleapis');
// Load the JSON key file
const keyFile = path.join(__dirname, '/cred.json');

// Create a new instance of the drive API
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Replace 'FOLDER_ID' with the ID of your target folder in Google Drive
const FOLDER_ID = '1I8HpwJ_iaOx_r7ZsOOETYcQbpMFpLUH6';

// Function to generate a unique product ID
async function generateProductID() {
  try {
    const existingProducts = await Product.find();
    let maxID = 0;
    for (const product of existingProducts) {
      const productID = parseInt(product.product_id.substring(2));
      if (productID > maxID) {
        maxID = productID;
      }
    }
    return `PD${String(maxID + 1).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating product ID:', error);
    throw error;
  }
}


productRouter.post('/', upload.single('image'), async (req, res) => {
  const category = await Category.findById(req.body.category);
  const {
    name,
    price,
    stock,
    barcode
  } = req.body;
  const vat = req.body.vat == 'true';
  const sale = req.body.sale == 'true';
  const featured = req.body.featured == 'true';
  const image = req.file;
  const product_id = await generateProductID();
  let orientation = 1;
  if (image) {
    try {
      const exifData = await sharp(image.buffer).metadata();
      orientation = exifData.orientation || 1;
    } catch (error) {
      console.error('Error reading EXIF data:', error);
    }

    // crop the image into a square
    const croppedImage = await sharp(image.buffer)
      .resize({ width: 500, height: 500, fit: 'cover' })
      .rotate()
      .webp()
      .toBuffer();

    // generate a new filename for the resized image
    const Filename = uuidv4() + '.webp';

    const product = new Product({
      product_id,
      name,
      image: Filename,
      category,
      featured,
      price,
      vat,
      stock,
      sale,
      barcode
    }); // save the resized filename to the database

    try {
      const fileMetadata = {
        name: Filename,
        parents: [FOLDER_ID], // Set the parent folder ID
      };

      const media = {
        mimeType: 'image/webp',
        body: Readable.from(croppedImage),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      product.gdriveFileId = response.data.id; // Save the Google Drive file ID to the product document

      // Save the product document to the database
      await product.save();

      res.status(201).json({ message: 'product created successfully' });
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    const product = new Product({
      product_id,
      name,
      category,
      featured,
      price,
      vat,
      stock,
      sale,
      barcode
    });

    try {
      // Save the product document to the database without an image
      await product.save();

      res.status(201).json({ message: 'product created successfully' });
    } catch (error) {
      console.error('Error saving product:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});


// productRouter.get('/', (req, res) => {
//     Product.find().populate('category')
//         .then(products => {
//             res.status(200).json(products);
//         })
//         .catch(error => {
//             console.log(error);
//             res.status(500).json({ error: 'Internal server error' });
//         });
// });

// productRouter.get('/', (req, res) => {
//   const filter = req.query.filter ? JSON.parse(req.query.filter) : {}; // Parse the filter JSON string if provided
//   const limit = Number(req.query.limit) || 10; // Default limit is 10 if not provided
//   const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided

//   Product.find(filter)
//     .skip(offset)
//     .limit(limit)
//     .populate('category')
//     .then(products => {
//       res.status(200).json(products);
//     })
//     .catch(error => {
//       console.log(error);
//       res.status(500).json({ error: 'Internal server error' });
//     });
// });




productRouter.get('/', async (req, res) => {
  const filter = req.query.filter ? JSON.parse(req.query.filter) : {}; // Parse the filter JSON string if provided
  const limit = Number(req.query.limit); // Remove default limit
  const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided
  const disabledCategory = (req.query.disabledCat);
  try {
    let products;

 if (limit) {
      // Fetch products with pagination
      products = await Product.find(filter)
      .sort({ stock: -1, _id: 1  })
        .skip(offset)
        .limit(limit)
        .populate('category');
    } else {
      // Fetch all products without pagination
      products = await Product.find(filter).populate('category');
    }

console.log(disabledCategory);
    if(disabledCategory === 'false'){
      // Filter products where category.disabled is false
const filteredProducts = products.filter((product) => {
  // If a product has a category and category.disabled is false, include it
  if (product.category && product.category.disabled === false) {
    return true;
  }
  return false;
});
res.status(200).json(filteredProducts);
    
    }
    else if(disabledCategory === 'true'){
      // Filter products where category.disabled is false
const filteredProducts = products.filter((product) => {
  // If a product has a category and category.disabled is false, include it
  if (product.category && product.category.disabled === true) {
    return true;
  }
  return false;
});
res.status(200).json(filteredProducts);
    
    }
    else{
      console.log('normal products')
      res.status(200).json(products);
    }

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.get('/search', async (req, res) => {
  const filter = req.query.filter ? JSON.parse(req.query.filter) : {}; // Parse the filter JSON string if provided
  const searchQuery = req.query.q;
  const limit = Number(req.query.limit); // Remove default limit
  const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided
  const disabledCategory = (req.query.disabledCat);
  try {
    // Perform the search query against the name and description fields

    let searchResults;
    if (limit) {
     searchResults = await Product.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search on the name field
        { description: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search on the description field
      ],
    })
    .skip(offset)
        .limit(limit)
        .populate('category');
  }
  else{
     searchResults = await Product.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search on the name field
        { description: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search on the description field
      ],
    }).populate('category');

  }


   if(disabledCategory === 'false'){
      // Filter products where category.disabled is false
const filteredProducts = searchResults.filter((searchResults) => {
  // If a product has a category and category.disabled is false, include it
  if (searchResults.category && searchResults.category.disabled === false) {
    return true;
  }
  return false;
});
res.status(200).json(filteredProducts);
    
    }
    else if(disabledCategory === 'true'){
      // Filter products where category.disabled is false
const filteredSearchResults = searchResults.filter((searchResults) => {
  // If a product has a category and category.disabled is false, include it
  if (searchResults.category && searchResults.category.disabled === true) {
    return true;
  }
  return false;
});
res.status(200).json(filteredSearchResults);
    
    }
    else{
      console.log('normal products')
      res.status(200).json(searchResults);
    }


  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'An error occurred while searching for products' });
  }
});



productRouter.get('/images/:filename', async(req, res) => {
  const { filename } = req.params;

  try {
    // Retrieve the product by filename from the database
    const product = await Product.findOne({ image: filename });
    if (!product) {
      return res.status(404).json({ error: 'product not found' });
    }

    // Retrieve the image file from Google Drive
    const response = await drive.files.get(
      { fileId: product.gdriveFileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Set the appropriate Content-Type header for the image
    res.set('Content-Type', 'image/webp');

    // Pipe the image stream from Google Drive to the response stream
    response.data.pipe(res);
  } catch (error) {
    console.error('Error retrieving image from Google Drive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.get('/:id', async(req,res)=>{
    const product = await Product.findById(req.params.id);

    if(!product){
        res.status(500).json({message: 'The product with the given ID was not found.'})
    }
    res.status(200).send(product);
})

productRouter.get('/category/:categoryId', async (req, res) => {
  const { categoryId } = req.params;

  try {
    const products = await Product.find({ 'category': categoryId }).populate('category');
    res.json(products);
    console.log(products._id);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.delete('/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'product not found!' });
    }

    // Delete the product from the database
    await Product.findByIdAndRemove(productId);

    // If applicable, delete the image file from Google Drive
    if (product.gdriveFileId &&  product.gdriveFileId!== '1Ru3bJPvlSfkEJ74gEjdgO9jSQtJNFtCu') {
      await drive.files.delete({ fileId: product.gdriveFileId });
    }

    return res.status(200).json({ success: true, message: 'The product and image are deleted!' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


productRouter.put('/publish/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    // Find the product by its ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update the 'disabled' property of the product
    product.disabled = !product.disabled;

    // Save the updated product
    await product.save();
    console.log('success');

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error while updating the product:', error);
    res.status(500).json({ error: 'Failed to update the product' });
  }
});



productRouter.put('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const updateFields = {};

  try {
    // Retrieve the previous image filename from the database
    const prevProduct = await Product.findById(id);
    const prevImage = prevProduct.image;
    const prevGdriveFileId = prevProduct.gdriveFileId;

    // Check if each field is present in the request body and update the corresponding field
    if (req.body.name) {
      updateFields.name = req.body.name;
    }

    if (req.body.price) {
      updateFields.price = req.body.price;
    }
    if (req.body.barcode) {
      updateFields.barcode = req.body.barcode;
    }

    if (req.body.category) {
      updateFields.category = req.body.category;
    }

    if (req.body.stock) {
      updateFields.stock = req.body.stock;
    }

    if (req.body.vat) {
      updateFields.vat = req.body.vat === 'true';
    }

    if (req.body.sale) {
      updateFields.sale = req.body.sale === 'true';
    }

    if (req.body.featured) {
      updateFields.featured = req.body.featured === 'true';
    }
    if (req.body.disabled) {
      updateFields.disabled = req.body.disabled === 'true';
    }
    if (req.body.saleType) {
      updateFields.saleType = req.body.saleType;
    }
    if (!isNaN(req.body.salePrice)) {
      updateFields.salePrice = parseFloat(req.body.salePrice);
    }
    if (!isNaN(req.body.salePercent)) {
      updateFields.salePercent = req.body.salePercent;
    }
    if (req.body.saleBadge) {
      updateFields.saleBadge = req.body.saleBadge;
    }

    if (req.file) {
      const image = req.file;

     // Delete the previous image from Google Drive
     if (prevGdriveFileId && prevGdriveFileId !== '1Ru3bJPvlSfkEJ74gEjdgO9jSQtJNFtCu') {
      await drive.files.delete({
        fileId: prevGdriveFileId,
      });
    }


      // Extract the EXIF orientation
      let orientation = 1;
      try {
        const exifData = await sharp(image.buffer).metadata();
        orientation = exifData.orientation || 1;
      } catch (error) {
        console.error('Error reading EXIF data:', error);
      }

      // Crop the image into a square
      const croppedImage = await sharp(image.buffer)
        .resize({ width: 500, height: 500, fit: 'cover' })
        .rotate()
        .webp()
        .toBuffer();

      // Generate a new filename for the resized image
      const filename = uuidv4() + '.webp'; // 

       // Save the updated image to Google Drive
       const fileMetadata = {
        name: filename,
        parents: [FOLDER_ID], // Set the parent folder ID
      };

      const media = {
        mimeType: 'image/webp',
        body: Readable.from(croppedImage),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      updateFields.image = filename;
      updateFields.gdriveFileId = response.data.id; // Save the updated Google Drive file ID to the product document
    
    }

    const product = await Product.findByIdAndUpdate(id, updateFields, { new: true });

    if (!product) {
      return res.status(400).send('The product cannot be updated!');
    }

    res.send(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).send('An error occurred while updating the product');
  }
});


module.exports = productRouter;







