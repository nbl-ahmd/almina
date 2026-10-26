const router = require('express').Router();
const domain = () => require('../commerce/dist/service.cjs');
const emptyQuery = req => { if (Object.keys(req.query).length) throw new (domain().HttpError)(400, 'INVALID_REQUEST'); };
router.use((req, res, next) => {
  if (req.app.locals.imageReviewEnabled) return next();
  if (req.method === 'GET' && req.path === '/') {
    domain().imageReviewListInput(req.query);
    return res.json({ enabled: false, items: [], nextAfter: null, counts: { pending: 0, held: 0, approved: 0, rejected: 0, imported: 0 } });
  }
  throw new (domain().HttpError)(503, 'SERVICE_UNAVAILABLE');
});
router.get('/', async (req, res) => res.json(await domain().listImageReviews(await req.app.locals.getCommerceDb(), req.query, req.identity.id)));
router.get('/export', async (req, res) => res.json(await domain().exportImageReviewApprovals(await req.app.locals.getCommerceDb(), req.query, req.identity.id)));
router.get('/publication', async (req, res) => { emptyQuery(req); res.json(await domain().getImagePublication(await req.app.locals.getCommerceDb(), req.identity.id)); });
router.post('/publication/start', async (req, res) => { emptyQuery(req); res.json(await domain().startImagePublication(await req.app.locals.getCommerceDb(), req.body, req.identity.id)); });
router.post('/publication/resume', async (req, res) => { emptyQuery(req); res.json(await domain().changeImagePublication(await req.app.locals.getCommerceDb(), req.body, req.identity.id, 'resume')); });
router.post('/publication/pause', async (req, res) => { emptyQuery(req); res.json(await domain().changeImagePublication(await req.app.locals.getCommerceDb(), req.body, req.identity.id, 'pause')); });
router.get('/uploads/:uploadId', async (req, res) => { emptyQuery(req); res.json(await domain().imageReviewUploadProgress(await req.app.locals.getCommerceDb(), req.params.uploadId, req.identity.id)); });
router.get('/:reviewId', async (req, res) => { emptyQuery(req); res.json(await domain().getImageReview(await req.app.locals.getCommerceDb(), req.params.reviewId, req.identity.id)); });
router.post('/select', async (req, res) => {
  emptyQuery(req);
  const parsed = domain().imageReviewSelectionInput(req.body);
  res.json(await domain().getImageReview(await req.app.locals.getCommerceDb(), parsed.itemId, req.identity.id, parsed.productId));
});
const handle = fn => async (req, res) => {
    emptyQuery(req);
    res.json(await domain()[fn](await req.app.locals.getCommerceDb(), req.body, req.identity.id,
      req.app.locals.cloudinaryUploads?.cloudName ?? req.app.locals.recoveryCloudName, req.app.locals.mediaTransport));
};
router.post('/stage', handle('stageImageReview'));
router.post('/decide', handle('decideImageReview'));
router.post('/preview', handle('previewImageReviewImport'));
router.post('/import', handle('importImageReviewApprovals'));
router.post('/publish', handle('publishImageReviewApprovals'));
module.exports = router;
