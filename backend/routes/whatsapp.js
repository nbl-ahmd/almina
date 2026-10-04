var express = require('express');
const { sendMessage, getTemplatedMessageInput, getTextMessageInput } = require("../messageHelper");
const whatsappRouter = express.Router();
const Whatsapp = require('../models/Whatsapp');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const WhatsappPoster = require('../models/WhatsappPoster');
const sharp = require('sharp');
const storage = multer.memoryStorage();
const upload = multer(require('../security/uploads.cjs').imageUploadOptions(storage));
const whatsappBulkReportModel = require('../models/whatsappBulkReport');
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

  whatsappRouter.get('/image', (req, res) => {
  const page = require('../security/admin-pagination.cjs').adminPagination(req.query);
  WhatsappPoster.find({ archivedAt: { $exists: false } }).sort({ _id: -1 }).skip(page?.offset ?? 0).limit(page?.limit ?? 0)
    .then(poster => {
      res.status(200).json(poster);
    })
    .catch(error => {

      res.status(500).json({ error: 'Internal server error' });
    });
});

whatsappRouter.get('/image/:filename', async (req, res) => {
  const { filename } = req.params;

  try {
    // Retrieve the poster by filename from the database
    const poster = await WhatsappPoster.findOne({ image: filename });
    if (!poster) {
      return res.status(404).json({ error: 'poster not found' });
    }

    // Retrieve the image file from Google Drive
    const asset = await driveMedia(req).read(poster.gdriveFileId);
    res.type(asset.contentType).send(asset.bytes);
  } catch (error) {

    res.status(500).json({ error: 'Internal server error' });
  }
});

whatsappRouter.delete('/image/:id', async (req, res) => {
  const db = req.app.locals.getCommerceDb ? await req.app.locals.getCommerceDb() : require('mongoose').connection.db;
  res.json(await require('../commerce/dist/service.cjs').archiveEntity(db, 'whatsappposters', req.params.id, req.identity.id));
});












whatsappRouter.post('/s', function(req, res, next) {
  require('../security/admin-input.cjs').messageInput(req.body, true);
  const { recipient, template, link } = req.body;
  var data = getTemplatedMessageInput(recipient, template, link);

  sendMessage(data)
  .then(function (response) {
    res.status(200).json({ status: "success", recipient });
    return;
  })
  .catch(function (error) {
    res.status(500).json({ status: "fail", recipient });

    return;
  });
});

whatsappRouter.post('/sr', function(req, res, next) {

    const recipient = Object.keys(req.body)[0];
    res.status(201).json({ message: 'product created successfully' });

});

whatsappRouter.post('/', function(req, res, next) {
  var data = getTextMessageInput(process.env.RECIPIENT_WAID, 'Welcome to the Movie Ticket Demo App for Node.js!');

  sendMessage(data)
    .then(function (response) {
      res.redirect('/catalog');
      return;
    })
    .catch(function (error) {

      return;
    });
});


whatsappRouter.post('/text', function(req, res, next) {
  require('../security/admin-input.cjs').messageInput(req.body);
  const { recipient, name, text } = req.body;


    var data = getTextMessageInput(recipient, text);

    sendMessage(data)
      .then(function (response) {
        res.redirect('/catalog');
        return;
      })
      .catch(function (error) {

        return;
      });
      saveAdminMessage(req, recipient, name, text)
  });



  // Express route to fetch all recipients
  whatsappRouter.get('/recipients', async (req, res) => {
  try {
    // Fetch all distinct usernames from the database
    const page = require('../security/admin-pagination.cjs').adminPagination(req.query);
    const recipients = await Whatsapp.find({}).select('from name promotionStatus').sort({ _id: -1 }).skip(page?.offset ?? 0).limit(page?.limit ?? 0);
    res.json(recipients);
  } catch (error) {

    res.status(500).json({ error: 'Internal Server Error' });
  }
});
  whatsappRouter.get('/reports', async (req, res) => {
    const page = require('../security/admin-pagination.cjs').adminPagination(req.query) ?? { limit: 25, offset: 0 };
    const reports = await whatsappBulkReportModel.find().select({ broadcast: { $slice: -100 } }).sort({ _id: -1 }).skip(page.offset).limit(page.limit);
    res.json(reports);
  });
  whatsappRouter.get('/messages/:recipient', async (req, res) => {
    const recipient = req.params.recipient;

    try {
      // Find the conversation for the given recipient
      const conversation = await Whatsapp.findOne({ from: recipient });
      if (conversation) {
        // Send the messages to the client
        res.json(conversation);
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }
    } catch (error) {

      res.status(500).json({ error: 'Internal Server Error' });
    }



  });


const saveAdminMessage = async (req, from, name, msg_body)=>{
  try {
    // Check if the conversation exists
    const conversation = await Whatsapp.findOne({ from: from });

    if (conversation) {


      // Conversation exists, append the new message to the existing conversation
      conversation.messages.push({
        content: msg_body,
        timestamp: new Date(),
        sender: 'admin',
      });
      await conversation.save(); // Returns a promise, no callback needed


      // Emit the new message to all connected clients
  req.app.locals.io.emit('newMessage', {
    recipient: from,
    message: { content: msg_body, sender: 'admin' },
  });
    } else {
      // Conversation doesn't exist, create a new conversation
      const newConversation = new Whatsapp({
        from: from,
        name: name,
        messages: [
          {
            content: msg_body,
            timestamp: new Date(),
            sender: 'admin',
          },
        ],
      });
      await newConversation.save();

        // Emit the new message to all connected clients
  req.app.locals.io.emit('newMessage', {
    recipient: from,
    message: { content: msg_body, sender: 'admin' },
  });
    }
  } catch (error) {

  }

}

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
