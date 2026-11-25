'use client';
import { uploadProductPhotos } from '../../components/admin/direct-upload';
import { withRateLimitRetry } from './catalogue-client';

const receiptKey = (productId: string) => `almina-media-upload:${productId}`;
type Receipt = { uploadKey: string; expectedMediaRevision: number; files?: string };

/** Uploads a product's new photos. The receipt is kept until the upload is confirmed, so retrying after a lost response
 *  attaches the same assets once instead of uploading a second set. */
export async function uploadWithReceipt(productId: string, files: File[], mediaRevision: number, onWait?: (seconds: number) => void) {
  const chosen = files.map(file => `${file.name}:${file.size}:${file.lastModified}`).join('|');
  let receipt: Receipt | null = null;
  try { receipt = JSON.parse(sessionStorage.getItem(receiptKey(productId)) ?? 'null') as Receipt | null; } catch { receipt = null; }
  // A receipt applies only to the same files against the same gallery; anything else is a new upload.
  if (!receipt || receipt.expectedMediaRevision !== mediaRevision || receipt.files !== chosen) receipt = { uploadKey: crypto.randomUUID(), expectedMediaRevision: mediaRevision, files: chosen };
  const current = { uploadKey: receipt.uploadKey, expectedMediaRevision: receipt.expectedMediaRevision };
  try { sessionStorage.setItem(receiptKey(productId), JSON.stringify(receipt)); } catch { /* private browsing */ }
  const result = await withRateLimitRetry(() => uploadProductPhotos(productId, files, current), onWait);
  clearReceipt(productId);
  return result as { mediaRevision?: number } | undefined;
}
export function clearReceipt(productId: string) { try { sessionStorage.removeItem(receiptKey(productId)); } catch { /* private browsing */ } }

export const photoTypes = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
export const imageFiles = (list: Iterable<File> | ArrayLike<File> | null | undefined) => Array.from(list ?? []).filter(file => photoTypes.split(',').includes(file.type));

/** Photo file names carry the product ID or barcode: "PD1234.jpg", "PD1234_2.png", "6291000000011 (3).webp".
 *  The whole name is tried first, so an identifier that itself ends in a number still matches. */
export function codeCandidates(fileName: string): string[] {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  const stripped = base.replace(/(?:\s*\(\d{1,2}\)|[ _-]+(?:\d{1,2}|front|back|side|main))$/i, '').trim();
  return [...new Set([base, stripped])].filter(code => /^[A-Za-z0-9_-]{1,40}$/.test(code));
}
