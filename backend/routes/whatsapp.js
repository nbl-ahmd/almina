var express = require('express');
var request = require("request");
var bodyParser = require('body-parser');
require('dotenv').config();
var axios = require('axios');
const { sendMessage, getTemplatedMessageInput, getTextMessageInput } = require("../messageHelper");
const whatsappRouter = express.Router();
const Whatsapp = require('../models/Whatsapp');


 whatsappRouter.use(bodyParser.json());

whatsappRouter.post('/s', function(req, res, next) {
 
    const recipient = Object.keys(req.body)[0];
  var data = getTemplatedMessageInput(recipient);
  
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
  const recipient = req.body.recipient;
  const text = req.body.text;
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