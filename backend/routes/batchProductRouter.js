const express = require('express');
const batchProductRouter = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 5, parts: 6 } });
batchProductRouter.post('/', require('../security/boundary.cjs').wrap(async (req, _res, next) => {
  const db = await req.app.locals.getCommerceDb();
  if (!db) throw require('../security/boundary.cjs').fail(503, 'SERVICE_UNAVAILABLE');
  if (req.app.locals.recoveryAllowed || await db.collection('recovery_bootstrap').findOne({ _id: 'empty-database-v1' })) {
    throw require('../security/boundary.cjs').fail(409, 'RECOVERY_IMPORT_REQUIRED');
  }
  next();
}), upload.single('file'), async (req, res) => {
  if (!req.file) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const rows = require('../commerce/dist/service.cjs').retainedCatalogCsv(req.file.buffer);
  const db = await req.app.locals.getCommerceDb();
  res.json(await require('../commerce/dist/service.cjs').createLegacyCatalogBatch(db, rows, req.identity.id));
});

module.exports = batchProductRouter;
