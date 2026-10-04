const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));
const { driveMedia } = require('../integrations/drive.cjs');
const FOLDER_ID = '10jn65wQMomVYMAAy4TuH8iVgiFa8IhxJ';

router.post('/', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.mediaMetadataInput('banners', req.body);
  if (!req.file) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const bytes = await sharp(req.file.buffer, { limitInputPixels: 20000000 }).rotate().webp().toBuffer();
  const filename = randomUUID() + '.webp';
  const asset = await driveMedia(req).upload(bytes, filename, FOLDER_ID);
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  await domain.createMediaMetadata(db, 'banners', req.body, req.identity.id, { image: filename, gdriveFileId: asset.fileId });
  res.status(201).json({ message: 'Banner created successfully' });
});

const getDb = req => req.app.locals.getCommerceDb ? req.app.locals.getCommerceDb() : require('mongoose').connection.db;
router.get('/', async (req, res) => {
  res.json(await require('../commerce/dist/service.cjs').retainedBannerList(await getDb(req), req.query));
});
router.get('/images/:filename', async (req, res) => {
  const fileId = await require('../commerce/dist/service.cjs').retainedCatalogAsset(await getDb(req), 'banners', req.params.filename, req.query);
  const asset = await driveMedia(req).read(fileId);
  res.type(asset.contentType).send(asset.bytes);
});

router.delete('/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'banners', req.params.id, req.identity.id));
});

module.exports = router;
