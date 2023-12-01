var axios = require('axios');

function sendMessage(data) {
  var config = {
    method: 'post',
    url: `https://graph.facebook.com/v17.0/163562513510742/messages`,
    headers: {
      'Authorization': `Bearer EAAErqwBrM1sBO13bbxd9OiCCXqJOnuRpZBUXq6Dhn6ZC2G9NCcvDqZChnEbogGzxiZBptzDfXyMFxQhMqT9gYk6btsUdiNahIp4l1iedB1A0ZAB9uiVNZBmo8l8oz91H1Fkwty8E0dvIEyxxfzagwxFyq2tt3yZAIT69oWZB4mXioeFoU387ghICmCyRJZB3qPJ5vO2bkhSpmUCv8vd43n2Gup7aYccSWC1ejD08ZD`,
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