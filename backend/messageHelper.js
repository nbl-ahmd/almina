var axios = require('axios');

function sendMessage(data) {
  var config = {
    method: 'post',
    url: `https://graph.facebook.com/v17.0/163562513510742/messages`,
    headers: {
      'Authorization': `Bearer EAAErqwBrM1sBOZCPC49k1k7iKUpnv6umqLbqZCXkyuNZBbPZCK9FLsQOkpgqoF1m2cQhZBZBZBVa8nzf4egtLQoQqb1fEwgRZCAvTrD57E0RF1vZAInzIvAEmBZBE6kBiuqLfeVwh8wGYVujdae9PMZCMnpkNm0zSrH1x2qZABOAEMhEkZCLaYWuHGTVbKYNUyZAb1PnQZBWvAda1pULzJJlJczvFtH0OpCrAx5TbDssdLI`,
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

function getTemplatedMessageInput(recipient) {
  return JSON.stringify({
    "messaging_product": "whatsapp",
    "to": recipient,
    "type": "template",
    "template": {
      "name": "weekly_promotion",
      "language": {
        "code": "en"
      },
     "components": [
        {
          "type": "header",
          "parameters": [
            {
              "type": "image",
              "image": {
                "link": "https://drive.google.com/uc?export=view&id=1UeS8C8NaHBjUv29crZcQnzsDoyTgwiWA"
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