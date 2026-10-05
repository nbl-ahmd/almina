// Lazy provider construction: imports/builds never discover credentials or contact Google.
let provider;
function driveMedia(req) {
  if (req.app.locals.driveMedia) return req.app.locals.driveMedia;
  if (!provider) {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (typeof keyFile !== 'string' || !keyFile.length || keyFile.length > 4096) throw require('../security/boundary.cjs').fail(503, 'SERVICE_UNAVAILABLE');
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/drive.file'],
      clientOptions: { transporterOptions: { timeout: 5000, retry: false, fetchImplementation: globalThis.fetch } } });
    provider = require('../commerce/dist/service.cjs').createDriveMedia(google.drive({ version: 'v3', auth }));
  }
  return provider;
}
module.exports = { driveMedia };
