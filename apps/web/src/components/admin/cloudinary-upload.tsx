"use client";
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { adminRequest } from './controls';
import { prepareProductImages } from '../../lib/admin/product-images';
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
    if (!files.length || files.length > 5) { setFailure('Choose one to five product photos.'); return; }
    setPending(true);
    try {
      const prepared = await prepareProductImages(files);
      const saved = sessionStorage.getItem(receiptKey);
      const receipt = saved ? JSON.parse(saved) as { uploadKey: string; expectedMediaRevision: number }
        : { uploadKey: crypto.randomUUID(), expectedMediaRevision: revision };
      sessionStorage.setItem(receiptKey, JSON.stringify(receipt));
      const data = new FormData(); data.set('uploadKey', receipt.uploadKey); data.set('expectedMediaRevision', String(receipt.expectedMediaRevision));
      for (const file of prepared) data.append('images', file);
      await adminRequest(`media/products/${productId}`, 'POST', data);
      sessionStorage.removeItem(receiptKey); setMessage('Product photos saved. Previous photos remain retained.'); router.refresh();
    } catch (error) { setFailure(`${error instanceof Error ? error.message : 'Upload failed.'} Retry with the same files after an uncertain response. If this continues, contact the administrator.`); }
    finally { setPending(false); }
  }
  return <form onSubmit={event => { void submit(event); }} className="admin-card admin-stack" aria-busy={pending}>
    <div>
      <h2>Product photos</h2>
      <p className="admin-card__hint">Add up to five clear photos. Keep packaging and labels fully visible. Up to 20 MB and 20 megapixels per image.</p>
    </div>
    <label className="admin-dropzone admin-field--wide" htmlFor="product-photos">
      <span className="admin-dropzone__icon" aria-hidden="true">
        <CloudArrowUpIcon width={17} height={17} />
      </span>
      <span className="admin-dropzone__text">
        <strong>Choose product photos</strong>
        <span>JPG, PNG, WebP, GIF or AVIF · up to 5 images</span>
      </span>
      <input ref={input} id="product-photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={!ready || pending} required />
    </label>
    <div className="admin-actions">
      <button className="admin-photo-save" disabled={!ready || pending}>{pending ? 'Preparing and uploading…' : 'Save product photos'}</button>
      <details className="admin-upload-recovery"><summary>Upload recovery</summary><p className="admin-card__hint">Use this only after checking the gallery following an interrupted upload.</p><button type="button" className="admin-btn--secondary" disabled={!ready || pending} onClick={() => { sessionStorage.removeItem(receiptKey); setFailure(''); setMessage('Local retry review cleared. Check the gallery before replacing it. All uploaded assets remain retained.'); }}>Clear local upload review</button></details>
    </div>
    {failure ? <p role="alert" className="admin-alert admin-alert--danger">{failure}</p> : null}{message ? <p role="status" className="admin-alert admin-alert--success">{message}</p> : null}
  </form>;
}
