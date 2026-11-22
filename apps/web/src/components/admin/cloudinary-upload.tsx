"use client";
import { buttonVariants } from "./ui";
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
  return <form onSubmit={event => { void submit(event); }} className="mb-4 grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6" aria-busy={pending}>
    <div>
      <h2 className="m-0 text-base font-semibold">Photos</h2>
      <p className="m-0 mt-0.5 text-[13px] text-mute">Up to five clear photos. Adding photos confirms you may use them.</p>
    </div>
    <label className="grid cursor-pointer justify-items-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-soft p-5 text-center hover:bg-fill" htmlFor="product-photos">
      <CloudArrowUpIcon className="size-6 text-mute" aria-hidden="true" />
      <strong className="text-[13px] font-medium">Choose photos</strong>
      <span className="text-xs text-mute">JPG, PNG, WebP, GIF or AVIF · 20 MB each</span>
      <input ref={input} id="product-photos" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={!ready || pending} required className="mt-1 w-full min-w-0 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white" />
    </label>
    <div className="flex flex-wrap items-center gap-2">
      <button className={buttonVariants({ variant: "default" })} disabled={!ready || pending}>{pending ? 'Preparing and uploading…' : 'Save product photos'}</button>
      <details className="grid gap-2 text-[13px] text-mute"><summary className="cursor-pointer">Upload recovery</summary><p className="m-0 text-[13px] text-mute">Use this only after checking the gallery following an interrupted upload.</p><button type="button" className={buttonVariants({ variant: "outline" })} disabled={!ready || pending} onClick={() => { sessionStorage.removeItem(receiptKey); setFailure(''); setMessage('Local retry review cleared. Check the gallery before replacing it. All uploaded assets remain retained.'); }}>Clear local upload review</button></details>
    </div>
    {failure ? <p role="alert" className="rounded-lg bg-bad-soft px-4 py-3 text-[13px] font-medium text-bad">{failure}</p> : null}{message ? <p role="status" className="rounded-lg bg-ok-soft px-4 py-3 text-[13px] font-medium text-ok">{message}</p> : null}
  </form>;
}
