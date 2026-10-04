const express = require('express');
const batchProductRouter = express.Router();
const csv = require('csvtojson');
const path = require('path');
const multer = require('multer');
const uploadDir = path.join(__dirname, '..', 'public/csv');
const upload = multer({ dest: uploadDir, limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 5, parts: 6 } });
batchProductRouter.post('/', require('../security/boundary.cjs').wrap(async (req, _res, next) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  if (!db) throw require('../security/boundary.cjs').fail(503, 'SERVICE_UNAVAILABLE');
  if (req.app.locals.recoveryAllowed || await db.collection('recovery_bootstrap').findOne({ _id: 'empty-database-v1' })) {
    throw require('../security/boundary.cjs').fail(409, 'RECOVERY_IMPORT_REQUIRED');
  }
  next();
}), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
    const rows = await csv().fromFile(req.file.path);
    const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
    res.json(await require('../commerce/dist/service.cjs').createLegacyCatalogBatch(db, rows, req.identity.id));
  } finally {
    // Only the request's bounded temporary CSV is removed; media is never deleted.
    if (req.file) await require('node:fs/promises').unlink(req.file.path).catch(() => undefined);
  }
});

module.exports = batchProductRouter;
