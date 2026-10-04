var express = require('express');
const { whatsappSender } = require("../integrations/whatsapp.cjs");
const whatsappRouter = express.Router();
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const storage = multer.memoryStorage();
const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));
const { driveMedia } = require('../integrations/drive.cjs');
const FOLDER_ID = '11wB-C-ZmixvTLZnrFVkRfokTQmBmLlmv';

whatsappRouter.post('/image', upload.single('image'), require('../security/uploads.cjs').validateImageUploads, async (req, res) => {
  const domain = require('../commerce/dist/service.cjs');
  domain.mediaMetadataInput('whatsappposters', req.body);
  if (!req.file) throw require('../security/boundary.cjs').fail(400, 'INVALID_REQUEST');
  const bytes = await sharp(req.file.buffer, { limitInputPixels: 20000000 }).rotate().jpeg().toBuffer();
  const filename = randomUUID() + '.jpeg';
  const asset = await driveMedia(req).upload(bytes, filename, FOLDER_ID);
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  await domain.createMediaMetadata(db, 'whatsappposters', req.body, req.identity.id, { image: filename, gdriveFileId: asset.fileId });
  req.app.locals.io?.emit('newPoster', { image: filename });
  res.status(201).json({ message: 'poster created successfully' });
});

const getDb = req => req.app.locals.getCommerceDb ? req.app.locals.getCommerceDb() : require('mongoose').connection.db;
whatsappRouter.get('/image', async (req, res) => {
  res.json(await require('../commerce/dist/service.cjs').retainedWhatsappList(await getDb(req), 'posters', req.query));
});
whatsappRouter.get('/image/:filename', async (req, res) => {
  const fileId = await require('../commerce/dist/service.cjs').retainedWhatsappPoster(await getDb(req), req.params.filename, req.query);
  const asset = await driveMedia(req).read(fileId);
  res.type(asset.contentType).send(asset.bytes);
});

whatsappRouter.delete('/image/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'whatsappposters', req.params.id, req.identity.id));
});

async function outbound(req, kind) {
  const domain = require('../commerce/dist/service.cjs');
  domain.whatsappOutboundInput(req.body, kind);
  const send = whatsappSender(req);
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  const result = await domain.sendWhatsapp(db, req.body, kind, req.identity.id, req.get('Idempotency-Key'), send);
  if (result.notification) req.app.locals.io?.emit(result.notification.name, result.notification.payload);
  return result;
}
whatsappRouter.post('/s', async (req, res) => {
  const result = await outbound(req, 'template');
  res.json({ status: 'success', recipient: result.recipient });
});
whatsappRouter.post('/text', async (req, res) => {
  await outbound(req, 'text');
  res.redirect('/catalog');
});
// Retain authenticated URLs with explicit retirement; demo routes never send messages or report fake success.
whatsappRouter.post('/sr', (_req, res) => res.status(410).json({ error: 'Retired demo endpoint' }));
whatsappRouter.post('/', (_req, res) => res.status(410).json({ error: 'Retired demo endpoint' }));

whatsappRouter.get('/recipients', async (req, res) => {
  res.json(await require('../commerce/dist/service.cjs').retainedWhatsappList(await getDb(req), 'recipients', req.query));
});
whatsappRouter.get('/reports', async (req, res) => {
  res.json(await require('../commerce/dist/service.cjs').retainedWhatsappList(await getDb(req), 'reports', req.query));
});
whatsappRouter.get('/messages/:recipient', async (req, res) => {
  res.json(await require('../commerce/dist/service.cjs').retainedWhatsappConversation(await getDb(req), req.params.recipient, req.query));
});

whatsappRouter.post('/webhook', async (req, res) => {
  const db = req.app.locals.getWebhookDb ? await req.app.locals.getWebhookDb() : require('mongoose').connection.db;
  const event = await require('../commerce/dist/service.cjs').processWhatsappEvent(db, req.whatsappReceiptId);
  // Best-effort realtime happens only after durable effects commit; admin reads reconcile after disconnects.
  if (event) req.app.locals.io?.emit(event.name, event.payload);
  res.sendStatus(200);
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
whatsappRouter.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (Object.keys(req.query).some(key => !['hub.mode', 'hub.verify_token', 'hub.challenge'].includes(key))
    || typeof mode !== 'string' || typeof token !== 'string' || token.length > 256
    || typeof challenge !== 'string' || !challenge.length || challenge.length > 256) return res.sendStatus(400);

  // Check if a token and mode were sent
  if (mode && token && verify_token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request

      res.type('text/plain').status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else { res.sendStatus(403); }
});

module.exports = whatsappRouter;
