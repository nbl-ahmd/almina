'use client';
/* eslint-disable @next/next/no-img-element -- thumbnails come from the catalogue CDN or the legacy media origin. */
import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DocumentArrowUpIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  catalogueGapLabels, type BarcodeGtinResult, type EnrichmentApplyResult, type EnrichmentChange, type EnrichmentItem, type EnrichmentPreview,
} from '@almina/contracts';
import Link from '../app-link';
import { adminRequest } from './controls';
import { adminPortal, cn } from './cn';
import { Badge } from './ui';
import { Button } from './shadcn/button';
import { DataTable, selectColumn } from './shadcn/data-table';
import { editorHref } from '../../lib/admin/catalogue-links';

export type QueueRow = EnrichmentItem & { thumb: string | null };
const number = (value: number) => value.toLocaleString('en-AE');

function Thumb({ src }: { src: string | null }) {
  return <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-fill text-faint">
    {src ? <img src={src} alt="" width={40} height={40} loading="lazy" className="size-full object-contain" /> : <PhotoIcon className="size-5" aria-hidden="true" />}
  </span>;
}

/** The ranked enrichment list. Rows whose stored barcode is a valid, unused trade GTIN can be confirmed in bulk. */
export function EnrichmentTable({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<QueueRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const columns: ColumnDef<QueueRow, unknown>[] = [
    selectColumn<QueueRow>(),
    { id: 'product', header: 'Product', meta: { label: 'Product' }, cell: ({ row }) => <span className="flex min-w-0 items-center gap-3"><Thumb src={row.original.thumb} />
      <span className="grid min-w-0 text-left"><Link href={editorHref(row.original._id)} className="break-words font-medium text-ink">{row.original.name || 'Unnamed product'}</Link>
        <span className="text-xs text-mute">{row.original.productId}{row.original.brand ? ` · ${row.original.brand}` : ''}{row.original.barcode ? ` · ${row.original.barcode}` : ''}</span></span></span> },
    { id: 'missing', header: 'Missing', meta: { label: 'Missing' }, cell: ({ row }) => <span className="flex flex-wrap gap-1 md:justify-start">{row.original.gaps.map(gap => <Badge key={gap} tone={gap === 'photo' ? 'warning' : 'neutral'} className="normal-case">{catalogueGapLabels[gap]}</Badge>)}
      {row.original.barcodeGtin ? <Badge tone="info" className="normal-case">Barcode can be GTIN</Badge> : null}</span> },
    { id: 'why', header: 'Why now', meta: { label: 'Why now' }, cell: ({ row }) => <span className="block text-left text-[13px] text-ink-2">{row.original.reasons.join(' · ') || 'Hidden, not selling'}</span> },
    { id: 'stock', header: 'Stock', meta: { label: 'Stock', align: 'end' }, cell: ({ row }) => <span className="block text-right tabular-nums">{number(row.original.stock)}</span> },
    { id: 'sold', header: 'Sold, 90 days', meta: { label: 'Sold, 90 days', align: 'end' }, cell: ({ row }) => <span className="block text-right tabular-nums">{number(row.original.units90)}</span> },
    { id: 'actions', header: () => <span className="sr-only">Open</span>, cell: ({ row }) => <Link href={editorHref(row.original._id)} className="text-[13px] font-medium">Complete</Link> },
  ];
  async function apply(chosen: QueueRow[]) {
    setBusy(true);
    try {
      const { results } = await adminRequest('products/gtin-from-barcode', 'POST', { ids: chosen.map(row => row._id), confirmed: true }) as BarcodeGtinResult;
      const changed = results.filter(result => result.changed).length, refused = results.filter(result => !result.ok);
      if (changed) toast.success(`${changed} ${changed === 1 ? 'GTIN' : 'GTINs'} recorded from barcodes.`);
      for (const result of refused.slice(0, 3)) toast.error(`${chosen.find(row => row._id === result.id)?.name ?? 'Product'}: ${result.reason ?? 'Not changed.'}`);
      setConfirming(null);
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'GTINs were not saved. Try again.'); }
    finally { setBusy(false); }
  }
  return <>
    <DataTable caption="Products to enrich, highest priority first" data={rows} columns={columns} getRowId={row => row._id} selectable
      empty={{ title: 'Nothing to enrich here', description: 'Every product in this list has the details this filter checks.' }}
      bulk={(selected, clear) => {
        const eligible = selected.filter(row => row.barcodeGtin);
        return <Button size="sm" variant="primary" disabled={!eligible.length} onClick={() => { setConfirming(eligible); clear(); }}>
          {eligible.length ? `Use barcode as GTIN (${eligible.length})` : 'No selected barcode can be a GTIN'}
        </Button>;
      }} />
    {confirming ? <BarcodeGtinDialog products={confirming} busy={busy} onClose={() => setConfirming(null)} onApply={apply} /> : null}
  </>;
}

