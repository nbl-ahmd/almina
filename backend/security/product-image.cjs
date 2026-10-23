// One normalization policy for current and retained product-upload adapters.
async function prepareProductImage(buffer) {
  return require('sharp')(buffer, { limitInputPixels: 20000000 }).rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86 }).toBuffer();
}
module.exports = { prepareProductImage };
