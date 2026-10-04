let sender;
function whatsappSender(req) {
  if (req.app.locals.whatsappSender) return req.app.locals.whatsappSender;
  if (!sender) sender = require('../commerce/dist/service.cjs').createWhatsappSender({
    token: process.env.WHATSAPP_ACCESS_TOKEN, version: process.env.WHATSAPP_API_VERSION, phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  });
  return sender;
}
module.exports = { whatsappSender };
