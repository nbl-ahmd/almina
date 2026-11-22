const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const router = express.Router();
const { imageUploadOptions, validateImageUploads } = require('../security/uploads.cjs');
const { fail } = require('../security/boundary.cjs');
const options = imageUploadOptions(multer.memoryStorage());
const upload = multer({ ...options, limits: { ...options.limits, files: 2 } });
const { driveMedia } = require('../integrations/drive.cjs');
const FOLDER_ID = '10jn65wQMomVYMAAy4TuH8iVgiFa8IhxJ';
const getDb = req => req.app.locals.getCommerceDb();
const prepareArtwork = buffer => sharp(buffer, { limitInputPixels: 20000000 }).rotate()
  .resize({ width: 2400, height: 2000, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 86 }).toBuffer();

router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]),
  validateImageUploads, async (req, res) => {
    const domain = require('../commerce/dist/service.cjs');
    domain.mediaMetadataInput('banners', req.body);
    const desktop = req.files?.image?.[0];
    const mobile = req.files?.mobileImage?.[0];
    if (!desktop) throw fail(400, 'INVALID_REQUEST');

    const db = await getDb(req);
    const id = randomUUID();
    const config = req.app.locals.cloudinaryUploads;
    if (config) {
      const files = [{ file: desktop, size: 'desktop' }, ...(mobile ? [{ file: mobile, size: 'mobile' }] : [])];
      // Validate and prepare both images before making any provider request.
      const artwork = await Promise.all(files.map(async ({ file, size }) => ({ bytes: await prepareArtwork(file.buffer), size })));
      const signal = AbortSignal.timeout(15000);
      const urls = await Promise.all(artwork.map(({ bytes, size }) => domain.signedRasterUpload(
        config, bytes, `almina/banners/${id}-${size}`, signal, req.app.locals.mediaTransport,
      )));
      await domain.createBannerWithArtwork(db, req.body, req.identity.id, `banner-${id}.webp`, urls, config.cloudName);
    } else {
      if (mobile) throw fail(503, 'SERVICE_UNAVAILABLE');
      const bytes = await prepareArtwork(desktop.buffer);
      const filename = id + '.webp';
      const asset = await driveMedia(req).upload(bytes, filename, FOLDER_ID);
      await domain.createMediaMetadata(db, 'banners', req.body, req.identity.id, { image: filename, gdriveFileId: asset.fileId });
    }
    res.status(201).json({ message: 'Banner created successfully' });
  });

router.get('/', async (req, res) => {
  res.json(await require('../commerce/dist/service.cjs').retainedBannerList(await getDb(req), req.query));
});
router.get('/images/:filename', async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  const db = await getDb(req);
  const cloudName = req.app.locals.cloudinaryUploads?.cloudName ?? req.app.locals.recoveryCloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
  const location = await domain.retainedBannerArtwork(db, req.params.filename, req.query, cloudName);
  if (location) { res.redirect(location); return; }
  const fileId = await domain.retainedCatalogAsset(db, 'banners', req.params.filename, req.query);
  const asset = await driveMedia(req).read(fileId);
  res.type(asset.contentType).send(asset.bytes);
});

router.delete('/:id', async (req, res) => {
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'banners', req.params.id, req.identity.id));
});

module.exports = router;
