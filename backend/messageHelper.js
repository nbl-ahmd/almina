var axios = require('axios');

function sendMessage(data) {
  var config = {
    method: 'post',
    url: `https://graph.facebook.com/v17.0/185798894609701/messages`,
    headers: {
      'Authorization': `Bearer EAAErqwBrM1sBOwWpdnbMqBgGFPABDLcqZCESBxITR7ylN8WID1cuSqMAce4tyu2QS1vYgqm4VNDQS0fYKNuqCGq0vaVmoe8VZBysRQeEMfhwFFGMuInfHioVtOYMjyvP4IxHZBHY5CVky1R6MQ8euF0ZA0twNibwvq9G6yNyx8MZBkNF0ZBHfLVL2unPmaXjw9dHELRCUouMCnFERZAljdPy40fRnkWaLKjUpAZD`,
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