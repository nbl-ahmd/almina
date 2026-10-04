const express = require('express');
const categoryRouter = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { randomUUID } = require('node:crypto');
const { driveMedia } = require('../integrations/drive.cjs');
const FOLDER_ID = '1EFfxTRU7EamU46cCl-NXrSnMz7H-Ivh4';

const storage = multer.memoryStorage();

  const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));

categoryRouter.post('/', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.mediaMetadataInput('categories', req.body);
  let assets;
  if (req.file) {
    const filename = randomUUID() + '.webp';
    const bytes = await sharp(req.file.buffer, { limitInputPixels: 20000000 }).rotate().resize({ width: 500, height: 500, fit: 'cover' }).webp().toBuffer();
    const asset = await driveMedia(req).upload(bytes, filename, FOLDER_ID);
    assets = { image: filename, gdriveFileId: asset.fileId };
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

categoryRouter.get('/images/:filename', async (req, res) => {
  const fileId = await catalogDomain().retainedCatalogAsset(await catalogDb(req), 'categories', req.params.filename, req.query);
  const asset = await driveMedia(req).read(fileId);
  res.type(asset.contentType).send(asset.bytes);
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
      const db = await catalogDb(req);
      await catalogDomain().catalogUploadTarget(db, 'categories', id);

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
         const asset = await driveMedia(req).upload(croppedImage, filename, FOLDER_ID);

        updateFields.image = filename;
        updateFields.gdriveFileId = asset.fileId; // Save the updated Google Drive file ID to the product document

      }

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
