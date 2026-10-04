const { catalogFilter, escapeSearch } = require('../security/catalog-query.cjs');
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
const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));
const fs = require('fs');

//google
const { Readable } = require('stream');
const { google } = require('googleapis');
// Load the JSON key file
const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Create a new instance of the drive API
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Replace 'FOLDER_ID' with the ID of your target folder in Google Drive
const FOLDER_ID = '1I8HpwJ_iaOx_r7ZsOOETYcQbpMFpLUH6';

productRouter.post('/', upload.array('images', 5), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.catalogCreationInput(req.body);
  const category = await Category.findById(req.body.category);
  if (!category || category.archivedAt) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const files = req.files;

  let imageUrls = [];
  let gdriveFileIds = [];

  if (files && files.length > 0) {
      for (const file of files) {
          try {

              // Resize and convert the image
              const croppedImage = await sharp(file.buffer, { limitInputPixels: 20000000 })
                  .resize({ width: 500, height: 500, fit: 'cover' })
                  .webp()
                  .toBuffer();

              // Generate a filename
              const filename = uuidv4() + '.webp';

              // Save to Google Drive
              const fileMetadata = {
                  name: filename,
                  parents: [FOLDER_ID],
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



              // Store URLs and Google Drive IDs
              imageUrls.push(filename);
              gdriveFileIds.push(response.data.id);
          } catch (error) {

              return res.status(500).json({ error: 'Failed to upload images' });
          }
      }
  }

  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  const product = await domain.createCatalogProduct(db, req.body, req.identity.id, { images: imageUrls, gdriveFileIds });
  res.status(201).json({ message: 'Product created successfully', product });
});



productRouter.get('/images/:filename', async (req, res) => {
  const { filename } = req.params;

  try {
    // Retrieve the product by filename
    let product = await Product.findOne({
      $or: [{ image: filename }, { images: filename }],
    });

    if (!product) {
      const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
      const fileId = await require('../commerce/dist/service.cjs').resolveRetainedAsset(db, 'products', filename);
      if (fileId) product = { image: filename, gdriveFileId: fileId };
    }
    if (!product) {
      return res.status(404).json({ error: 'Product or image not found' });
    }

    if (product.image === filename && product.gdriveFileId) {
      // For old products with a single gdriveFileId
      const response = await drive.files.get(
        { fileId: product.gdriveFileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Set the appropriate Content-Type header for the image
      res.set('Content-Type', 'image/webp');

      // Pipe the image stream from Google Drive to the response stream
      response.data.pipe(res);
    } else if (product.gdriveFileIds) {
      // For new products with multiple gdriveFileIds


      // Find the index of the requested filename in the `images` array
      const imageIndex = product.images.indexOf(filename);
      if (imageIndex === -1 || !product.gdriveFileIds[imageIndex]) {
        return res.status(404).json({ error: 'Image not found in product' });
      }

      const gdriveFileId = product.gdriveFileIds[imageIndex];
      const response = await drive.files.get(
        { fileId: gdriveFileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Set the appropriate Content-Type header for the image
      res.set('Content-Type', 'image/webp');

      // Pipe the image stream from Google Drive to the response stream
      response.data.pipe(res);
    } else {
      return res.status(404).json({ error: 'No valid Google Drive file ID found' });
    }
  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});


// productRouter.get('/images/:filename', async(req, res) => {
//   const { filename } = req.params;


//   try {
//     // Retrieve the product by filename from the database
//     const product = await Product.findOne({ image: filename });
//     if (!product) {
//       return res.status(404).json({ error: 'product not found' });
//     }

//



//     // Retrieve the image file from Google Drive
//     const response = await drive.files.get(
//       { fileId: product.gdriveFileId, alt: 'media' },
//       { responseType: 'stream' }
//     );

//     // Set the appropriate Content-Type header for the image
//     res.set('Content-Type', 'image/webp');

//     // Pipe the image stream from Google Drive to the response stream
//     response.data.pipe(res);
//   } catch (error) {
//
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });



productRouter.get('/', async (req, res) => {
  const filter = catalogFilter(req.query.filter); // Parse the filter JSON string if provided
  const limit = Number(req.query.limit); // Remove default limit
  const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided
  const disabledCategory = (req.query.disabledCat);
  try {
    let products;

 if (limit) {
      // Fetch products with pagination

      let sortQuery = {}; // Define an empty object to store the sorting query

      if (filter.sale === true) {
        // If sale is true, sort by createdAt in descending order
        sortQuery = { createdAt: -1, _id: 1 };
      } else {
        // Otherwise, sort by stock in descending order
        sortQuery = { stock: -1, _id: 1 };
      }

      products = await Product.find(filter)
      .sort(sortQuery)
        .skip(offset)
        .limit(limit)
        .populate('category');
    } else {
      // Fetch all products without pagination
      products = await Product.find(filter).populate('category');
    }


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

      res.status(200).json(products);
    }

  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.get('/search', async (req, res) => {
  const filter = Object.entries(catalogFilter(req.query.filter, true)).map(([key, value]) => ({ [key]: value })); // Parse the filter JSON string if provided
  const searchQuery = escapeSearch(req.query.q);
  const limit = Number(req.query.limit); // Remove default limit
  const offset = Number(req.query.offset) || 0; // Default offset is 0 if not provided
  const disabledCategory = (req.query.disabledCat);

  try {
    // Perform the search query against the name and description fields

    let searchResults;
    if (limit) {
      const searchQueryConditions = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
        ],
      };
      const combinedConditions = {
        $and: [searchQueryConditions, ...filter],
      };



     searchResults = await Product.find(combinedConditions)
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

      res.status(200).json(searchResults);
    }


  } catch (error) {

    res.status(500).json({ error: 'An error occurred while searching for products' });
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
    const products = await Product.find({ 'category': categoryId, archivedAt: { $exists: false } }).populate('category');
    res.json(products);

  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});

productRouter.delete('/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'products', req.params.id, req.identity.id));
});


productRouter.put('/publish/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    // Find the product by its ID
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.archivedAt) return res.status(409).json({ error: 'Archived product cannot be published' });
    require('../commerce/dist/service.cjs').moneyMinor(product.price);
    if (product.sale) {
      const money = require('../commerce/dist/service.cjs').moneyMinor;
      if (money(product.salePrice) > money(product.price)) return res.status(400).json({ error: 'Invalid sale price' });
    }
    // Update the 'disabled' property of the product
    product.disabled = !product.disabled;
    product.published = !product.disabled;

    // Save the updated product
    await product.save();


    res.json({ message: 'Product updated successfully' });
  } catch (error) {

    res.status(500).json({ error: 'Failed to update the product' });
  }
});



