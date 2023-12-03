var axios = require('axios');

function sendMessage(data) {
  var config = {
    method: 'post',
    url: `https://graph.facebook.com/v17.0/163562513510742/messages`,
    headers: {
      'Authorization': `Bearer EAAErqwBrM1sBOZCB2h9mcOAk0nENpawMZACNt5ijtSSA2RRdwR69T0aC6JZABz1Nwv2Dac926jAHZCdk9CWqOuliGWe5P3vuT5MKb2HOZBAfiVIAA781gtL1x3PPzUQBr5KRVJtpsrZBPiBjZCyOHbqOPs89KZBdDHjCnQUQlGYtQl4mDfsHOrAiNLoj7wWp1ock6M34vxXOSJBKUIDnKsTXUKr3RWrxBVhqSR0ZD`,
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
        "code": "en"
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