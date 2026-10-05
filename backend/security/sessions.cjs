// Retained import contract; maintained TypeScript owns sessions and browser-cookie policy.
const domain = require('../commerce/dist/service.cjs');
module.exports = { createSessionService: domain.createSessionService, cookieOptions: domain.cookieOptions,
  cookieName: domain.cookieName, readSessionCookie: domain.readSessionCookie, verifyBrowserMutation: domain.verifyBrowserMutation };
