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
// Direct uploads: the browser sends each photo straight to Cloudinary with a server-signed ticket, so no image bytes pass through this process.
router.post('/products/:id/sign', async (req, res) => {
  if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
  const config = req.app.locals.cloudinaryUploads;
  if (!config) throw fail(503, 'SERVICE_UNAVAILABLE');
  const { ObjectId } = require('mongodb');
  if (!ObjectId.isValid(req.params.id)) throw fail(400, 'INVALID_REQUEST');
  const db = await req.app.locals.getCommerceDb();
  const product = await db.collection('products').findOne({ _id: new ObjectId(req.params.id) }, { projection: { archivedAt: 1 } });
  if (!product || product.archivedAt) throw fail(404, 'NOT_FOUND');
  res.json(require('../commerce/dist/service.cjs').directUploadTickets(config, req.body));
});
router.post('/products/:id/commit', async (req, res) => {
  if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
  if (!req.app.locals.cloudinaryUploads) throw fail(503, 'SERVICE_UNAVAILABLE');
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').commitDirectCloudinaryImages(db, req.params.id, req.identity.id, req.body,
    req.app.locals.cloudinaryUploads, req.app.locals.mediaTransport));
});
router.post('/marketing', upload.single('image'), validateImageUploads, async (req,res)=>{
  if(!req.file||Object.keys(req.query).length)throw fail(400,'INVALID_REQUEST');
  if(!req.app.locals.cloudinaryUploads)throw fail(503,'SERVICE_UNAVAILABLE');
  const domain=require('../commerce/dist/service.cjs'),db=await req.app.locals.getCommerceDb();
  const id=require('node:crypto').randomUUID(),bytes=await prepareProductImage(req.file.buffer);
  const image=await domain.signedRasterUpload(req.app.locals.cloudinaryUploads,bytes,`almina/products/${id}-0`,AbortSignal.timeout(15000),req.app.locals.mediaTransport);
  await db.collection('marketing_assets').insertOne({_id:id,image,actor:req.identity.id,createdAt:new Date()});
  res.json({image});
});
module.exports = router;
