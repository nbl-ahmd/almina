"use client";
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { adminRequest } from './controls';
import { adminFileLimit } from '../../lib/admin/upload-limits';
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
    if (!files.length || files.length > 5 || files.reduce((total, file) => total + file.size, 0) > adminFileLimit) { setFailure('Choose one to five raster images, smaller than 3 MB in total.'); return; }
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
  return <form onSubmit={event => { void submit(event); }} className="admin-card admin-stack" aria-busy={pending} data-motion="rise">
    <h2>Cloudinary product images</h2>
    <p>Choose reviewed product photos, smaller than 3 MB in total. Replacing the gallery preserves earlier Cloudinary and legacy images for historical references.</p>
    <label>Replacement raster images<input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={!ready || pending} required /></label>
    <div className="admin-actions">
      <button disabled={!ready || pending}>{pending ? 'Uploading…' : 'Save Cloudinary images'}</button>
      <button type="button" className="admin-btn--secondary" disabled={!ready || pending} onClick={() => { sessionStorage.removeItem(receiptKey); setFailure(''); setMessage('Local retry review cleared. Check the gallery before replacing it. All uploaded assets remain retained.'); }}>Clear local upload review</button>
    </div>
    {failure ? <p role="alert" className="admin-alert admin-alert--danger">{failure}</p> : null}{message ? <p role="status" className="admin-alert admin-alert--success">{message}</p> : null}
  </form>;
}
