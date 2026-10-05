const router = require('express').Router();
const { setStoreStatus, storeStatus } = require('../commerce/dist/service.cjs');
const { fail } = require('../security/boundary.cjs');
const getDb = req => req.app.locals.getCommerceDb();
const noQuery = req => { if (Object.keys(req.query).length) throw fail(400, 'INVALID_REQUEST'); };
// The retained boundary independently authorizes before this adapter.
router.put('/status', async (req, res) => {
  noQuery(req); await setStoreStatus(await getDb(req), req.body);
  res.json({ message: 'Store status updated successfully' });
});
router.post('/cart/add', async (req, res) => {
  noQuery(req);
  if (await storeStatus(await getDb(req)) !== 'open') throw fail(403, 'FORBIDDEN');
  res.status(204).end();
});
router.get('/status', async (req, res) => {
  noQuery(req); res.json({ status: await storeStatus(await getDb(req)) });
});
module.exports = router;
