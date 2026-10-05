const router = require('express').Router();
router.get('/', async (req, res) => {
  if (Object.keys(req.query).length || Object.keys(req.body ?? {}).length) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const db = await req.app.locals.getCommerceDb();
  res.set('Cache-Control', 'no-store').json(await require('../commerce/dist/service.cjs').operationsSnapshot(db, req.app.locals.operationsMetrics));
});
module.exports = router;
