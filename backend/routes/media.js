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
