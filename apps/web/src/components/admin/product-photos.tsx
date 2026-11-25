'use client';
/* eslint-disable @next/next/no-img-element -- catalogue thumbnails and local object URLs for previews. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePendingPhotos } from './photo-context';
import { cn } from './cn';
import { Button } from './shadcn/button';
import { clearReceipt, imageFiles, photoTypes, uploadWithReceipt } from '../../lib/admin/photo-upload';

const subscribe = () => () => {};
const none: File[] = [];

/** The editor's photo panel: choose, drop or paste. Chosen photos upload with the next save, or immediately with
 *  "Save product photos" on an existing product. */
export function ProductPhotos({ productId, revision = 0, current = [] }: { productId?: string; revision?: number; current?: string[] }) {
  const router = useRouter();
  const photos = usePendingPhotos();
  const input = useRef<HTMLInputElement>(null);
  const files = photos?.files ?? none;
  const setFiles = photos?.setFiles;
  const [over, setOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(''), [message, setMessage] = useState('');
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const urls = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach(url => URL.revokeObjectURL(url)), [urls]);

  function add(list: FileList | null) {
    const chosen = imageFiles(list);
    setFailure(''); setMessage('');
    if (!chosen.length) { if (list?.length) setFailure('Choose JPG, PNG, WebP, GIF or AVIF photos.'); return; }
    if (files.length + chosen.length > 5) setFailure('A product takes up to five photos. The first five were kept.');
    setFiles?.([...files, ...chosen].slice(0, 5));
  }
  // Copy a pack photo anywhere, then paste it here without saving it to disk first.
  const addRef = useRef(add);
  useEffect(() => { addRef.current = add; });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => { if (event.clipboardData?.files.length) { event.preventDefault(); addRef.current(event.clipboardData.files); } };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
  async function upload() {
    if (!productId || !files.length) { setFailure('Choose one to five product photos.'); return; }
    setPending(true); setFailure(''); setMessage('');
    try {
      await uploadWithReceipt(productId, files, revision, seconds => setMessage(`Pausing ${seconds} seconds, then continuing.`));
      setFiles?.([]); setMessage('Product photos saved. Previous photos remain retained.'); toast.success('Photos saved'); router.refresh();
    } catch (error) { setFailure(`${error instanceof Error ? error.message : 'Upload failed.'} Select Save product photos to retry with the same files.`); }
    finally { setPending(false); }
  }
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); if (!pending) add(event.dataTransfer.files); };
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-surface p-5" aria-busy={pending} aria-labelledby="product-photos-title"
      onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
      <div>
        <h2 id="product-photos-title" className="m-0 text-base font-semibold">Photos</h2>
        <p className="m-0 mt-0.5 text-[13px] text-mute">Up to five. Adding photos confirms you may use them.{current.length ? ' New photos replace the current ones.' : ''}</p>
      </div>
      {current.length && !files.length ? <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="Current photos">
        {current.map((url, index) => <li key={url} className="aspect-square overflow-hidden rounded-lg bg-fill"><img src={url} alt={`Current photo ${index + 1}`} className="size-full object-contain" /></li>)}
      </ul> : null}
      {files.length ? <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0" aria-label="New photos">
        {urls.map((url, index) => (
          <li key={url} className="relative aspect-square overflow-hidden rounded-lg bg-fill">
            <img src={url} alt={`New photo ${index + 1}`} className="size-full object-cover" />
            <button type="button" aria-label={`Remove photo ${index + 1}`} disabled={pending} onClick={() => setFiles?.(files.filter((_, i) => i !== index))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-ink/80 text-white outline-0 hover:bg-ink focus-visible:outline-2 focus-visible:outline-ink"><XMarkIcon className="size-4" aria-hidden="true" /></button>
          </li>
        ))}
      </ul> : null}
      <button type="button" disabled={!ready || pending} onClick={() => input.current?.click()}
        className={cn('grid min-h-28 justify-items-center content-center gap-1 rounded-lg border border-dashed !border-line-strong bg-soft p-4 text-center outline-0 hover:bg-fill focus-visible:outline-2 focus-visible:outline-ink', over && '!border-ink bg-fill')}>
        <CloudArrowUpIcon className="size-6 text-mute" aria-hidden="true" />
        <strong className="text-[13px] font-medium">{files.length ? 'Add more photos' : 'Choose, drop or paste photos'}</strong>
        <span className="text-xs text-mute">JPG, PNG, WebP, GIF or AVIF · 20 MB each</span>
      </button>
      <input ref={input} id="product-photos" type="file" multiple accept={photoTypes} disabled={!ready || pending} className="sr-only" tabIndex={-1} aria-label="Choose product photos" onChange={event => { add(event.target.files); event.target.value = ''; }} />
      {files.length ? <p className="m-0 text-xs text-mute">{files.length} {files.length === 1 ? 'photo uploads' : 'photos upload'} when you save.</p> : null}
      {productId ? <Button variant="outline" disabled={!ready || pending || !files.length} onClick={() => void upload()}>{pending ? 'Preparing and uploading…' : 'Save product photos'}</Button> : null}
      {productId ? <details className="text-[13px] text-mute"><summary className="cursor-pointer">Upload recovery</summary><p className="m-0 my-2">Use this only after checking the gallery following an interrupted upload.</p><Button size="sm" disabled={!ready || pending} onClick={() => { clearReceipt(productId); setFailure(''); setMessage('Local retry review cleared. Check the gallery before replacing it. All uploaded assets remain retained.'); }}>Clear local upload review</Button></details> : null}
      {failure ? <p role="alert" className="m-0 rounded-lg bg-bad-soft px-4 py-3 text-[13px] font-medium text-bad">{failure}</p> : null}
      {message ? <p role="status" className="m-0 rounded-lg bg-ok-soft px-4 py-3 text-[13px] font-medium text-ok">{message}</p> : null}
    </section>
  );
}
