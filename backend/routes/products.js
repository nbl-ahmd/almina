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


const catalogDomain = () => require('../commerce/dist/service.cjs');
const catalogDb = req => req.app.locals.getCommerceDb ? req.app.locals.getCommerceDb() : require('mongoose').connection.db;
const staffRead = req => ['admin', 'user'].includes(req.identity?.role);
productRouter.get('/', async (req, res) => {
  const domain = catalogDomain();
  const query = domain.retainedCatalogQuery(req.query, 'products');
  res.json(await domain.retainedProductList(await catalogDb(req), query, staffRead(req)));
});
productRouter.get('/search', async (req, res) => {
  const domain = catalogDomain();
  const query = domain.retainedCatalogQuery(req.query, 'search');
  res.json(await domain.retainedProductList(await catalogDb(req), query, staffRead(req)));
});
productRouter.get('/:id', async (req, res) => {
  if (Object.keys(req.query).length) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  res.json(await catalogDomain().retainedProductDetail(await catalogDb(req), { id: req.params.id }, staffRead(req)));
});
productRouter.get('/category/:categoryId', async (req, res) => {
  if (req.query.filter !== undefined) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const domain = catalogDomain();
  const query = domain.retainedCatalogQuery({ ...req.query, filter: JSON.stringify({ category: req.params.categoryId }) }, 'products');
  res.json(await domain.retainedProductList(await catalogDb(req), query, staffRead(req)));
});

productRouter.delete('/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'products', req.params.id, req.identity.id));
});


productRouter.put('/publish/:productId', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').toggleCatalogVisibility(db, 'products', req.params.productId, req.identity.id));
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
  if (Object.keys(req.query).length) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  res.json(await catalogDomain().retainedProductDetail(await catalogDb(req), { productId: req.params.productId }, staffRead(req)));
});

module.exports = productRouter;






