const nodemailer = require('nodemailer');
// Called only with a persisted order. The browser cannot select an arbitrary mail destination/content.
function confirmationMessage(order) {
  if (typeof order.customer?.email !== 'string' || order.customer.email.length > 254
    || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(order.customer.email)
    || typeof order.orderId !== 'string' || !/^OD[0-9]+$/.test(order.orderId)) throw new Error('Invalid notification data');
  return { messageId: `<almina-order-${order.orderId}@alminapharmacy.com>`, from: process.env.SMTP_USER, to: order.customer.email, subject: 'Your order has been received',
    text: `Al Mina Pharmacy has received order ${order.orderId}. Our team will contact you about fulfillment.` };
}
async function sendOrderConfirmation(order, signal) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) throw new Error('Mail credentials unavailable');
  const transporter = nodemailer.createTransport({ host: 'smtp.office365.com', port: 587, secure: false, requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000 });
  const cancel = () => transporter.close();
  if (signal?.aborted) { transporter.close(); throw new Error('Notification canceled'); }
  signal?.addEventListener('abort', cancel, { once: true });
  try { await transporter.sendMail(confirmationMessage(order)); }
  finally { signal?.removeEventListener('abort', cancel); transporter.close(); }
}
module.exports = { confirmationMessage, sendOrderConfirmation };
