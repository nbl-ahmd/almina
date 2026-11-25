'use client';
/* eslint-disable @next/next/no-img-element -- local object URLs for previews. */
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { CatalogueItem, CatalogueList, CatalogueVisibilityResult } from '@almina/contracts';
import { adminRequest } from './controls';
import { useConfirm } from './confirm-dialog';
import { adminPortal, cn } from './cn';
import { Button } from './shadcn/button';
import { Switch } from './shadcn/switch';
import { Badge } from './ui';
import Link from '../app-link';
import { editorHref } from '../../lib/admin/catalogue-links';
import { withRateLimitRetry } from '../../lib/admin/catalogue-client';
import { codeCandidates, imageFiles, photoTypes, uploadWithReceipt } from '../../lib/admin/photo-upload';

type Row = {
  key: string; files: File[]; extra: number; product: CatalogueItem | null; problem: string; include: boolean;
  state: 'waiting' | 'uploading' | 'done' | 'failed'; note: string;
};
const maximumFiles = 500;

/** Groups the chosen files by the product their name points to. */
async function matchFiles(files: File[], onWait: (seconds: number) => void): Promise<Row[]> {
  const codes = [...new Set(files.flatMap(file => codeCandidates(file.name)))];
  const found: CatalogueItem[] = [];
  for (let index = 0; index < codes.length; index += 50) {
    const params = new URLSearchParams({ codes: codes.slice(index, index + 50).join(','), limit: '100' });
    found.push(...(await withRateLimitRetry(() => adminRequest(`products/catalogue?${params}`) as Promise<CatalogueList>, onWait)).items);
  }
  const lookup = (code: string) => {
    const byId = found.filter(item => item.productId.toLowerCase() === code.toLowerCase());
    return byId.length ? byId : found.filter(item => item.barcode === code || item.gtin === code);
  };
  const rows = new Map<string, Row>();
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    let matches: CatalogueItem[] = [];
    for (const code of codeCandidates(file.name)) { matches = lookup(code); if (matches.length) break; }
    const product = matches.length === 1 ? matches[0]! : null;
    const key = product?._id ?? `file:${file.name}`;
    const row = rows.get(key);
    if (row) { if (row.files.length < 5) row.files.push(file); else row.extra++; continue; }
    rows.set(key, { key, files: [file], extra: 0, product,
      problem: matches.length > 1 ? 'Several products share this barcode. Rename the file with the PD number.' : product ? '' : 'No product matches this file name.',
      // Replacing photos a product already has needs a deliberate tick.
      include: Boolean(product) && Boolean(product?.missingPhoto), state: 'waiting', note: '' });
  }
  return [...rows.values()].sort((a, b) => Number(!a.product) - Number(!b.product));
}

