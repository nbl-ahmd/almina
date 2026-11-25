'use client';
import { useId, useState } from 'react';
import Image from 'next/image';
import { inputClass } from './shadcn/styles';
import { prepareProductImages } from '../../lib/admin/product-images';

/** One image field for storefront artwork (campaigns, sections, brand logos): upload a file or paste an approved URL.
 *  Uploads go to the existing image endpoint, which stores the picture on the configured Cloudinary account and returns its URL.
 *  Images are shrunk to fit 2000 × 2000 and saved as WebP; proportions and transparency are kept, nothing is cropped. */
export function ImageUploadField({ label, value, onChange, hint, size, disabled = false }: {
  label: string; value: string; onChange: (url: string) => void; hint?: string | undefined; size?: string | undefined; disabled?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function upload(file: File) {
    setBusy(true); setError('');
    try {
      const [prepared] = await prepareProductImages([file]);
      if (!prepared) throw new Error('This image could not be read.');
      const body = new FormData(); body.set('image', prepared);
      const response = await fetch('/api/admin/media/marketing', { method: 'POST', headers: { 'X-CSRF-Protection': '1' }, body });
      if (response.status === 503) throw new Error('Image storage is not configured on this server. Paste an approved image URL instead.');
      if (!response.ok) throw new Error('Upload failed. Try again, or paste an approved image URL.');
      const result = await response.json() as { image?: unknown };
      if (typeof result.image !== 'string') throw new Error('Upload failed. Try again.');
      onChange(result.image);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Upload failed.'); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-1.5 text-sm font-medium">
    <label htmlFor={id + '-url'}>{label}{size ? <span className="ms-1 font-normal text-mute">({size})</span> : null}</label>
    <div className="flex flex-wrap items-center gap-3">
      {value ? <span className="relative block h-16 w-28 shrink-0 overflow-hidden rounded-lg border border-line bg-soft"><Image src={value} alt="" fill sizes="112px" className="object-contain" unoptimized /></span> : null}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line bg-surface px-4 text-sm font-medium">
        {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/avif" disabled={disabled || busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file); }} />
      </label>
      {value ? <button type="button" className="min-h-11 text-sm font-medium underline" disabled={disabled || busy} onClick={() => onChange('')}>Remove</button> : null}
    </div>
    <input id={id + '-url'} aria-label={`${label} URL`} className={inputClass} type="url" value={value} disabled={disabled || busy} placeholder="or paste an approved https:// image URL" onChange={event => onChange(event.target.value.trim())} />
    {hint ? <span className="text-xs font-normal text-mute">{hint}</span> : null}
    {error ? <span role="alert" className="text-xs font-normal text-danger">{error}</span> : null}
  </div>;
}
