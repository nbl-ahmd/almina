const { orderOutbox } = require('./dist/service.cjs');
const { sendOrderConfirmation } = require('../integrations/order-email.cjs');
// Retained provider adapter; maintained worker owns leases, retries and draining.
function startOrderOutbox(getDb, options = {}) {
  return orderOutbox(getDb, { send: sendOrderConfirmation,
    onFailure: () => console.error('Order notification delivery failed'), ...options });
}
module.exports = { startOrderOutbox };