function Preview({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt="" className="size-14 shrink-0 rounded-md border border-line bg-fill object-cover" />;
}

/** Upload photos for many products at once: name each file with the product's PD number or barcode. */
export function BulkPhotoUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const { ask, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<'' | 'matching' | 'uploading'>('');
  const [message, setMessage] = useState('');
  const [goLive, setGoLive] = useState(false);
  const [over, setOver] = useState(false);
  const stop = useRef(false);
  const chosen = rows.filter(row => row.include && row.product && row.state !== 'done');
  const done = rows.filter(row => row.state === 'done').length;
  const patch = (key: string, values: Partial<Row>) => setRows(list => list.map(row => row.key === key ? { ...row, ...values } : row));
  const onWait = (seconds: number) => setMessage(`Pausing ${seconds} seconds, then continuing.`);

  async function add(list: FileList | null) {
    const files = imageFiles(list);
    if (!files.length) { setMessage('Choose JPG, PNG, WebP, GIF or AVIF photos.'); return; }
    if (files.length > maximumFiles) { setMessage(`Choose up to ${maximumFiles} photos at a time.`); return; }
    setBusy('matching'); setMessage(`Matching ${files.length} photos to products…`);
    try { setRows(await matchFiles(files, onWait)); setMessage(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The photos could not be matched. Choose them again.'); }
    finally { setBusy(''); }
  }
  async function upload() {
    const queue = [...chosen];
    const replacing = queue.filter(row => !row.product!.missingPhoto).length;
    if (!(await ask(`Upload photos to ${queue.length} ${queue.length === 1 ? 'product' : 'products'}?${replacing ? ` ${replacing} already ${replacing === 1 ? 'has' : 'have'} photos, which the new ones replace.` : ''}${goLive ? ' Each hidden product goes live after its upload if it has a name, type and price; its current price and stock are recorded as checked.' : ' Products stay live or hidden as they are.'} Adding photos confirms you may use them.`, { action: goLive ? 'Upload and make live' : 'Upload photos' }))) return;
    stop.current = false; setBusy('uploading'); setMessage('');
    let uploaded = 0, madeLive = 0, failed = 0;
    // Two at a time keeps browser memory and the staff request allowance in bounds.
    async function worker() {
      for (let row = queue.shift(); row && !stop.current; row = queue.shift()) {
        const product = row.product!;
        patch(row.key, { state: 'uploading', note: '' });
        try {
          const result = await uploadWithReceipt(product._id, row.files, product.mediaRevision, onWait);
          uploaded++;
          let note = 'Uploaded';
          if (goLive && !product.live) {
            const { results } = await withRateLimitRetry(() => adminRequest('products/visibility', 'POST', { ids: [product._id], live: true }) as Promise<CatalogueVisibilityResult>, onWait);
            if (results[0]?.ok) { madeLive++; note = 'Uploaded and live'; } else note = `Uploaded, still hidden: ${results[0]?.reason ?? 'not changed'}`;
          }
          patch(row.key, { state: 'done', note, product: { ...product, missingPhoto: false, mediaRevision: result?.mediaRevision ?? product.mediaRevision + 1 } });
        } catch (error) { failed++; patch(row.key, { state: 'failed', note: error instanceof Error ? error.message : 'Upload failed.' }); }
      }
    }
    await Promise.all([worker(), worker()]);
    setBusy('');
    setMessage(`${uploaded} uploaded${goLive ? `, ${madeLive} made live` : ''}${failed ? `, ${failed} failed (select Upload to retry them)` : ''}${stop.current ? '. Stopped before the end.' : '.'}`);
    router.refresh();
  }
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); if (!busy) void add(event.dataTransfer.files); };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><CloudArrowUpIcon className="size-4" aria-hidden="true" />Upload many photos</Button>
      <Dialog.Root open={open} onOpenChange={value => { if (!value && busy === 'uploading') return; setOpen(value); if (!value) { setRows([]); setMessage(''); } }}>
        <Dialog.Portal container={adminPortal()}>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/40" />
          <Dialog.Content onDragOver={event => event.preventDefault()} onDrop={drop}
            className="fixed left-1/2 top-1/2 z-[81] flex max-h-[90dvh] w-[min(760px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border border-line bg-surface p-5 text-ink shadow-pop max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-h-[94dvh] max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none">
            {dialog}
            <div className="flex items-start justify-between gap-3">
              <div><Dialog.Title className="m-0 text-lg font-semibold">Upload many photos</Dialog.Title>
                <Dialog.Description className="m-0 mt-1 text-[13px] text-mute">Name each photo with the product’s PD number or barcode, for example <code>PD1234.jpg</code>. Add <code>_2</code>, <code>_3</code> for more photos of the same product.</Dialog.Description></div>
              <Dialog.Close asChild><button type="button" aria-label="Close" disabled={busy === 'uploading'} className="grid size-9 place-items-center rounded-lg hover:bg-fill disabled:opacity-40"><XMarkIcon className="size-5" aria-hidden="true" /></button></Dialog.Close>
            </div>
            <button type="button" disabled={Boolean(busy)} onClick={() => input.current?.click()} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
              className={cn('grid shrink-0 justify-items-center gap-1 rounded-lg border border-dashed !border-line-strong bg-soft p-5 text-center hover:bg-fill', over && '!border-ink bg-fill')}>
              <CloudArrowUpIcon className="size-6 text-mute" aria-hidden="true" /><strong className="text-[13px] font-medium">{rows.length ? 'Choose different photos' : 'Drop photos here or choose files'}</strong><span className="text-xs text-mute">Up to {maximumFiles} at a time · 20 MB each</span>
            </button>
            <input ref={input} type="file" multiple accept={photoTypes} className="sr-only" tabIndex={-1} aria-label="Choose photos to upload" onChange={event => { void add(event.target.files); event.target.value = ''; }} />
            {message ? <p role="status" className="m-0 rounded-lg bg-fill px-3 py-2 text-[13px]">{message}</p> : null}
            {rows.length ? <>
              <p className="m-0 text-[13px] text-mute">{rows.filter(row => row.product).length} products matched · {rows.filter(row => !row.product).length} files not matched · {chosen.length} selected{done ? ` · ${done} uploaded` : ''}</p>
              <ul className="m-0 grid min-h-0 flex-1 list-none content-start gap-2 overflow-y-auto p-0" aria-label="Matched photos">
                {rows.map(row => <li key={row.key} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                  <input type="checkbox" aria-label={row.product ? `Upload for ${row.product.name}` : `Not matched: ${row.files[0]!.name}`} checked={row.include} disabled={!row.product || row.state === 'done' || Boolean(busy)} onChange={event => patch(row.key, { include: event.target.checked })} />
                  <Preview file={row.files[0]!} />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    {row.product ? <Link href={editorHref(row.product._id)} target="_blank" className="truncate text-[13px] font-medium text-ink">{row.product.name}</Link> : <span className="truncate text-[13px] font-medium">{row.files[0]!.name}</span>}
                    <span className="truncate text-xs text-mute">{row.product ? `${row.product.productId} · ` : ''}{row.files.length} {row.files.length === 1 ? 'photo' : 'photos'}{row.extra ? ` · ${row.extra} more ignored (limit 5)` : ''}</span>
                    {row.problem || row.note ? <span className={cn('text-xs', row.state === 'done' ? 'text-ok' : row.state === 'failed' || row.problem ? 'text-bad' : 'text-mute')}>{row.note || row.problem}</span> : null}
                  </span>
                  {row.state === 'uploading' ? <Badge tone="info">Uploading…</Badge> : row.state === 'done' ? <Badge tone="success">Done</Badge> : row.product && !row.product.missingPhoto ? <Badge tone="warning" className="normal-case">Has photos</Badge> : null}
                </li>)}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[13px]"><Switch checked={goLive} onCheckedChange={setGoLive} disabled={Boolean(busy)} aria-label="Make products live after upload" />Make products live after upload</label>
                <span className="flex gap-2">
                  {busy === 'uploading' ? <Button onClick={() => { stop.current = true; }}>Stop</Button> : null}
                  <Button variant="primary" disabled={Boolean(busy) || !chosen.length} onClick={() => void upload()}>{busy === 'uploading' ? 'Uploading…' : `Upload ${chosen.length} ${chosen.length === 1 ? 'product' : 'products'}`}</Button>
                </span>
              </div>
            </> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
