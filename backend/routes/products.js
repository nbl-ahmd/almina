const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const productRouter = express.Router();
const storage = multer.memoryStorage();
const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));

const { driveMedia } = require('../integrations/drive.cjs');
const FOLDER_ID = '1I8HpwJ_iaOx_r7ZsOOETYcQbpMFpLUH6';

productRouter.post('/', upload.array('images', 5), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.catalogCreationInput(req.body);
  const db = await catalogDb(req);
  await domain.catalogUploadTarget(db, 'categories', req.body.category, true);
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
              const filename = randomUUID() + '.webp';

              // Save to Google Drive
              const asset = await driveMedia(req).upload(croppedImage, filename, FOLDER_ID);

              // Store URLs and Google Drive IDs
              imageUrls.push(filename);
              gdriveFileIds.push(asset.fileId);
          } catch (error) {

              return res.status(500).json({ error: 'Failed to upload images' });
          }
      }
  }

  const product = await domain.createCatalogProduct(db, req.body, req.identity.id, { images: imageUrls, gdriveFileIds });
  res.status(201).json({ message: 'Product created successfully', product });
});

productRouter.get('/images/:filename', async (req, res) => {
  const fileId = await catalogDomain().retainedCatalogAsset(await catalogDb(req), 'products', req.params.filename, req.query);
  const asset = await driveMedia(req).read(fileId);
  res.type(asset.contentType).send(asset.bytes);
});

const catalogDomain = () => require('../commerce/dist/service.cjs');
const catalogDb = req => req.app.locals.getCommerceDb();
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
productRouter.get('/needs-action', async (req, res) => {
  res.json(await catalogDomain().catalogueNeedsAction(await catalogDb(req), req.query));
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
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'products', req.params.id, req.identity.id));
});

productRouter.put('/publish/:productId', async (req, res) => {
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').toggleCatalogVisibility(db, 'products', req.params.productId, req.identity.id));
});

productRouter.put('/:id', upload.array('images', 5), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  require('../commerce/dist/service.cjs').inventoryInput(req.body);
  const { id } = req.params;
  const files = req.files;

  try {
      const db = await req.app.locals.getCommerceDb();
      const assetHash = files?.length ? require('node:crypto').createHash('sha256').update(JSON.stringify(files.map(file => require('node:crypto').createHash('sha256').update(file.buffer).digest('hex')))).digest('hex') : undefined;
      const replay = await require('../commerce/dist/service.cjs').replayProductMutation(db, id, req.body, req.identity.id, assetHash);
      if (replay) return res.json(replay);
      const prevProduct = await catalogDomain().catalogUploadTarget(db, 'products', id);

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

                  const filename = randomUUID() + '.webp';

                  const asset = await driveMedia(req).upload(croppedImage, filename, FOLDER_ID);

                  imageUrls.push(filename);
                  gdriveFileIds.push(asset.fileId);
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

