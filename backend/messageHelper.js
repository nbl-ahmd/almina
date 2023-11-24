var axios = require('axios');

function sendMessage(data) {
  var config = {
    method: 'post',
    url: `https://graph.facebook.com/v17.0/163562513510742/messages`,
    headers: {
      'Authorization': `Bearer EAAErqwBrM1sBO6RPpl1YF969JKeRuj2ClPJGP2fbpmvbjcKaUeYQvmZAWQIxJJPcRkvD1XcL5UlS43mpEzRWcAHeO0cmZBep97ZAvqOcCg5TVNJASxW16rVt4kUhonSajm9CFBZCQ4FIicSijeTQTff2sXzM5iNzUmUpBQ8Bcg3CJK9lRJtxwBn6ufZCZBuXUzZCjpzQzCgXIZCWY3p8KZAvnRz8E3jGFuAQmU1QZD`,
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