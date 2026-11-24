import { adminRequest } from './controls';
import { prepareProductImages } from '../../lib/admin/product-images';

type Ticket = { cloudName: string; apiKey: string; uploads: { publicId: string; fields: Record<string, string> }[] };
const perPhotoBudget = 4 * 1024 * 1024;
/** Sends product photos straight from the browser to Cloudinary using tickets the server signs, then asks the server to confirm and attach
 *  them. The photos never pass through the hosting gateway or the API, so a photo costs them a few hundred bytes of JSON, not megabytes. */
export async function uploadProductPhotos(productId: string, files: File[], receipt: { uploadKey: string; expectedMediaRevision: number }) {
  const prepared = await prepareProductImages(files, perPhotoBudget);
  const request = { uploadKey: receipt.uploadKey, expectedMediaRevision: receipt.expectedMediaRevision, count: prepared.length };
  const ticket = await adminRequest(`media/products/${productId}/sign`, 'POST', request) as Ticket;
  if (!ticket || !/^[A-Za-z0-9_-]{1,100}$/.test(ticket.cloudName) || ticket.uploads?.length !== prepared.length) throw new Error('Photo storage is unavailable. Try again shortly.');
  await Promise.all(prepared.map(async (file, index) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.uploads[index]!.fields)) form.set(name, value);
    form.set('file', file);
    let response: Response;
    try { response = await fetch(`https://api.cloudinary.com/v1_1/${ticket.cloudName}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(90000) }); }
    catch { throw new Error('A photo did not reach storage. Check your connection and retry with the same files.'); }
    // The server checks every photo again before attaching it, so a repeated upload of the same photo is harmless.
    if (!response.ok && response.status !== 409) throw new Error('Photo storage rejected a photo. Retry with the same files.');
  }));
  return adminRequest(`media/products/${productId}/commit`, 'POST', request);
}
