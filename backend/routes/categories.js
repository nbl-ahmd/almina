const Category = require('../models/Category');
const express = require('express');
const categoryRouter = express.Router();
const multer = require('multer');
const path = require('path');
const sharp= require('sharp')
const { randomUUID } = require('node:crypto');
// Generate a random color
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
const FOLDER_ID = '1EFfxTRU7EamU46cCl-NXrSnMz7H-Ivh4';


const storage = multer.memoryStorage();

  const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));
const fs = require('fs');


categoryRouter.post('/', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.mediaMetadataInput('categories', req.body);
  let assets;
  if (req.file) {
    const filename = randomUUID() + '.webp';
    const bytes = await sharp(req.file.buffer, { limitInputPixels: 20000000 }).rotate().resize({ width: 500, height: 500, fit: 'cover' }).webp().toBuffer();
    const response = await drive.files.create({ resource: { name: filename, parents: [FOLDER_ID] },
      media: { mimeType: 'image/webp', body: Readable.from(bytes) }, fields: 'id' });
    assets = { image: filename, gdriveFileId: response.data.id };
  }
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  await domain.createMediaMetadata(db, 'categories', req.body, req.identity.id, assets);
  res.status(201).json({ message: 'category created successfully' });
});

const catalogDomain = () => require('../commerce/dist/service.cjs');
const catalogDb = req => req.app.locals.getCommerceDb ? req.app.locals.getCommerceDb() : require('mongoose').connection.db;
const staffRead = req => ['admin', 'user'].includes(req.identity?.role);
categoryRouter.get('/', async (req, res) => {
  const domain = catalogDomain();
  const query = domain.retainedCatalogQuery(req.query, 'categories');
  res.json(await domain.retainedCategoryList(await catalogDb(req), query, staffRead(req)));
});
categoryRouter.get('/:id', async (req, res) => {
  if (Object.keys(req.query).length) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  res.json(await catalogDomain().retainedCategoryDetail(await catalogDb(req), req.params.id, staffRead(req)));
});

  categoryRouter.get('/images/:filename', async(req, res) => {
    const { filename } = req.params;

    try {
      // Retrieve the category by filename from the database
      let category = await Category.findOne({ image: filename });
    if (!category) {
      const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
      const fileId = await require('../commerce/dist/service.cjs').resolveRetainedAsset(db, 'categories', filename);
      if (fileId) category = { image: filename, gdriveFileId: fileId };
    }
      if (!category) {
        return res.status(404).json({ error: 'category not found' });
      }

      // Retrieve the image file from Google Drive
      const response = await drive.files.get(
        { fileId: category.gdriveFileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Set the appropriate Content-Type header for the image
      res.set('Content-Type', 'image/webp');

      // Pipe the image stream from Google Drive to the response stream
      response.data.pipe(res);
    } catch (error) {

      res.status(500).json({ error: 'Internal server error' });
    }
  });





categoryRouter.put('/disable/:id', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').toggleCatalogVisibility(db, 'categories', req.params.id, req.identity.id));
});
categoryRouter.put('/:id', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
    const { id } = req.params;
    const updateFields = require('../commerce/dist/service.cjs').categoryMetadataInput(req.body, true);

    try {
      // Retrieve the previous image filename from the database
      const prevCategory = await Category.findById(id);
      if (!prevCategory) return res.status(404).json({ error: 'Category not found' });

      if (req.file) {
        const image = req.file;

       // Preserve the old asset. The maintained transaction records every reference.
        // Crop the image into a square
        const croppedImage = await sharp(image.buffer, { limitInputPixels: 20000000 })
    .resize({ width: 500, height: 500, fit: 'cover' })
    .webp()
    .toBuffer();

        // Generate a new filename for the resized image
        const filename = randomUUID() + '.webp'; //

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

      const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
      const category = await require('../commerce/dist/service.cjs').replaceCategory(db, id, updateFields, req.identity.id);

      if (!category) {
        return res.status(400).send('The category cannot be updated!');
      }

      res.send(category);
    } catch (error) {

      if (error.status) throw error;
      res.status(500).send('An error occurred while updating the category');
    }
  });


categoryRouter.delete('/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'categories', req.params.id, req.identity.id));
});


module.exports = categoryRouter;
