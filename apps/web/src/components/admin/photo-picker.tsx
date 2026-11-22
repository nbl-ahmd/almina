'use client';
/* eslint-disable @next/next/no-img-element -- local object URLs for previews. */
import { useEffect, useMemo, useRef } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePendingPhotos } from './photo-context';

/** Photo chooser for a product that is not saved yet. The files upload right after the product is created. */
const none: File[] = [];
export function PhotoPicker() {
  const photos = usePendingPhotos();
  const input = useRef<HTMLInputElement>(null);
  const files = photos?.files ?? none;
  const urls = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach(url => URL.revokeObjectURL(url)), [urls]);
  if (!photos) return null;
  const add = (list: FileList | null) => photos.setFiles([...files, ...Array.from(list ?? [])].slice(0, 5));
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-surface p-5">
      <div><h2 className="m-0 text-base font-semibold">Photos</h2><p className="m-0 mt-0.5 text-[13px] text-mute">Up to five. They upload when you save. Adding photos confirms you may use them.</p></div>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((url, index) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg bg-fill">
            <img src={url} alt={`Selected photo ${index + 1}`} className="size-full object-cover" />
            <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => photos.setFiles(files.filter((_, i) => i !== index))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/80 text-white outline-0 hover:bg-ink"><XMarkIcon className="size-3.5" aria-hidden="true" /></button>
          </div>
        ))}
        {files.length < 5 ? (
          <button type="button" onClick={() => input.current?.click()} className="grid aspect-square place-items-center gap-1 rounded-lg border border-dashed border-line-strong bg-soft text-center text-xs text-mute outline-0 hover:bg-fill focus-visible:outline-2 focus-visible:outline-ink">
            <span className="grid justify-items-center gap-1"><PhotoIcon className="size-6" aria-hidden="true" />{files.length ? 'Add more' : 'Add photos'}</span>
          </button>
        ) : null}
      </div>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-label="Choose product photos" onChange={event => { add(event.target.files); event.target.value = ''; }} />
    </section>
  );
}
