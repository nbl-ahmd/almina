const router = require('express').Router();
const domain = () => require('../commerce/dist/service.cjs');
const handle = name => async (req,res) => res.json(await domain()[name](await req.app.locals.getCommerceDb(),req.body,req.identity.id,req.app.locals.cloudinaryUploads?.cloudName ?? req.app.locals.recoveryCloudName));
router.get('/template', (_req,res)=>res.type('text/csv').attachment('catalog-import.csv').send(domain().catalogImportTemplate));
router.post('/preview',handle('previewCatalogImport'));
router.post('/commit',handle('commitCatalogImport'));
router.post('/report',handle('catalogImportReport'));
router.post('/rollback',handle('rollbackCatalogImport'));
module.exports = router;