function BarcodeGtinDialog({ products, busy, onClose, onApply }: { products: QueueRow[]; busy: boolean; onClose: () => void; onApply: (chosen: QueueRow[]) => void }) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const chosen = products.filter(product => !excluded.includes(product._id));
  return (
    <Dialog.Root open onOpenChange={value => { if (!value) onClose(); }}>
      <Dialog.Portal container={adminPortal()}>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] flex max-h-[90dvh] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-surface p-5 text-ink shadow-pop max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-h-[94dvh] max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none">
          <div className="flex items-start justify-between gap-3">
            <div><Dialog.Title className="m-0 text-lg font-semibold">Use barcode as GTIN</Dialog.Title>
              <Dialog.Description className="m-0 mt-1 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">Only confirm a barcode printed on the manufacturer’s pack. A shelf label or a code the pharmacy made is not a GTIN. Untick any you cannot check.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-fill"><XMarkIcon className="size-5" aria-hidden="true" /></button></Dialog.Close>
          </div>
          <p className="m-0 text-[13px] text-mute" role="status">{chosen.length} of {products.length} will get a GTIN. Nothing else changes: visibility, price, stock and reviews stay as they are.</p>
          <ul className="m-0 grid max-h-[40dvh] min-h-24 shrink-0 list-none content-start gap-1.5 overflow-y-auto p-0" aria-label="Products to update">
            {products.map(product => <li key={product._id}><label className="flex cursor-pointer items-center gap-3 rounded-lg border !border-line p-2">
              <input type="checkbox" aria-label={`Include ${product.name}`} checked={!excluded.includes(product._id)}
                onChange={event => { setChecked(false); setExcluded(list => event.target.checked ? list.filter(id => id !== product._id) : [...list, product._id]); }} />
              <Thumb src={product.thumb} />
              <span className="grid min-w-0 text-left"><span className="break-words text-[13px] font-medium">{product.name}</span>
                <span className="text-xs text-mute">{product.productId} · barcode <span className="tabular-nums">{product.barcode}</span></span></span>
            </label></li>)}
          </ul>
          <label className="flex cursor-pointer items-start gap-2.5 border-t border-line pt-3 text-[13px]">
            <input type="checkbox" className="mt-0.5" checked={checked} disabled={!chosen.length} onChange={event => setChecked(event.target.checked)} />
            <span>I checked that each ticked barcode is the one printed on the manufacturer’s pack.</span>
          </label>
          <div className="flex justify-end gap-2 max-sm:flex-col-reverse">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!checked || !chosen.length || busy} onClick={() => onApply(chosen)}>{busy ? 'Saving…' : `Save ${chosen.length} ${chosen.length === 1 ? 'GTIN' : 'GTINs'}`}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const fieldLabels: Record<EnrichmentChange['field'], string> = {
  brand: 'Brand', manufacturer: 'Manufacturer', gtin: 'GTIN', mpn: 'MPN', identifierStatus: 'Identifier status', packLabel: 'Pack size', saleUnit: 'Sale unit', description: 'Description',
};
const clip = (value: string) => value.length > 120 ? `${value.slice(0, 117)}…` : value;

