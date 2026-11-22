function imageUploadOptions(storage) {
  return { storage, limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 80, fieldSize: 32768, parts: 90 },
    fileFilter(_req, file, callback) {
      // MIME is only an early filter. Sharp verifies content and bounds decoded pixels below.
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.mimetype)) {
        return callback(Object.assign(new Error('INVALID_UPLOAD'), { statusCode: 400 }));
      }
      callback(null, true);
    } };
}
module.exports = { imageUploadOptions };

async function validateImageUploads(req, _res, next) {
  // Client MIME labels are untrusted. Validate decoded format before DB/provider effects.
  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat();
  const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'heif' };
  try {
    for (const file of files) {
      if (!Buffer.isBuffer(file.buffer)) throw new Error('Invalid image');
      const metadata = await require('sharp')(file.buffer, { limitInputPixels: 20000000 }).metadata();
      if (metadata.format !== formats[file.mimetype] || !metadata.width || !metadata.height
        || metadata.width * metadata.height > 20000000
        || (file.mimetype === 'image/avif' && metadata.compression !== 'av1')) throw new Error('Invalid image');
    }
    next();
  } catch {
    next(Object.assign(new Error('INVALID_UPLOAD'), { statusCode: 400 }));
  }
}
module.exports.validateImageUploads = validateImageUploads;
