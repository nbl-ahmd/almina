function imageUploadOptions(storage) {
  return { storage, limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 40, fieldSize: 32768, parts: 50 },
    fileFilter(_req, file, callback) {
      // MIME is only an early filter. Sharp verifies content and bounds decoded pixels below.
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.mimetype)) {
        return callback(Object.assign(new Error('INVALID_UPLOAD'), { statusCode: 400 }));
      }
      callback(null, true);
    } };
}
module.exports = { imageUploadOptions };
