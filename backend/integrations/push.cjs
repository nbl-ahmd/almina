const { createPushSender, staffPushOutbox } = require('../commerce/dist/service.cjs');
// Existing application VAPID keys must be supplied by the operator, never generated on startup.
async function startStaffPush(getDb, env = process.env, options = {}) {
  if (env.ADMIN_PUSH_ENABLED === undefined || env.ADMIN_PUSH_ENABLED === 'false') return undefined;
  if (env.ADMIN_PUSH_ENABLED !== 'true') throw new Error('Invalid push configuration');
  const send = createPushSender({ subject: env.ADMIN_PUSH_SUBJECT, publicKey: env.ADMIN_PUSH_PUBLIC_KEY, privateKey: env.ADMIN_PUSH_PRIVATE_KEY },
    require('web-push').generateRequestDetails);
  return staffPushOutbox(getDb, { send, onFailure: () => console.error('Staff push delivery requires review'), ...options });
}
module.exports = { startStaffPush };
