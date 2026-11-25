'use client';
/* eslint-disable @next/next/no-img-element -- thumbnails come from the catalogue CDN or the legacy media origin. */
import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ArchiveBoxIcon, ArrowDownTrayIcon, EllipsisHorizontalIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, PhotoIcon, PlusIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import type { CatalogueContext, CatalogueItem, CatalogueList, CatalogueVisibilityResult } from '@almina/contracts';
import Link from '../app-link';
import { adminRequest } from './controls';
import { useConfirm } from './confirm-dialog';
import { Badge, Callout } from './ui';
import { cn } from './cn';
import { Button } from './shadcn/button';
import { Switch } from './shadcn/switch';
import { selectClass } from './shadcn/styles';
import { DataTable, selectColumn } from './shadcn/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './shadcn/dropdown-menu';
import { editorHref } from '../../lib/admin/catalogue-links';
import { withRateLimitRetry } from '../../lib/admin/catalogue-client';
import { imageFiles, photoTypes, uploadWithReceipt } from '../../lib/admin/photo-upload';

export type ProductRow = CatalogueItem & { thumb: string | null };

const money = (value: number | null) => value === null ? '—' : value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
const csv = (value: string | number | null) => {
  const text = String(value ?? '');
  // A leading =, +, - or @ would be run as a formula by spreadsheet programs.
  return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
};
const pause = (seconds: number) => toast.message(`Pausing ${seconds} seconds, then continuing.`);
const setVisibility = (ids: string[], live: boolean) => withRateLimitRetry(() => adminRequest('products/visibility', 'POST', { ids, live }) as Promise<CatalogueVisibilityResult>, pause);

/** One-click publish for a single product. */
function PublishSwitch({ product }: { product: ProductRow }) {
  const router = useRouter();
  const [pending, setPending] = useState<boolean | null>(null);
  const live = pending ?? product.live;
  async function change(next: boolean) {
    setPending(next);
    try {
      await withRateLimitRetry(() => adminRequest(`products/publish/${product._id}`, 'PUT'), pause);
      toast.success(next ? `${product.name} is live` : `${product.name} is hidden`); router.refresh();
    } catch (error) {
      setPending(null);
      // A product that cannot go live needs its type, name or price fixed: offer the editor.
      toast.error(error instanceof Error ? error.message : 'Could not change publishing.', { action: { label: 'Open product', onClick: () => router.push(editorHref(product._id)) }, duration: 8000 });
      return;
    }
    // Keep the new position until the refreshed row arrives.
    setTimeout(() => setPending(null), 4000);
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
      <Switch checked={live} disabled={pending !== null} onCheckedChange={change} aria-label={`${live ? 'Hide' : 'Publish'} ${product.name}`} />
      <span className="w-14">{live ? 'Live' : 'Hidden'}</span>
    </label>
  );
}

/** Click a number to edit it in place; Enter saves, Escape cancels. Uses the same update endpoint as the full editor. */
function QuickNumber({ value, label, step, onSave, children }: { value: number | string; label: string; step: string; onSave: (next: string) => Promise<void>; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);
  async function commit() {
    if (draft.trim() === String(value)) { setEditing(false); return; }
    setBusy(true);
    try { await onSave(draft.trim()); setEditing(false); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save.'); } finally { setBusy(false); }
  }
  if (!editing) return <button type="button" onClick={() => { setDraft(String(value)); setEditing(true); }} aria-label={`Edit ${label}`} className="-mx-2 rounded-md px-2 py-1 text-right outline-0 hover:bg-fill focus-visible:outline-2 focus-visible:outline-ink">{children}</button>;
  return <input autoFocus type="number" min={0} step={step} value={draft} disabled={busy} aria-label={label}
    onChange={event => setDraft(event.target.value)} onBlur={() => void commit()}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void commit(); } else if (event.key === 'Escape') setEditing(false); }}
    className="h-8 w-24 rounded-md border border-line-strong bg-surface px-2 text-right text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ink/80" />;
}

