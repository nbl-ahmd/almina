const router = require('express').Router();
const mongoose = require('mongoose');
const { previewRecoveryCatalog, commitRecoveryCatalog, recoveryTemplate } = require('../commerce/dist/service.cjs');
const { fail } = require('../security/boundary.cjs');
const getDb = req => req.app.locals.getCommerceDb ? req.app.locals.getCommerceDb() : mongoose.connection.db;
function configured(req) {
  if (!req.app.locals.recoveryAllowed || !req.app.locals.recoveryCloudName) throw fail(503, 'SERVICE_UNAVAILABLE');
  if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST');
}
router.get('/template', (req, res) => {
  configured(req);
  res.type('text/csv').attachment('recovery-products.csv').send(recoveryTemplate);
});
router.post('/preview', async (req, res) => {
  configured(req);
  res.json(await previewRecoveryCatalog(await getDb(req), req.body, req.app.locals.recoveryCloudName, req.identity.id));
});
router.post('/commit', async (req, res) => {
  configured(req);
  const result = await commitRecoveryCatalog(await getDb(req), req.body, req.app.locals.recoveryCloudName, req.identity.id);
  res.status(result.replayed ? 200 : 201).json(result);
});
module.exports = router;
