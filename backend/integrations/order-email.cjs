const { createSmtpTransport } = require('./smtp.cjs');
const domain = require('../commerce/dist/service.cjs');
const credentials = () => ({ user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD });
const factory = options => createSmtpTransport(options);
// Compatibility adapter; maintained domain owns message content, deadlines and cleanup.
const confirmationMessage = order => domain.confirmationMessage(order, process.env.SMTP_USER);
const sendOrderConfirmation = (order, signal, db) => process.env.EMAIL_PROVIDER === 'resend'
  ? domain.sendOrderEmail(db, order, signal) : domain.deliverEmail(confirmationMessage(order), credentials(), factory, signal);
const sendAdministrativeEmail = body => domain.deliverEmail(domain.administrativeEmail(body), credentials(), factory);
module.exports = { confirmationMessage, sendOrderConfirmation, sendAdministrativeEmail };
