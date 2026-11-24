import { adminFileLimit } from './upload-limits';

const formats = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const originalLimit = 20 * 1024 * 1024;
/** Sequential decoding bounds memory; server validation and normalization remain mandatory. */
export async function prepareProductImages(files: File[], perPhotoBudget?: number): Promise<File[]> {
  if (!files.length || files.length > 5) throw new Error('Choose one to five product photos.');
  if (files.some(file => !formats.has(file.type) || !file.size || file.size > originalLimit)) {
    throw new Error('Use JPEG, PNG, WebP, GIF or AVIF photos up to 20 MB each.');
  }
  // Photos that travel through the gateway share its body limit; direct uploads only need to stay under the server's per-photo limit.
  const budget = perPhotoBudget ?? Math.floor((adminFileLimit - 65536) / files.length);
  const prepared: File[] = [];
  for (const file of files) {
    let bitmap: ImageBitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw new Error(`Unable to read ${file.name}. Choose a supported photo.`); }
    try {
      if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) throw new Error('Each photo must be at most 20 megapixels.');
      let blob: Blob | null = null;
      for (const [maximum, quality] of [[2000, 0.86], [2000, 0.72], [1600, 0.7], [1200, 0.68]] as const) {
        const scale = Math.min(1, maximum / bitmap.width, maximum / bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Photo processing is unavailable in this browser.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        canvas.width = canvas.height = 0;
        if (!blob || blob.type !== 'image/webp') throw new Error('Use a browser that supports WebP photo processing.');
        if (blob.size <= budget) break;
      }
      if (!blob || blob.size > budget) throw new Error('These photos are too detailed to upload together. Try fewer photos.');
      prepared.push(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }));
    } finally { bitmap.close(); }
  }
  return prepared;
}