/** Upload a filled-in enrichment sheet, see every change, then confirm. Nothing is written before the confirmation. */
export function EnrichmentImport() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState<EnrichmentPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EnrichmentApplyResult | null>(null);
  const [progress, setProgress] = useState('');
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null); setResult(null); setConfirmed(false);
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error('The file is larger than 1 MB. Split it into smaller files.'); return; }
    setFileName(file.name); setContent(await file.text());
  }
  async function check(replace = overwrite) {
    setBusy(true); setConfirmed(false); setResult(null);
    try { setPreview(await adminRequest('products/enrichment/preview', 'POST', { content, overwrite: replace }) as EnrichmentPreview); }
    catch { toast.error('The file could not be read. Use the downloaded sheet, keep its column names and save it as CSV.'); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!preview) return;
    setBusy(true);
    // Rounds of a few products, so a large file never runs into a request time limit; each round is complete on its own.
    const groups = preview.rows.filter(row => row.changes.length).map(row => row.changes);
    const total: EnrichmentApplyResult = { applied: 0, products: 0, skipped: [] };
    try {
      for (let start = 0; start < groups.length; start += 25) {
        setProgress(`Saving ${number(Math.min(start + 25, groups.length))} of ${number(groups.length)} products…`);
        const outcome = await adminRequest('products/enrichment/apply', 'POST', { changes: groups.slice(start, start + 25).flat(), confirmed: true }) as EnrichmentApplyResult;
        total.applied += outcome.applied; total.products += outcome.products; total.skipped.push(...outcome.skipped);
      }
      setPreview(null); setConfirmed(false);
      toast.success(`${number(total.applied)} ${total.applied === 1 ? 'detail' : 'details'} saved on ${number(total.products)} ${total.products === 1 ? 'product' : 'products'}.`);
    } catch {
      toast.error(total.products ? `Stopped after ${number(total.products)} ${total.products === 1 ? 'product' : 'products'}. Preview the file again to finish the rest.` : 'Nothing was saved. Try again.');
    } finally { setResult(total.products || total.skipped.length ? total : null); setProgress(''); setBusy(false); router.refresh(); }
  }
  const withChanges = preview?.rows.filter(row => row.changes.length) ?? [];
  const withNotes = preview?.rows.filter(row => row.notes.length) ?? [];
  const live = withChanges.filter(row => row.live).length;
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className={cn('inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-fill')}>
        <DocumentArrowUpIcon className="size-4" aria-hidden="true" />{fileName ? 'Choose another file' : 'Choose filled-in sheet'}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={event => { void choose(event); }} />
      </label>
      {fileName ? <span className="text-[13px] text-mute">{fileName}</span> : null}
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={overwrite} onChange={event => { setOverwrite(event.target.checked); if (preview) void check(event.target.checked); }} />Replace filled-in values</label>
      <Button size="sm" variant="primary" disabled={!content || busy} onClick={() => { void check(); }}>{busy && !preview ? 'Checking…' : 'Preview changes'}</Button>
    </div>
    {preview ? <div className="grid gap-3">
      <p className="m-0 text-[13px]" role="status"><strong>{number(preview.changeCount)}</strong> {preview.changeCount === 1 ? 'change' : 'changes'} on <strong>{number(preview.productCount)}</strong> {preview.productCount === 1 ? 'product' : 'products'}.
        {preview.errorCount ? ` ${number(preview.errorCount)} ${preview.errorCount === 1 ? 'row was' : 'rows were'} not matched.` : ''}{withNotes.length ? ` ${number(withNotes.length)} ${withNotes.length === 1 ? 'row has' : 'rows have'} notes below.` : ''}</p>
      {withChanges.length ? <div className="max-h-96 overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[13px]"><caption className="sr-only">Changes in the file</caption>
          <thead className="sticky top-0 bg-fill text-left"><tr><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 font-medium">Detail</th><th className="px-3 py-2 font-medium">Now</th><th className="px-3 py-2 font-medium">From the file</th></tr></thead>
          <tbody>{withChanges.flatMap(row => row.changes.map((change, index) => <tr key={`${row.line}-${change.field}`} className="odd:bg-soft">
            {index === 0 ? <td rowSpan={row.changes.length} className="px-3 py-2 align-top"><span className="font-medium">{row.name}</span><span className="block text-xs text-mute">{row.productId}{row.live ? ' · live' : ' · hidden'}</span></td> : null}
            <td className="px-3 py-2 align-top">{fieldLabels[change.field]}</td>
            <td className="px-3 py-2 align-top text-mute">{change.before ? clip(change.before) : '—'}</td>
            <td className="px-3 py-2 align-top">{clip(change.after)}</td>
          </tr>))}</tbody>
        </table>
      </div> : null}
      {withNotes.length ? <details className="rounded-lg bg-soft p-3 text-[13px]"><summary className="cursor-pointer font-medium">Notes ({number(withNotes.length)} {withNotes.length === 1 ? 'row' : 'rows'})</summary>
        <ul className="mb-0 mt-2 grid gap-1 pl-5">{withNotes.slice(0, 200).map(row => <li key={row.line}>Row {row.line}{row.productId ? ` (${row.productId})` : ''}: {row.notes.join(' ')}</li>)}</ul></details> : null}
      {preview.changeCount ? <>
        <label className="flex cursor-pointer items-start gap-2.5 border-t border-line pt-3 text-[13px]">
          <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
          <span>I checked these values against the pack, the manufacturer or an authorised supplier.{live ? ` ${number(live)} ${live === 1 ? 'product is' : 'products are'} live, so customers see the new details at once.` : ''} Products stay hidden or live as they are.</span>
        </label>
        <div><Button variant="primary" disabled={!confirmed || busy} onClick={() => { void apply(); }}>{busy ? progress || 'Saving…' : `Save ${number(preview.changeCount)} ${preview.changeCount === 1 ? 'change' : 'changes'}`}</Button></div>
      </> : null}
    </div> : null}
    {result ? <div role="status" className="rounded-lg bg-fill p-3 text-[13px]"><p className="m-0">Saved {number(result.applied)} {result.applied === 1 ? 'detail' : 'details'} on {number(result.products)} {result.products === 1 ? 'product' : 'products'}.</p>
      {result.skipped.length ? <ul className="mb-0 mt-2 grid gap-1 pl-5">{result.skipped.slice(0, 50).map(skip => <li key={`${skip.id}-${skip.field}`}>{fieldLabels[skip.field as EnrichmentChange['field']] ?? skip.field}: {skip.reason}</li>)}</ul> : null}</div> : null}
  </div>;
}
