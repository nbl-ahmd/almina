var express = require('express');
var request = require("request");
var bodyParser = require('body-parser');
require('dotenv').config();
var axios = require('axios');
const { sendMessage, getTemplatedMessageInput, getTextMessageInput } = require("../messageHelper");
const whatsappRouter = express.Router();
const Whatsapp = require('../models/Whatsapp');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const WhatsappPoster = require('../models/WhatsappPoster');
const sharp = require('sharp');
const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'public/WhatsappPoster');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fs = require('fs');
//google
const { Readable } = require('stream');
const { google } = require('googleapis');
// Load the JSON key file
const keyFile = path.join(__dirname, '/cred.json');

// Create a new instance of the drive API
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Replace 'FOLDER_ID' with the ID of your target folder in Google Drive
const FOLDER_ID = '11wB-C-ZmixvTLZnrFVkRfokTQmBmLlmv';

whatsappRouter.post('/image', upload.single('image'), async (req, res) => {
  const image = req.file;
  const croppedImage = await sharp(image.buffer)
    .toBuffer();
  const resizedFilename = uuidv4() + '.jpg';
  // save the resized image to the directory
 
  const poster = new WhatsappPoster({ image: resizedFilename }); 
  
   // Upload the file to Google Drive
   try {
    const fileMetadata = {
      name: resizedFilename,
      parents: [FOLDER_ID], // Set the parent folder ID
    };

    const media = {
      mimeType: 'image/jpg',
      body: Readable.from(croppedImage),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    poster.gdriveFileId = response.data.id; // Save the Google Drive file ID to the poster document

    // Save the poster document to the database
    await poster.save();

    res.status(201).json({ message: 'poster created successfully' });
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }

  req.app.locals.io.emit('newPoster', {
    image: resizedFilename,
  });
});
  // save the resized filename to the database

  whatsappRouter.get('/image', (req, res) => {
  WhatsappPoster.find()
    .then(poster => {
      res.status(200).json(poster);
    })
    .catch(error => {
      console.log(error);
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
    const response = await drive.files.get(
      { fileId: poster.gdriveFileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Set the appropriate Content-Type header for the image
    res.set('Content-Type', 'image/webp');

    // Pipe the image stream from Google Drive to the response stream
    response.data.pipe(res);
  } catch (error) {
    console.error('Error retrieving image from Google Drive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

whatsappRouter.delete('/image/:id', async (req, res) => {
  const posterId = req.params.id;

  try {
    // Find the poster by ID
    const poster = await WhatsappPoster.findById(posterId);
    if (!poster) {
      return res.status(404).json({ success: false, message: 'poster not found!' });
    }

    // Delete the poster from the database
    await WhatsappPoster.findByIdAndRemove(posterId);

    // If applicable, delete the image file from Google Drive
    if (poster.gdriveFileId) {
      await drive.files.delete({ fileId: poster.gdriveFileId });
    }

    // Delete the image file from the server's file system
    fs.unlink(path.join(uploadDir, poster.image), (error) => {
      if (error) {
        console.log('Error deleting image file:', error);
      }
    });

    return res.status(200).json({ success: true, message: 'The poster and image are deleted!' });
  } catch (error) {
    console.error('Error deleting poster:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});












 whatsappRouter.use(bodyParser.json());

whatsappRouter.post('/s', function(req, res, next) {
  const { recipient, template, link } = req.body;
  var data = getTemplatedMessageInput(recipient, template, link);
  
  sendMessage(data)
  .then(function (response) {
    res.status(200).json("success");
    return;
  })
  .catch(function (error) {
    res.status(500).json("fail");
    console.log(error);
    return;
  });
});

whatsappRouter.post('/sr', function(req, res, next) {
 
    const recipient = Object.keys(req.body)[0];
    res.status(201).json({ message: 'product created successfully' });
   console.log(recipient);
});
 
whatsappRouter.post('/', function(req, res, next) {
  var data = getTextMessageInput(process.env.RECIPIENT_WAID, 'Welcome to the Movie Ticket Demo App for Node.js!');
  
  sendMessage(data)
    .then(function (response) {
      res.redirect('/catalog');
      return;
    })
    .catch(function (error) {
      console.log(error);
      return;
    });
});


whatsappRouter.post('/text', function(req, res, next) {
  const { recipient, name, text } = req.body;
  console.log(recipient);
  console.log(text);
    var data = getTextMessageInput(recipient, text);
    
    sendMessage(data)
      .then(function (response) {
        res.redirect('/catalog');
        return;
      })
      .catch(function (error) {
        console.log(error);
        return;
      });
      saveAdminMessage(req, recipient, name, text)
  });



  // Express route to fetch all recipients
  whatsappRouter.get('/recipients', async (req, res) => {
  try {
    // Fetch all distinct usernames from the database
    const recipients = await Whatsapp.find({});
    res.json(recipients);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
    

    
  });


const saveAdminMessage = async (req, from, name, msg_body)=>{
  try {
    // Check if the conversation exists
    const conversation = await Whatsapp.findOne({ from: from });

    if (conversation) {
      console.log("old");
      console.log(conversation);
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
    console.error('Error handling conversation:', error);
  }

}

  /*
 * Starter Project for WhatsApp Echo Bot Tutorial
 *
 * Remix this as the starting point for following the WhatsApp Echo Bot tutorial
 *
 */

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.ACCESS_TOKEN;

// Accepts POST requests at /webhook endpoint
whatsappRouter.post("/webhook",async (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the Incoming webhook message
  console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      let name = req.body.entry[0].changes[0].value.contacts[0].profile.name; // extract the name from the webhook payload
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload


      try {
        // Check if the conversation exists
        const conversation = await Whatsapp.findOne({ from: from });

        if (conversation) {
          console.log("old");
          console.log(conversation);
          // Conversation exists, append the new message to the existing conversation
          conversation.messages.push({
            content: msg_body,
            timestamp: new Date(),
            sender: 'user',
          });
          await conversation.save(); // Returns a promise, no callback needed
          

          // Emit the new message to all connected clients
      req.app.locals.io.emit('newMessage', {
        recipient: from,
        message: { content: msg_body, sender: 'user' },
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
                sender: 'user',
              },
            ],
          });
          await newConversation.save();
          
            // Emit the new message to all connected clients
      req.app.locals.io.emit('newMessage', {
        recipient: from,
        message: { content: msg_body, sender: 'user' },
      });
        }
      } catch (error) {
        console.error('Error handling conversation:', error);
      }



      // axios({
      //   method: "POST", // Required, HTTP method, a string, e.g. POST, GET
      //   url:
      //     "https://graph.facebook.com/v17.0/" +
      //     phone_number_id +
      //     "/messages?access_token=" +
      //     token,
      //   data: {
      //     messaging_product: "whatsapp",
      //     to: from,
      //     text: { body: "Ack: " + msg_body },
      //   },
      //   headers: { "Content-Type": "application/json" },
      // });
    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
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

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});






module.exports = whatsappRouter;