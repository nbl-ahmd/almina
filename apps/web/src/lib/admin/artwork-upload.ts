'use client';
import { artworkTicketSchema, type ArtworkKind } from '@almina/contracts';
import { adminRequest } from '../../components/admin/controls';
import { sendToStorage } from '../../components/admin/direct-upload';
import { prepareImages, type ImageShape } from './product-images';
import { withRateLimitRetry } from './catalogue-client';

const perImageBudget = 4 * 1024 * 1024;
const shapes: Record<ArtworkKind, ImageShape> = {
  marketing: {},
  banner: { width: 2400, height: 2000 },
  category: { width: 500, height: 500, cover: true },
  // WhatsApp template headers accept JPEG or PNG, not WebP.
  poster: { type: 'image/jpeg' },
};
/** One upload key per attempt at the same files and details, so a retry after a lost response cannot save twice. */
const attempts = new Map<string, string>();

/** Sends artwork from the browser straight to storage, then asks the server to verify and record it. */
export async function uploadArtwork(kind: ArtworkKind, files: File[], details: Record<string, string> = {}) {
  const prepared = await prepareImages(files, perImageBudget, shapes[kind]);
  const attempt = JSON.stringify([kind, details, files.map(file => [file.name, file.size, file.lastModified])]);
  const uploadKey = attempts.get(attempt) ?? crypto.randomUUID();
  attempts.set(attempt, uploadKey);
  const count = prepared.length;
  const ticket = artworkTicketSchema.safeParse(await withRateLimitRetry(() => adminRequest('media/artwork/sign', 'POST', { kind, uploadKey, count })));
  if (!ticket.success || ticket.data.uploads.length !== count) throw new Error('Image storage is unavailable. Try again shortly.');
  await sendToStorage(ticket.data, prepared);
  const saved = await withRateLimitRetry(() => adminRequest('media/artwork/commit', 'POST',
    { kind, uploadKey, ...(kind === 'banner' ? { count } : {}), ...details })) as { image: string };
  attempts.delete(attempt);
  return saved;
}
