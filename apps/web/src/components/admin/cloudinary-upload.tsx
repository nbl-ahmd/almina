"use client";
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminRequest } from './controls';
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function CloudinaryUpload({ productId, revision }: { productId: string; revision: number }) {
  const router = useRouter(); const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false), [failure, setFailure] = useState(''), [message, setMessage] = useState('');
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const receiptKey = `almina-media-upload:${productId}`;
  async function submit(event: FormEvent) {
    event.preventDefault(); setFailure(''); setMessage('');
    const files = Array.from(input.current?.files ?? []);
    if (!files.length || files.length > 5 || files.some(file => file.size > 5 * 1024 * 1024)) { setFailure('Choose one to five raster images, at most 5 MiB each.'); return; }
    setPending(true);
    try {
      const saved = sessionStorage.getItem(receiptKey);
      const receipt = saved ? JSON.parse(saved) as { uploadKey: string; expectedMediaRevision: number }
        : { uploadKey: crypto.randomUUID(), expectedMediaRevision: revision };
      sessionStorage.setItem(receiptKey, JSON.stringify(receipt));
      const data = new FormData(); data.set('uploadKey', receipt.uploadKey); data.set('expectedMediaRevision', String(receipt.expectedMediaRevision));
      for (const file of files) data.append('images', file);
      await adminRequest(`media/products/${productId}`, 'POST', data);
      sessionStorage.removeItem(receiptKey); setMessage('Cloudinary images saved. Previous images remain retained.'); router.refresh();
    } catch (error) { setFailure(`${error instanceof Error ? error.message : 'Upload failed.'} Retry with the same files after an uncertain response. Uploads require configured Cloudinary credentials on the API.`); }
    finally { setPending(false); }
  }
  return <form onSubmit={event => { void submit(event); }} className="space-y-4 rounded-lg border border-teal-200 bg-white p-4" aria-busy={pending}>
    <h3 className="text-lg font-bold text-teal-950">Cloudinary product images</h3>
    <p>Choose reviewed product photos. Replacing the gallery preserves earlier Cloudinary and legacy images for historical references.</p>
    <label className="block font-semibold">Replacement raster images<input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={!ready || pending} required className="mt-2 block w-full min-w-0 rounded border border-slate-300 p-3" /></label>
    <button disabled={!ready || pending} className="min-h-11 rounded bg-teal-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? 'Uploading…' : 'Save Cloudinary images'}</button>
    <button type="button" disabled={!ready || pending} onClick={() => { sessionStorage.removeItem(receiptKey); setFailure(''); setMessage('Local retry review cleared. Check the gallery before replacing it. All uploaded assets remain retained.'); }} className="min-h-11 rounded border border-slate-300 px-4 py-3">Clear local upload review</button>
    {failure ? <p role="alert" className="text-red-900">{failure}</p> : null}{message ? <p role="status" className="text-teal-950">{message}</p> : null}
  </form>;
}
