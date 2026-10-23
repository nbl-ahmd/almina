const router = require('express').Router();
const multer = require('multer');
const { prepareProductImage } = require('../security/product-image.cjs');
const { imageUploadOptions, validateImageUploads } = require('../security/uploads.cjs');
const { fail } = require('../security/boundary.cjs');
const upload = multer(imageUploadOptions(multer.memoryStorage()));
router.post('/products/:id', upload.array('images', 5), validateImageUploads, async (req, res) => {
  if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
  if (!req.app.locals.cloudinaryUploads) throw fail(503, 'SERVICE_UNAVAILABLE');
  const db = await req.app.locals.getCommerceDb();
  const files = await Promise.all(req.files.map(file => prepareProductImage(file.buffer)));
  res.json(await require('../commerce/dist/service.cjs').replaceCloudinaryImages(db, req.params.id, req.identity.id, req.body, files,
    req.app.locals.cloudinaryUploads, req.app.locals.mediaTransport));
});
module.exports = router;
