var axios = require('axios');

function sendMessage(data) {
  var config = {
    method: 'post',
    url: `https://graph.facebook.com/v17.0/185798894609701/messages`,
    headers: {
      'Authorization': `Bearer EAAErqwBrM1sBOwnBrNUfaXqurNzxa8nvaPMKHPCQM6uU4FHYiohVoXseTHQqTZC9tOZCpQfgwyjYVL81ZBk4FxoPL7lv9zniMjBiEZAcXixnmraInJlqA02yZCVIxIy2V5S04fVeCIq0U5tZAaYYQqiibtbB8DZAZCSrZCfVTN8q4JhygJmrJUv6XSTfZBjB0iH27h7slFi2lq2BY2QwZAp`,
      'Content-Type': 'application/json'
    },
    data: data
  };

  return axios(config)
}

function getTextMessageInput(recipient, text) {
  return JSON.stringify({
    "messaging_product": "whatsapp",
    "preview_url": false,
    "recipient_type": "individual",
    "to": recipient,
    "type": "text",
    "text": {
        "body": text
    }
  });
}

function getTemplatedMessageInput(recipient, template, link) {
  return JSON.stringify({
    "messaging_product": "whatsapp",
    "to": recipient,
    "type": "template",
    "template": {
      "name": template,
      "language": {
        "code": "en_US"
      },
     "components": [
        {
          "type": "header",
          "parameters": [
            {
              "type": "image",
              "image": {
                "link": link
              }
            }
          ]
        }
        
      ]
    }
  }
  );
}

module.exports = {
  sendMessage: sendMessage,
  getTextMessageInput: getTextMessageInput,
  getTemplatedMessageInput: getTemplatedMessageInput
};