/** The product picture doubles as the fastest way to add one: click it, or drop files on it. */
function PhotoCell({ product, onFiles, busy }: { product: ProductRow; onFiles: (files: File[]) => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); const files = imageFiles(event.dataTransfer.files); if (files.length) onFiles(files); else toast.error('Drop JPG, PNG, WebP, GIF or AVIF photos.'); };
  return (
    <>
      <button type="button" disabled={busy} aria-label={`${product.missingPhoto ? 'Add photo to' : 'Replace photos of'} ${product.name}`} title="Click or drop photos here"
        onClick={() => input.current?.click()} onDrop={drop} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        className={cn('group relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border outline-0 focus-visible:outline-2 focus-visible:outline-ink',
          product.missingPhoto ? 'border-dashed !border-line-strong bg-soft text-mute hover:bg-fill' : '!border-transparent bg-fill text-faint', over && '!border-ink bg-fill', busy && 'animate-pulse')}>
        {product.thumb ? <img src={product.thumb} alt="" width={56} height={56} loading="lazy" className="size-full object-cover" /> : product.missingPhoto ? <PlusIcon className="size-5" aria-hidden="true" /> : <PhotoIcon className="size-5" aria-hidden="true" />}
      </button>
      <input ref={input} type="file" multiple accept={photoTypes} className="sr-only" tabIndex={-1} aria-label={`Photos for ${product.name}`}
        onChange={event => { const files = imageFiles(event.target.files); event.target.value = ''; if (files.length) onFiles(files); }} />
    </>
  );
}