productRouter.put('/:id', upload.array('images', 5), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  require('../commerce/dist/service.cjs').inventoryInput(req.body);
  const { id } = req.params;
  const files = req.files;

  try {
      const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
      const assetHash = files?.length ? require('node:crypto').createHash('sha256').update(JSON.stringify(files.map(file => require('node:crypto').createHash('sha256').update(file.buffer).digest('hex')))).digest('hex') : undefined;
      const replay = await require('../commerce/dist/service.cjs').replayProductMutation(db, id, req.body, req.identity.id, assetHash);
      if (replay) return res.json(replay);
      const prevProduct = await Product.findById(id);
      if (!prevProduct) {
          return res.status(404).json({ error: 'Product not found' });
      }

      let imageUrls = prevProduct.images;
      let gdriveFileIds = prevProduct.gdriveFileIds;

      if (files && files.length > 0) {
          // Keep prior assets until a separate reference-aware retention review.
          // Upload failure or a concurrent stock conflict must never delete live media.
          // Process new images
          imageUrls = [];
          gdriveFileIds = [];
          for (const file of files) {
              try {
                  const croppedImage = await sharp(file.buffer, { limitInputPixels: 20000000 })
                      .resize({ width: 500, height: 500, fit: 'cover' })
                      .webp()
                      .toBuffer();

                  const filename = uuidv4() + '.webp';

                  const fileMetadata = {
                      name: filename,
                      parents: [FOLDER_ID],
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

                  imageUrls.push(filename);
                  gdriveFileIds.push(response.data.id);
              } catch (error) {

                  return res.status(500).json({ error: 'Failed to upload new images' });
              }
          }
      }

      const product = await require('../commerce/dist/service.cjs').updateProductInventory(db, id, req.body, req.identity.id,
        files?.length ? { images: imageUrls, gdriveFileIds } : undefined, assetHash);
      res.json(product);
  } catch (error) {
      if (error.status) throw error;
      res.status(500).json({ error: 'Internal server error' });
  }
});




productRouter.get('/details/:productId', async (req, res) => {

  const { productId } = req.params;

  try {
    // Find the product by its product_id (custom field)
    const product = await Product.findOne({ product_id: productId, archivedAt: { $exists: false } }).populate('category');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find all products in the same category except the current product
    const relatedProducts = await Product.find({
      archivedAt: { $exists: false },
      category: product.category._id,
      product_id: { $ne: productId }, // Exclude the current product
    }).populate('category');

    res.status(200).json({
      product,
      relatedProducts,
    });
  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});





module.exports = productRouter;







