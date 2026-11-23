'use client';
/* eslint-disable @next/next/no-img-element -- thumbnails come from the catalogue CDN or the legacy media origin. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ArchiveBoxIcon, ArrowDownTrayIcon, EllipsisHorizontalIcon, PencilSquareIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from '../app-link';
import { adminRequest } from './controls';
import { useConfirm } from './confirm-dialog';
import { Badge } from './ui';
import { Button } from './shadcn/button';
import { Switch } from './shadcn/switch';
import { DataTable, selectColumn } from './shadcn/data-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './shadcn/dropdown-menu';

export type ProductRow = {
  _id: string; name: string; product_id: string; category: string; image: string | null;
  price: number | string; salePrice: number | string | null; stock: number | string; disabled: boolean;
};

const money = (value: number | string) => Number(value).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

/** One-click publish: the switch calls the same endpoint as the old "Toggle publishing" menu item. */
function PublishSwitch({ product }: { product: ProductRow }) {
  const router = useRouter();
  const [live, setLive] = useState(!product.disabled);
  const [busy, setBusy] = useState(false);
  async function change(next: boolean) {
    setLive(next); setBusy(true);
    try { await adminRequest(`products/publish/${product._id}`, 'PUT'); toast.success(next ? `${product.name} is live` : `${product.name} is hidden`); router.refresh(); }
    catch (error) {
      setLive(!next);
      // A product that cannot go live needs its type or name fixed: take the reviewer straight to the editor.
      toast.error(error instanceof Error ? error.message : 'Could not change publishing.', { action: { label: 'Open product', onClick: () => router.push(`/admin/products/${product._id}`) }, duration: 8000 });
    }
    finally { setBusy(false); }
  }
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
      <Switch checked={live} disabled={busy} onCheckedChange={change} aria-label={`${live ? 'Hide' : 'Publish'} ${product.name}`} />
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

export function ProductsTable({ products, admin }: { products: ProductRow[]; admin: boolean }) {
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  async function saveField(product: ProductRow, body: Record<string, string>, done: string) {
    const price = body.price;
    if (price !== undefined && !/^\d+(\.\d{1,2})?$/.test(price)) throw new Error('Enter a price like 12.50.');
    if (body.stock !== undefined && !/^\d+$/.test(body.stock)) throw new Error('Stock must be a whole number.');
    await adminRequest(`products/${product._id}`, 'PUT', body);
    toast.success(`${done}: ${product.name}`);
    router.refresh();
  }
  async function archive(rows: ProductRow[]) {
    let failed = 0;
    for (const row of rows) { try { await adminRequest(`products/${row._id}`, 'DELETE'); } catch { failed++; } }
    if (failed) toast.error(`${failed} of ${rows.length} could not be archived.`); else toast.success(rows.length === 1 ? 'Product archived' : `${rows.length} products archived`);
    router.refresh();
  }
  const columns: ColumnDef<ProductRow, unknown>[] = [
    ...(admin ? [selectColumn<ProductRow>()] : []),
    { accessorKey: 'name', header: 'Product', meta: { label: 'Product' },
      cell: ({ row }) => (
        <Link href={`/admin/products/${row.original._id}`} className="group flex items-center gap-3 text-ink no-underline">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-fill text-faint">
            {row.original.image ? <img src={row.original.image} alt="" width={40} height={40} loading="lazy" className="size-full object-cover" /> : <PhotoIcon className="size-5" aria-hidden="true" />}
          </span>
          <span className="grid min-w-0 text-left"><span className="truncate font-medium group-hover:underline">{row.original.name}</span><span className="truncate text-xs text-mute">{row.original.category}</span></span>
        </Link>
      ) },
    { accessorKey: 'product_id', header: 'ID', meta: { label: 'ID' }, cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs text-mute">{row.original.product_id}</span> },
    { accessorKey: 'price', header: 'Price (AED)', meta: { label: 'Price', align: 'end' }, sortingFn: (a, b) => Number(a.original.price) - Number(b.original.price),
      cell: ({ row }) => {
        const shown = row.original.salePrice ? <span className="grid justify-items-end leading-tight"><span>{money(row.original.salePrice)}</span><s className="text-xs text-mute">{money(row.original.price)}</s></span> : money(row.original.price);
        return admin ? <QuickNumber value={row.original.price} label={`price for ${row.original.name}`} step="0.01" onSave={next => saveField(row.original, { price: next }, 'Price updated')}>{shown}</QuickNumber> : shown;
      } },
    { accessorKey: 'stock', header: 'Stock', meta: { label: 'Stock', align: 'end' }, sortingFn: (a, b) => Number(a.original.stock) - Number(b.original.stock),
      cell: ({ row }) => {
        const shown = Number(row.original.stock) <= 0 ? <Badge tone="danger">Out of stock</Badge> : Number(row.original.stock) <= 5 ? <span className="text-warn">{row.original.stock} left</span> : row.original.stock;
        return admin ? <QuickNumber value={row.original.stock} label={`stock for ${row.original.name}`} step="1" onSave={next => saveField(row.original, { stock: next, expectedStock: String(row.original.stock), stockReason: 'Quick edit', inventoryKey: crypto.randomUUID() }, 'Stock updated')}>{shown}</QuickNumber> : shown;
      } },
    { id: 'status', accessorFn: row => (row.disabled ? 1 : 0), header: 'Status', meta: { label: 'Status' },
      cell: ({ row }) => admin ? <PublishSwitch product={row.original} /> : row.original.disabled ? <Badge tone="neutral">Hidden</Badge> : <Badge tone="success" dot>Live</Badge> },
    { id: 'actions', header: () => <span className="sr-only">Actions</span>, enableSorting: false, enableHiding: false, meta: { align: 'end' },
      cell: ({ row }) => admin ? (
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="icon"><Link href={`/admin/products/${row.original._id}`} aria-label={`Edit ${row.original.name}`}><PencilSquareIcon className="size-[18px]" aria-hidden="true" /></Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`More actions for ${row.original.name}`}><EllipsisHorizontalIcon className="size-[18px]" aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={`/admin/products/${row.original._id}`}>Edit product</Link></DropdownMenuItem>
              <DropdownMenuItem variant="danger" onSelect={async () => { if (await ask('Archive this product while preserving history and images?', { action: 'Archive product', danger: true })) void archive([row.original]); }}>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : <span className="text-xs text-mute">Read-only</span> },
  ];
  return (
    <>
      {dialog}
      <DataTable caption="Product inventory" data={products} columns={columns} getRowId={row => row._id} selectable={admin}
        empty={{ title: 'No products match', description: 'Try another view or search term.' }}
        bulk={(rows, clear) => (
          <>
            <Button variant="outline" size="sm" onClick={() => { download('products.csv', ['Product ID,Name,Category,Price,Stock', ...rows.map(row => [row.product_id, `"${row.name.replaceAll('"', '""')}"`, `"${row.category}"`, row.price, row.stock].join(','))].join('\r\n')); clear(); }}><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Export</Button>
            <Button variant="outline" size="sm" onClick={async () => { if (await ask(`Archive ${rows.length} product${rows.length === 1 ? '' : 's'} while preserving history and images?`, { action: 'Archive', danger: true })) { await archive(rows); clear(); } }}><ArchiveBoxIcon className="size-4" aria-hidden="true" />Archive</Button>
            <Button variant="ghost" size="icon" aria-label="Clear selection" onClick={clear}><XMarkIcon className="size-4" aria-hidden="true" /></Button>
          </>
        )} />
    </>
  );
}