const types = [{ value: 'general', label: 'General' }, { value: 'otc', label: 'Pharmacy medicine' }, { value: 'prescription', label: 'Prescription' }];
/** Product type is a pharmacy decision, so it is always chosen product by product, never in bulk. */
function TypeSelect({ product, onChoose }: { product: ProductRow; onChoose: (type: string) => Promise<void> }) {
  const [pending, setPending] = useState<string | null>(null);
  const value = pending ?? (types.some(type => type.value === product.productType) ? product.productType : '');
  return <span className="inline-block w-44"><select aria-label={`Type of ${product.name}`} disabled={pending !== null} value={value}
    onChange={async event => { const next = event.target.value; setPending(next); try { await onChoose(next); } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not change the type.'); } finally { setPending(null); } }}
    className={cn(selectClass, !value && '!border-warn')}>
    {value ? null : <option value="">Choose type…</option>}
    {types.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
  </select></span>;
}

function Status({ product }: { product: ProductRow }) {
  const tags: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }[] = [];
  if (product.missingPhoto) tags.push({ label: 'No photo', tone: 'warning' });
  if (product.issues.some(issue => issue.startsWith('Complete product name'))) tags.push({ label: 'Name incomplete', tone: 'warning' });
  if (product.productType === 'prescription') tags.push({ label: 'Not sold online', tone: 'danger' });
  else if (product.issues.some(issue => issue.startsWith('Product classification'))) tags.push({ label: 'No type', tone: 'warning' });
  if (!product.live && !product.price) tags.push({ label: 'No price', tone: 'warning' });
  if (product.ready) tags.push({ label: 'Ready to go live', tone: 'success' });
  return <span className="flex flex-wrap justify-end gap-1 md:justify-start">{tags.length ? tags.map(tag => <Badge key={tag.label} tone={tag.tone} className="normal-case">{tag.label}</Badge>) : <span className="text-xs text-mute">Complete</span>}</span>;
}

type Outcome = { changed: number; failed: { id: string; name: string; reason: string }[]; live: boolean; stopped: boolean };

export function ProductsTable({ products, admin, context, readyTotal }: { products: ProductRow[]; admin: boolean; context: CatalogueContext; readyTotal: number }) {
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const [uploading, setUploading] = useState<string[]>([]);
  const [publishAfterPhoto, setPublishAfterPhoto] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const stop = useRef(false);

  async function saveField(product: ProductRow, body: Record<string, string>, done: string) {
    if (body.price !== undefined && !/^\d+(\.\d{1,2})?$/.test(body.price)) throw new Error('Enter a price like 12.50.');
    if (body.stock !== undefined && !/^\d+$/.test(body.stock)) throw new Error('Stock must be a whole number.');
    await adminRequest(`products/${product._id}`, 'PUT', body);
    toast.success(`${done}: ${product.name}`);
    router.refresh();
  }
  async function chooseType(product: ProductRow, productType: string) {
    if (productType === 'prescription' && product.live) {
      if (!(await ask(`Prescription items are never sold online. ${product.name} will be hidden from the shop and marked as prescription.`, { action: 'Hide and mark' }))) return;
      const { results } = await setVisibility([product._id], false);
      if (!results[0]?.ok) throw new Error(results[0]?.reason ?? 'Could not hide the product.');
    }
    await saveField(product, { productType }, 'Type saved');
  }
  async function addPhotos(product: ProductRow, files: File[]) {
    if (files.length > 5) { toast.error('Choose up to five photos.'); return; }
    if (!product.missingPhoto && !(await ask(`${product.name} already has photos. The ${files.length === 1 ? 'new photo replaces' : 'new photos replace'} them in the shop; earlier files are kept in history.`, { action: 'Replace photos' }))) return;
    setUploading(list => [...list, product._id]);
    try {
      await uploadWithReceipt(product._id, files, product.mediaRevision, pause);
      let message = `Photo added: ${product.name}`;
      if (publishAfterPhoto && !product.live) {
        const { results } = await setVisibility([product._id], true);
        message = results[0]?.ok ? `Photo added and live: ${product.name}` : `Photo added. ${product.name} stays hidden: ${results[0]?.reason}`;
      }
      toast.success(message);
      router.refresh();
    } catch (error) { toast.error(`${product.name}: ${error instanceof Error ? error.message : 'upload failed.'} Drop the same photos again to retry.`, { duration: 10000 }); }
    finally { setUploading(list => list.filter(id => id !== product._id)); }
  }
  async function archive(rows: ProductRow[]) {
    let failed = 0;
    for (const row of rows) { try { await withRateLimitRetry(() => adminRequest(`products/${row._id}`, 'DELETE'), pause); } catch { failed++; } }
    if (failed) toast.error(`${failed} of ${rows.length} could not be archived.`); else toast.success(rows.length === 1 ? 'Product archived' : `${rows.length} products archived`);
    router.refresh();
  }
  /** Changes visibility in server-sized batches, remembering why any product was left as it was. */
  async function changeMany(nextBatch: () => Promise<{ _id: string; name: string }[]>, live: boolean, total: number) {
    stop.current = false; setOutcome(null); setProgress({ done: 0, total });
    const result: Outcome = { changed: 0, failed: [], live, stopped: false };
    try {
      let done = 0;
      for (;;) {
        if (stop.current) { result.stopped = true; break; }
        const batch = await nextBatch();
        if (!batch.length) break;
        const { results } = await setVisibility(batch.map(item => item._id), live);
        for (const row of results) {
          if (!row.ok) result.failed.push({ id: row.id, name: batch.find(item => item._id === row.id)?.name ?? row.id, reason: row.reason ?? 'Not changed.' });
          else if (row.changed) result.changed++;
        }
        done += batch.length; setProgress({ done, total: Math.max(total, done) });
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The change stopped part way. Run it again to finish.'); result.stopped = true; }
    finally { setProgress(null); setOutcome(result); router.refresh(); }
  }
  async function bulkVisibility(rows: ProductRow[], live: boolean) {
    const without = rows.filter(row => row.missingPhoto && !row.live).length;
    const question = live
      ? `Make ${rows.length} ${rows.length === 1 ? 'product' : 'products'} live? Customers can buy them straight away, and their current price and stock are recorded as checked.${without ? ` ${without} ${without === 1 ? 'has' : 'have'} no photo.` : ''} Products missing a name, type or price stay hidden.`
      : `Hide ${rows.length} ${rows.length === 1 ? 'product' : 'products'} from the shop?`;
    if (!(await ask(question, { action: live ? 'Make live' : 'Hide', danger: !live }))) return false;
    let offset = 0;
    await changeMany(async () => { const batch = rows.slice(offset, offset + 50); offset += batch.length; return batch; }, live, rows.length);
    return true;
  }
  async function allReady() {
    if (!(await ask(`Make all ${readyTotal.toLocaleString('en-AE')} ready products${context.q ? ` matching “${context.q}”` : ''} live? Each has a photo, a complete name, a type and a price. Customers can buy them straight away, and their current price and stock are recorded as checked. You can stop part way.`, { action: 'Make all live' }))) return;
    const tried = new Set<string>();
    await changeMany(async () => {
      // Products that go live leave this list, so each request reads from the top and skips the ones already refused.
      for (let offset = 0; ; offset += 100) {
        const params = new URLSearchParams({ view: 'hidden', filter: 'ready', limit: '100', offset: String(offset), ...(context.q ? { q: context.q } : {}), ...(context.category ? { category: context.category } : {}) });
        const page = await withRateLimitRetry(() => adminRequest(`products/catalogue?${params}`) as Promise<CatalogueList>, pause);
        const batch = page.items.filter(item => !tried.has(item._id)).slice(0, 50);
        if (batch.length || page.items.length < 100) { batch.forEach(item => tried.add(item._id)); return batch; }
      }
    }, true, readyTotal);
  }

  const columns: ColumnDef<ProductRow, unknown>[] = [
    ...(admin ? [selectColumn<ProductRow>()] : []),
    { accessorKey: 'name', header: 'Product', meta: { label: 'Product', primary: true },
      cell: ({ row }) => (
        <span className="flex items-center gap-3 md:w-[260px] xl:w-auto xl:min-w-[260px]">
          {admin ? <PhotoCell product={row.original} busy={uploading.includes(row.original._id)} onFiles={files => void addPhotos(row.original, files)} />
            : <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-fill text-faint">{row.original.thumb ? <img src={row.original.thumb} alt="" width={56} height={56} loading="lazy" className="size-full object-cover" /> : <PhotoIcon className="size-5" aria-hidden="true" />}</span>}
          <Link href={editorHref(row.original._id, context)} className="group grid min-w-0 text-left text-ink no-underline">
            <span className="line-clamp-2 font-medium group-hover:underline">{row.original.name}</span>
            <span className="truncate text-xs text-mute"><span className="font-mono">{row.original.productId}</span>{row.original.category ? ` · ${row.original.category}` : ''}{row.original.brand ? ` · ${row.original.brand}` : ''}</span>
          </Link>
        </span>
      ) },
    { accessorKey: 'productType', header: 'Type', meta: { label: 'Type' },
      cell: ({ row }) => admin ? <TypeSelect product={row.original} onChoose={next => chooseType(row.original, next)} /> : types.find(type => type.value === row.original.productType)?.label ?? 'Not chosen' },
    { accessorKey: 'price', header: 'Price (AED)', meta: { label: 'Price', align: 'end' },
      cell: ({ row }) => {
        const shown = row.original.salePrice ? <span className="grid justify-items-end leading-tight"><span>{money(row.original.salePrice)}</span><s className="text-xs text-mute">{money(row.original.price)}</s></span> : money(row.original.price);
        return admin ? <QuickNumber value={row.original.price ?? ''} label={`price for ${row.original.name}`} step="0.01" onSave={next => saveField(row.original, { price: next }, 'Price updated')}>{shown}</QuickNumber> : shown;
      } },
    { accessorKey: 'stock', header: 'Stock', meta: { label: 'Stock', align: 'end' },
      cell: ({ row }) => {
        const stock = row.original.stock ?? 0;
        const shown = stock <= 0 ? <Badge tone="danger" className="normal-case">Out of stock</Badge> : stock <= 5 ? <span className="text-warn">{stock} left</span> : stock;
        return admin ? <QuickNumber value={stock} label={`stock for ${row.original.name}`} step="1" onSave={next => saveField(row.original, { stock: next, expectedStock: String(row.original.stock), stockReason: 'Quick edit', inventoryKey: crypto.randomUUID() }, 'Stock updated')}>{shown}</QuickNumber> : shown;
      } },
    { id: 'todo', accessorFn: row => (row.ready ? 0 : row.issues.length + (row.missingPhoto ? 1 : 0)), header: 'To do', meta: { label: 'To do' }, cell: ({ row }) => <Status product={row.original} /> },
    { id: 'status', accessorFn: row => (row.live ? 0 : 1), header: 'Status', meta: { label: 'Status' },
      cell: ({ row }) => admin ? <PublishSwitch product={row.original} /> : row.original.live ? <Badge tone="success" dot>Live</Badge> : <Badge tone="neutral">Hidden</Badge> },
    ...(admin ? [{ id: 'actions', header: () => <span className="sr-only">Actions</span>, enableSorting: false, enableHiding: false, meta: { align: 'end' as const },
      cell: ({ row }: { row: { original: ProductRow } }) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon"><Link href={editorHref(row.original._id, context)} aria-label={`Edit ${row.original.name}`}><PencilSquareIcon className="size-[18px]" aria-hidden="true" /></Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`More actions for ${row.original.name}`}><EllipsisHorizontalIcon className="size-[18px]" aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={editorHref(row.original._id, context)}>Edit product</Link></DropdownMenuItem>
              <DropdownMenuItem variant="danger" onSelect={async () => { if (await ask('Archive this product while preserving history and images?', { action: 'Archive product', danger: true })) void archive([row.original]); }}>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) }] : []),
  ];
  return (
    <>
      {dialog}
      {progress ? <Callout role="status"><p><strong className="tabular-nums">{progress.done.toLocaleString('en-AE')} of {progress.total.toLocaleString('en-AE')}</strong> processed. Keep this page open.</p><Button size="sm" onClick={() => { stop.current = true; }}>Stop</Button></Callout> : null}
      {outcome ? <div className="mb-4 grid gap-2 rounded-2xl bg-surface px-4 py-3 text-[13px] shadow-card" role="status">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="m-0"><strong>{outcome.changed.toLocaleString('en-AE')} {outcome.changed === 1 ? 'product is' : 'products are'} now {outcome.live ? 'live' : 'hidden'}.</strong>{outcome.failed.length ? ` ${outcome.failed.length} not changed.` : ''}{outcome.stopped ? ' Stopped before the end.' : ''}</p><Button size="sm" variant="ghost" onClick={() => setOutcome(null)}>Dismiss</Button></div>
        {outcome.failed.length ? <details><summary className="cursor-pointer font-medium">Products not changed</summary><ul className="m-0 mt-2 grid max-h-48 list-none gap-1 overflow-y-auto p-0">{outcome.failed.map(item => <li key={item.id}><Link className="font-medium text-ink underline" href={editorHref(item.id, context)}>{item.name}</Link> · <span className="text-mute">{item.reason}</span></li>)}</ul></details> : null}
      </div> : null}
      {admin && context.filter === 'ready' && readyTotal > 0 ? <Callout><p><strong>{readyTotal.toLocaleString('en-AE')} hidden {readyTotal === 1 ? 'product has' : 'products have'} everything needed to go live.</strong></p><Button variant="primary" size="sm" disabled={progress !== null} onClick={() => void allReady()}><RocketLaunchIcon className="size-4" aria-hidden="true" />Make all {readyTotal.toLocaleString('en-AE')} live</Button></Callout> : null}
      <DataTable caption="Product inventory" data={products} columns={columns} getRowId={row => row._id} selectable={admin}
        toolbar={admin ? <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2"><Switch checked={publishAfterPhoto} onCheckedChange={setPublishAfterPhoto} aria-label="Go live after adding a photo" />Go live after adding a photo</label> : undefined}
        empty={{ title: 'No products match', description: 'Try another view, filter or search term.' }}
        bulk={(rows, clear) => (
          <>
            <Button variant="primary" size="sm" disabled={progress !== null} onClick={async () => { if (await bulkVisibility(rows, true)) clear(); }}><EyeIcon className="size-4" aria-hidden="true" />Make live</Button>
            <Button variant="outline" size="sm" disabled={progress !== null} onClick={async () => { if (await bulkVisibility(rows, false)) clear(); }}><EyeSlashIcon className="size-4" aria-hidden="true" />Hide</Button>
            <Button variant="outline" size="sm" onClick={() => { download('products.csv', ['Product ID,Name,Category,Price,Stock', ...rows.map(row => [row.productId, row.name, row.category, row.price, row.stock].map(csv).join(','))].join('\r\n')); clear(); }}><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Export</Button>
            <Button variant="outline" size="sm" onClick={async () => { if (await ask(`Archive ${rows.length} product${rows.length === 1 ? '' : 's'} while preserving history and images?`, { action: 'Archive', danger: true })) { await archive(rows); clear(); } }}><ArchiveBoxIcon className="size-4" aria-hidden="true" />Archive</Button>
          </>
        )} />
    </>
  );
}
