import { adminFileLimit } from './upload-limits';

const formats = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const originalLimit = 20 * 1024 * 1024;
/** Sequential decoding bounds memory; server validation and normalization remain mandatory. */
export async function prepareProductImages(files: File[], perPhotoBudget?: number): Promise<File[]> {
  if (!files.length || files.length > 5) throw new Error('Choose one to five product photos.');
  return prepareImages(files, perPhotoBudget);
}
export type ImageShape = { width?: number; height?: number; cover?: boolean; type?: 'image/webp' | 'image/jpeg' };
/** Resizes and re-encodes pictures in the browser. `cover` crops to exactly width x height; otherwise the picture fits inside. */
export async function prepareImages(files: File[], perPhotoBudget?: number, shape: ImageShape = {}): Promise<File[]> {
  const type = shape.type ?? 'image/webp', extension = type === 'image/jpeg' ? '.jpg' : '.webp';
  if (!files.length) throw new Error('Choose an image.');
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
        const width = shape.width ?? maximum, height = shape.height ?? maximum;
        const scale = Math.min(1, Math.min(maximum, width) / bitmap.width, Math.min(maximum, height) / bitmap.height);
        // A banner may be wider than the usual 2000 px; its own limits apply on the first pass.
        const fit = shape.width && !shape.cover && maximum === 2000 ? Math.min(1, width / bitmap.width, height / bitmap.height) : scale;
        const canvas = document.createElement('canvas');
        canvas.width = shape.cover ? width : Math.max(1, Math.round(bitmap.width * fit));
        canvas.height = shape.cover ? height : Math.max(1, Math.round(bitmap.height * fit));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Photo processing is unavailable in this browser.');
        // JPEG has no transparency: transparent areas become white, not black.
        if (type === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); }
        if (shape.cover) {
          const grow = Math.max(width / bitmap.width, height / bitmap.height);
          context.drawImage(bitmap, (width - bitmap.width * grow) / 2, (height - bitmap.height * grow) / 2, bitmap.width * grow, bitmap.height * grow);
        } else context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
        canvas.width = canvas.height = 0;
        if (!blob || blob.type !== type) throw new Error('Use a browser that supports WebP photo processing.');
        if (blob.size <= budget) break;
      }
      if (!blob || blob.size > budget) throw new Error('These photos are too detailed to upload together. Try fewer photos.');
      prepared.push(new File([blob], file.name.replace(/\.[^.]+$/, '') + extension, { type }));
    } finally { bitmap.close(); }
  }
  return prepared;
}
