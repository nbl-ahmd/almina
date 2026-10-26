'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { imageReviewPackageSchema, type ImageIdentityField, type ImageReviewList, type ImageReviewDetail, type ImageReviewDecisionInput, type ImageReviewApprovedMapping, type ImageReviewManifest } from '@almina/contracts';
import { adminRequest, AdminRateLimitError } from './controls';
import { Button, PageHeader } from './ui';
import { imagePublicationStorageKey, planImagePublication, readImagePublication, runImagePublication } from '../../lib/admin/image-review-publication';

const labels: Record<ImageIdentityField, string> = { name: 'Product name', brand: 'Brand', line: 'Product line', strength: 'Strength / concentration', form: 'Form', size: 'Net content', quantity: 'Count', multipack: 'Multipack', flavour: 'Flavour / fragrance', shadeModel: 'Shade / model', variantSize: 'Size', ageStage: 'Age / stage', barcode: 'Barcode', gtin: 'GTIN' };
const emptyCounts = { pending: 0, held: 0, approved: 0, rejected: 0, imported: 0 };
const tabs = ['pending', 'held', 'approved', 'imported', 'rejected', 'all'] as const;
type Filter = typeof tabs[number];
type Check = ImageReviewDecisionInput['checks'][number];
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
export function ImageReviewManager({ initial, admin }: { initial: ImageReviewList; admin: boolean }) {
  const [list, setList] = useState(initial), [filter, setFilter] = useState<Filter>('pending');
  const [detail, setDetail] = useState<ImageReviewDetail | null>(null), [checks, setChecks] = useState<Check[]>([]);
  const [viewed, setViewed] = useState(false), [loaded, setLoaded] = useState(false), [note, setNote] = useState(''), [sharedConfirmed, setSharedConfirmed] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [productId, setProductId] = useState('');
  const [searchResults, setSearchResults] = useState<{ productId: string; name: string }[]>([]);
  const [additionalField, setAdditionalField] = useState<ImageIdentityField | ''>('');
  const [selected, setSelected] = useState<string[]>([]), [preview, setPreview] = useState<ImageReviewManifest | null>(null);
  const file = useRef<HTMLInputElement>(null), title = useRef<HTMLHeadingElement>(null);
  const retry = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const publishRetry = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const activeItem = detail?.item.itemId;
  useEffect(() => { if (activeItem) title.current?.focus(); }, [activeItem, viewKey]);
  function populate(value: ImageReviewDetail) {
    setAdditionalField('');
    setViewKey(key => key + 1);
    setDetail(value); setChecks(value.comparison.filter(row => row.required).map(row => ({ field: row.field, imageValue: row.imageValue, catalogueValue: row.catalogueValue, confirmed: false, evidence: '' })));
    setViewed(false); setLoaded(false); setNote(''); setSharedConfirmed(false); setProductId(value.product?.productId ?? ''); setSearchResults([]); retry.current = null;
  }
  async function task(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'The request failed. Your saved reviews are retained.'); }
    finally { setBusy(false); }
  }
  async function refresh(status = filter, after?: string) {
    const qs = new URLSearchParams({ status, ...(after ? { after } : {}) });
    const value = await adminRequest(`image-review?${qs}`) as ImageReviewList; setList(value); setSelected([]); setPreview(null);
    return value;
  }
  const open = (id: string) => task(async () => { populate(await adminRequest(`image-review/${id}`) as ImageReviewDetail); title.current?.focus(); });
  async function choose(id: string) {
    if (!detail) return;
    await task(async () => populate(await adminRequest('image-review/select', 'POST', { itemId: detail.item.itemId, productId: id }) as ImageReviewDetail));
  }
  async function search() {
    await task(async () => {
      const value = await adminRequest('products/search?' + new URLSearchParams({ q: query, limit: '8' }));
      const records = Array.isArray(value) ? value : value && typeof value === 'object' && 'products' in value && Array.isArray(value.products) ? value.products : [];
      setSearchResults(records.filter((r): r is { product_id: string; name: string } => !!r && typeof r === 'object' && typeof r.product_id === 'string' && typeof r.name === 'string').map(r => ({ productId: r.product_id, name: r.name })));
    });
  }
  async function save(decision: 'approved' | 'held' | 'rejected') {
    if (!detail) return;
    await task(async () => {
      const input = { itemId: detail.item.itemId, expectedRevision: detail.item.revision, productId: detail.product?.productId ?? null, productRevision: detail.product?.revision ?? null,
        decision, originalViewed: viewed, sharedIdentifierConfirmed: sharedConfirmed, checks, note };
      const fingerprint = JSON.stringify(input);
      if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, requestId: crypto.randomUUID() };
      await adminRequest('image-review/decide', 'POST', { ...input, requestId: retry.current.requestId });
      const next = await refresh(); setDetail(null);
      setMessage(decision === 'approved' ? 'Approval saved. The image is now in the approved export list.' : decision === 'held' ? 'Saved for further review.' : 'Proposed association rejected. The original image is retained.');
      const following = ['pending', 'held'].includes(filter) ? next.items.find(item => item.itemId !== detail.item.itemId) : undefined;
      if (following) {
        try { populate(await adminRequest(`image-review/${following.itemId}`) as ImageReviewDetail); }
        catch { setMessage('Review saved. The next image could not load; choose it from the queue to retry.'); }
      }
    });
  }
  function changeCheck(field: ImageIdentityField, patch: Partial<Check>) { setChecks(values => values.map(value => value.field === field ? { ...value, ...patch } : value)); }
  function confirmMatching() {
    if (!viewed || !detail) return;
    setChecks(values => values.map(check => detail.comparison.find(row => row.field === check.field)?.status === 'match' && check.imageValue === detail.item.source.identity[check.field] ? { ...check, confirmed: true } : check));
    if (!note.trim()) setNote('Original label inspected; matching attributes verified.');
  }
  function chooseNone() {
    if (detail) populate({ ...detail, product: null, comparison: [], sharedIdentifiers: [], withdrawalReason: null });
  }
  async function upload() {
    const chosen = file.current?.files?.[0]; if (!chosen) return;
    await task(async () => {
      if (chosen.size > 16 * 1024 * 1024) throw new Error('Choose a review package smaller than 16 MB.');
      const content = await chosen.text();
      const parsed = imageReviewPackageSchema.safeParse(JSON.parse(content));
      if (!parsed.success) throw new Error('This is not a pipeline review package. Use the image-review-package.json export.');
      const { items, ...context } = parsed.data;
      const fingerprint = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content)))].map(n => n.toString(16).padStart(2, '0')).join('');
      const progress = await adminRequest('image-review/uploads/' + fingerprint) as { processed: number; total: number | null };
      if (progress.total !== null && progress.total !== items.length) throw new Error('The saved package checkpoint does not match this file.');
      let processed = progress.processed;
      while (processed < items.length) {
        let size = Math.min(25, items.length - processed);
        while (size > 1 && new TextEncoder().encode(JSON.stringify({ ...context, items: items.slice(processed, processed + size), upload: { packageId: fingerprint, offset: processed, total: items.length } })).byteLength > 120 * 1024) size--;
        const chunk = { ...context, items: items.slice(processed, processed + size), upload: { packageId: fingerprint, offset: processed, total: items.length } };
        if (new TextEncoder().encode(JSON.stringify(chunk)).byteLength > 120 * 1024) throw new Error('One source record is too large. Re-export a smaller label transcript. Previously loaded items are saved.');
        for (let attempt = 0; ; attempt++) {
          try { await adminRequest('image-review/stage', 'POST', chunk); break; }
          catch (failure) {
            if (!(failure instanceof AdminRateLimitError) || attempt >= 2) throw failure;
            setMessage(`${processed} / ${items.length} saved. Waiting ${failure.retryAfterSeconds} seconds before continuing automatically.`);
            await new Promise(resolve => setTimeout(resolve, failure.retryAfterSeconds * 1000));
          }
        }
        processed += size; setMessage(`${processed} / ${items.length} image maps loaded. Reopening the same file safely resumes.`);
        if (processed < items.length) await new Promise(resolve => setTimeout(resolve, 1500));
      }
      await refresh('pending'); setFilter('pending'); setMessage(`${processed} image maps loaded for pharmacist review. Prior pipeline decisions remain supporting evidence.`);
    });
  }
  async function exportApproved() {
    await task(async () => {
      const mappings: ImageReviewApprovedMapping[] = [], stale: string[] = []; let after: string | null = null;
      do {
        const value = await adminRequest('image-review/export' + (after ? `?after=${after}` : '')) as { mappings: ImageReviewApprovedMapping[]; staleItemIds: string[]; nextAfter: string | null };
        mappings.push(...value.mappings); stale.push(...value.staleItemIds); after = value.nextAfter;
      } while (after);
      download('approved-image-mappings.json', { schemaVersion: 'image-review-approved-export-v1', mappings, staleItemIds: stale });
      setMessage(`${mappings.length} current approvals exported.${stale.length ? ` ${stale.length} changed products need a fresh review.` : ''}`);
    });
  }
  async function previewImport() {
    await task(async () => setPreview(await adminRequest('image-review/preview', 'POST', { approvalIds: selected }) as ImageReviewManifest));
  }
  async function publish() {
    if (!admin || !selected.length) return;
    await task(async () => {
      const approvalIds = [...selected].sort(), fingerprint = JSON.stringify(approvalIds);
      if (publishRetry.current?.fingerprint !== fingerprint) publishRetry.current = { fingerprint, requestId: crypto.randomUUID() };
      setMessage(`Publishing ${approvalIds.length} approved ${approvalIds.length === 1 ? 'image' : 'images'}…`);
      const result = await adminRequest('image-review/publish', 'POST', { approvalIds, requestId: publishRetry.current.requestId }) as { imported: number; replayed: boolean };
      await refresh(); setDetail(null);
      setMessage(`${result.imported} approved ${result.imported === 1 ? 'image is' : 'images are'} ${result.replayed ? 'already linked' : 'now linked'} to the catalogue. Existing photos and product publication status are unchanged.`);
    });
  }
  async function publishAll() {
    if (!admin || busy) return;
    await task(async () => {
      const saved = localStorage.getItem(imagePublicationStorageKey);
      let plan;
      if (saved) plan = readImagePublication(saved);
      else {
        const rows: ImageReviewList['items'] = []; let after: string | null = null;
        setMessage('Collecting all approved images…');
        do {
          const page = await adminRequest('image-review?' + new URLSearchParams({ status: 'approved', limit: '25', ...(after ? { after } : {}) })) as ImageReviewList;
          rows.push(...page.items); after = page.nextAfter;
        } while (after);
        plan = planImagePublication(rows, () => crypto.randomUUID());
      }
      const count = await runImagePublication(plan,
        value => localStorage.setItem(imagePublicationStorageKey, JSON.stringify(value)),
        async request => {
          for (let attempt = 0; ; attempt++) {
            try { return await adminRequest('image-review/publish', 'POST', request); }
            catch (failure) {
              if (!(failure instanceof AdminRateLimitError) || attempt >= 2) throw failure;
              setMessage(`Waiting ${failure.retryAfterSeconds} seconds before continuing. Progress is saved.`);
              await new Promise(resolve => setTimeout(resolve, failure.retryAfterSeconds * 1000));
            }
          }
        },
        (done, total, id) => setMessage(`Publishing product ${done + 1} of ${total} · ${id}. Keep this page open. Progress is saved for resuming.`));
      localStorage.removeItem(imagePublicationStorageKey);
      await refresh(); setDetail(null);
      setMessage(`${count} approved image associations published. Images approved after this run began can be published with another click.`);
    });
  }
  async function apply() {
    if (!preview) return;
    await task(async () => {
      const result = await adminRequest('image-review/import', 'POST', { manifestId: preview.manifestId, approvalIds: preview.mappings.map(m => m.approvalId) }) as { imported: number; replayed: boolean };
      await refresh(); setDetail(null); setMessage(`${result.imported} approved image associations ${result.replayed ? 'were already imported' : 'imported'}. Existing photos are retained.`);
    });
  }
  const ready = !!detail?.product && !detail.withdrawalReason && !detail.item.source.flags.length && viewed && checks.length > 0 && checks.every(c => {
    const row = detail.comparison.find(r => r.field === c.field)!;
    const corrected = c.imageValue !== row.imageValue;
    return c.confirmed && c.imageValue.trim() && c.catalogueValue.trim() && (row.status !== 'conflict' || corrected) && ((row.status === 'match' && !corrected) || c.evidence.trim().length >= 10);
  }) && (!detail.sharedIdentifiers.length || sharedConfirmed) && note.trim().length >= 5;
  const counts = list.counts ?? emptyCounts;
  return <>
    <PageHeader title="Image review" description="Check the original, confirm the product, then save your decision. Approved images are imported separately." actions={<Button disabled={busy || !list.enabled} onClick={exportApproved}><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Export approvals</Button>} />
    {!list.enabled ? <section className="admin-card admin-stack"><h2>Image review is temporarily disabled</h2><p>Enable the temporary review module on the API service to load maps and review images. Saved review history is retained.</p></section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Review status">{tabs.map(status => <Button key={status} variant={filter === status ? 'primary' : 'ghost'} disabled={busy} aria-pressed={filter === status} onClick={() => task(async () => { await refresh(status); setFilter(status); setDetail(null); })}>{status === 'all' ? 'All images' : `${status[0]!.toUpperCase()}${status.slice(1)} ${counts[status]}`}</Button>)}</div>
        <Button variant="ghost" disabled={busy} onClick={() => task(async () => { await refresh(); setDetail(null); })}><ArrowPathIcon className="size-4" aria-hidden="true" />Refresh</Button>
      </div>
      {admin ? <details className="admin-card"><summary className="cursor-pointer font-medium">Load saved pipeline maps</summary><div className="admin-stack pt-4"><p>The pipeline prepares images, label text and product candidates. Loading maps creates a persistent review queue; pharmacist approval is required.</p><label>Pipeline review package<input ref={file} type="file" accept=".json,application/json" disabled={busy} /></label><div><Button disabled={busy} onClick={upload}>Load image maps</Button></div></div></details> : null}
      {error ? <p role="alert" className="admin-note admin-note--danger">{error}</p> : null}
      <p role="status" aria-live="polite" className="text-sm text-[var(--admin-muted)]">{busy ? message || 'Saving or loading review data…' : message || 'Reviews are saved on the server and remain available when you return.'}</p>
      {preview ? <section className="admin-card admin-stack" aria-labelledby="image-import-title"><h2 id="image-import-title">Import preview · {preview.mappings.length} approved {preview.mappings.length === 1 ? 'image' : 'images'}</h2><p>These existing image links will be added to the listed products. Existing galleries, publication status, prices and stock are preserved.</p><ul className="space-y-2">{preview.mappings.map(mapping => <li key={mapping.approvalId}>{mapping.productId} · {mapping.name}</li>)}</ul><div className="admin-actions"><Button variant="primary" disabled={busy} onClick={apply}>Import {preview.mappings.length} approved {preview.mappings.length === 1 ? 'image' : 'images'}</Button><Button disabled={busy} onClick={() => setPreview(null)}>Cancel preview</Button><Button disabled={busy} onClick={() => download('image-import-manifest.json', preview)}>Download this list</Button></div></section> : null}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.8fr)]">
        <section className="min-w-0" aria-label="Images to review">
          {filter === 'approved' && admin ? <div className="mb-4 flex flex-wrap items-center gap-3"><Button variant="primary" disabled={busy} onClick={publishAll}>Publish all approved images</Button><Button disabled={busy || !selected.length} onClick={publish}>Publish selected ({selected.length})</Button><Button disabled={busy || !selected.length} onClick={previewImport}>Preview selected</Button><Button disabled={busy} onClick={() => { localStorage.removeItem(imagePublicationStorageKey); setMessage('Saved run cleared. Publish all will collect the remaining approvals; completed imports are retained.'); }}>Reset saved run</Button><span className="text-xs text-[var(--admin-muted)]">Publish all includes every page and resumes interrupted runs in this browser. Keep this page open while it runs. Selected publishing is optional (up to 8).</span></div> : null}
          {!list.items.length ? <div className="admin-card"><h2>No {filter === 'all' ? '' : filter} images</h2><p>{filter === 'pending' ? 'Load a saved pipeline package, or choose another review status.' : 'Choose another status to continue reviewing.'}</p></div> : <ul className="!m-0 list-none divide-y divide-[var(--admin-border)] overflow-hidden !p-0 rounded-xl border border-[var(--admin-border)] bg-white">{list.items.map(item => <li key={item.itemId} className={detail?.item.itemId === item.itemId ? 'bg-[var(--admin-paper)]' : ''}><div className="flex items-center gap-3 p-3">
            {filter === 'approved' && admin && item.approvalId ? <input type="checkbox" aria-label={`Select ${item.selectedProductId} for import`} checked={selected.includes(item.approvalId)} disabled={busy || (!selected.includes(item.approvalId) && selected.length >= 8)} onChange={event => { setPreview(null); setSelected(values => event.target.checked ? [...values, item.approvalId!] : values.filter(id => id !== item.approvalId)); }} /> : null}
            <button type="button" className="!flex !min-w-0 !flex-1 !items-center !gap-3 !border-0 !bg-transparent !p-0 !text-left !text-[var(--admin-ink)]" disabled={busy} onClick={() => open(item.itemId)}>
              <Image src={item.source.imageUrl} alt="" width={64} height={80} unoptimized className="h-20 w-16 shrink-0 object-contain" />
              <span className="min-w-0"><span className="block text-sm font-medium leading-5">{item.source.identity.name || 'Unidentified product'}</span><span className="mt-1 block text-xs text-[var(--admin-muted)]">{item.selectedProductId || 'Choose a product'} · {item.status}</span></span>
            </button></div></li>)}</ul>}
          <div className="mt-4 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => task(async () => { await refresh(); setDetail(null); })}>First page</Button><Button disabled={busy || !list.nextAfter} onClick={() => task(async () => { await refresh(filter, list.nextAfter!); setDetail(null); })}>Next page</Button></div>
        </section>
        {detail ? <section className="admin-card min-w-0 !p-4 sm:!p-5" aria-labelledby="image-detail-title">
          <h2 ref={title} tabIndex={-1} id="image-detail-title" className="!mb-1 !text-lg">{detail.product?.name || detail.item.source.identity.name || 'Choose the exact catalogue product'}</h2>
          <p className="mb-5 text-sm text-[var(--admin-muted)]">{detail.product?.productId || 'No product selected'}{detail.item.reviewer ? ` · Last reviewed ${detail.item.reviewedAt?.slice(0, 10)}` : ''}</p>
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div><div className="flex min-h-64 items-center justify-center rounded-lg border border-[var(--admin-border)] bg-white"><Image key={detail.item.itemId + String(viewKey)} src={detail.item.source.imageUrl} alt={`Original image of ${detail.item.source.identity.name || 'unidentified product'}`} width={600} height={600} unoptimized onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setError('The original image could not load. Keep it on hold and retry later.'); }} className="h-auto max-h-[32rem] w-full object-contain" /></div><a className="mt-3 inline-flex items-center gap-1.5 text-sm underline underline-offset-4" href={detail.item.source.imageUrl} target="_blank" rel="noreferrer">Open full original<ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" /></a></div>
            <div className="admin-stack"><h3>Product association</h3><label>Proposed products<select value={detail.product?.productId ?? ''} disabled={busy} onChange={event => { if (event.target.value) void choose(event.target.value); else chooseNone(); }}><option value="">None · choose a product</option>{detail.candidates.map(product => <option key={product.productId} value={product.productId}>{product.productId} · {product.name}</option>)}</select></label>
              <form onSubmit={event => { event.preventDefault(); void search(); }} className="admin-stack"><label>Find another product<input value={query} maxLength={80} onChange={event => setQuery(event.target.value)} placeholder="Search by product name" /></label><Button disabled={busy || query.trim().length < 2} type="submit"><MagnifyingGlassIcon className="size-4" aria-hidden="true" />Search catalogue</Button></form>
              {searchResults.length ? <ul className="space-y-1">{searchResults.map(result => <li key={result.productId}><button type="button" disabled={busy} className="!text-left !text-sm" onClick={() => choose(result.productId)}>{result.productId} · {result.name}</button></li>)}</ul> : null}
              <form onSubmit={event => { event.preventDefault(); void choose(productId); }} className="admin-stack"><label>Or use product ID<input value={productId} maxLength={80} onChange={event => setProductId(event.target.value)} placeholder="PD1234" /></label><Button disabled={busy || !productId} type="submit">Use product</Button></form>
              {detail.product ? <Link className="text-sm underline underline-offset-4" href={admin ? `/admin/products/${detail.product.id}` : '/admin/products'} target="_blank">Open catalogue record</Link> : null}
            </div>
          </div>
          <details className="my-5"><summary className="cursor-pointer text-sm font-medium">Saved extraction and earlier review notes</summary><p className="mt-3 whitespace-pre-line text-sm">{detail.item.source.labelText.join('\n') || 'No readable label text was saved.'}</p><p className="mt-3 text-sm text-[var(--admin-muted)]">{detail.item.source.sourceNote}</p>{detail.item.note ? <p className="mt-3 text-sm">Latest review: {detail.item.note}</p> : null}<p className="mt-2 text-xs text-[var(--admin-muted)]">Earlier pipeline status: {detail.item.source.priorDecision}. This does not grant a pharmacist approval.</p></details>
          {detail.history.length ? <details className="my-5"><summary className="cursor-pointer text-sm font-medium">Review history · {detail.history.length} latest decisions</summary><ol className="mt-3 space-y-3">{detail.history.map((entry, index) => <li key={entry.reviewedAt + String(index)} className="text-sm"><p className="font-medium">{entry.decision} · {entry.reviewedAt.slice(0, 16).replace('T', ' ')} UTC</p><p>{entry.note}</p><p className="text-xs text-[var(--admin-muted)]">Staff record {entry.reviewer}</p></li>)}</ol></details> : null}
          {detail.withdrawalReason ? <p role="alert" className="admin-note admin-note--danger">This association was withdrawn: {detail.withdrawalReason}. Choose the correct product or leave it on hold.</p> : null}
          {detail.item.source.flags.length ? <p className="admin-note admin-note--warning">Image flags: {detail.item.source.flags.join(', ')}. Keep this source on hold or reject it; a clean, readable original is required for approval.</p> : null}
          {detail.product ? <><div className="mt-5 flex flex-wrap items-center gap-3"><label className="!flex !flex-row !items-start !gap-2"><input type="checkbox" checked={viewed} onChange={event => setViewed(event.target.checked)} disabled={busy || !loaded} /><span>I inspected this individual original image.</span></label><Button disabled={busy || !viewed} onClick={confirmMatching}>Confirm matching attributes</Button></div><h3 className="!mb-3 !mt-5">Verify the identity</h3><p className="mb-4 text-sm text-[var(--admin-muted)]">Confirm every relevant attribute against the original. For missing evidence, record the value you independently verified and where you verified it. A conflicting value blocks approval.</p>
            <div className="divide-y divide-[var(--admin-border)]">{checks.map(check => { const row = detail.comparison.find(value => value.field === check.field)!; const corrected = check.imageValue !== row.imageValue; return <div key={check.field} className="py-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label className="!flex !flex-row !items-center !gap-2 !font-medium"><input type="checkbox" checked={check.confirmed} disabled={busy} onChange={event => changeCheck(check.field, { confirmed: event.target.checked })} />{labels[check.field]} verified</label><span className={`text-xs ${row.status === 'conflict' ? 'text-[var(--admin-danger)]' : 'text-[var(--admin-muted)]'}`}>{corrected ? 'OCR correction · verify evidence' : row.status === 'conflict' ? 'Conflicting values' : row.status === 'unknown' ? 'Needs evidence' : 'Values match'}</span></div>
              <div className="grid gap-3 sm:grid-cols-2"><label className="!text-xs">Image · {labels[check.field]}<input value={check.imageValue} maxLength={500} disabled={busy} onChange={event => changeCheck(check.field, { imageValue: event.target.value, confirmed: false })} placeholder="Unverified" /></label><label className="!text-xs">Catalogue · {labels[check.field]}<input value={check.catalogueValue} maxLength={500} readOnly={!!row.catalogueValue} disabled={busy} onChange={event => changeCheck(check.field, { catalogueValue: event.target.value, confirmed: false })} placeholder="Unverified" /></label></div>
              {corrected ? <p className="mt-2 text-xs text-[var(--admin-muted)]">Saved OCR: {row.imageValue || 'Unknown'}. The original extraction will remain in history.</p> : null}
              {row.status !== 'match' || corrected ? <label className="mt-3 !text-xs">Evidence for {labels[check.field]}<input value={check.evidence} maxLength={1000} onChange={event => changeCheck(check.field, { evidence: event.target.value })} disabled={busy} placeholder="Where did you independently confirm these values?" /></label> : null}
            </div>; })}</div>
            <details className="my-4"><summary className="cursor-pointer text-sm">Add an attribute missed by extraction</summary><div className="mt-3 flex flex-wrap items-end gap-3"><label>Additional attribute<select value={additionalField} onChange={event => setAdditionalField(event.target.value as ImageIdentityField | '')}><option value="">Choose attribute</option>{detail.comparison.filter(row => !checks.some(c => c.field === row.field)).map(row => <option key={row.field} value={row.field}>{labels[row.field]}</option>)}</select></label><Button disabled={busy || !additionalField || checks.some(c => c.field === additionalField)} onClick={() => { const row = detail.comparison.find(c => c.field === additionalField); if (row) setChecks(values => [...values, { field: row.field, imageValue: row.imageValue, catalogueValue: row.catalogueValue, confirmed: false, evidence: '' }]); }}>Add attribute</Button></div></details>
            {detail.sharedIdentifiers.length ? <label className="!my-4 !flex !flex-row !items-start !gap-2"><input type="checkbox" checked={sharedConfirmed} onChange={event => setSharedConfirmed(event.target.checked)} disabled={busy} /><span>These identifiers are shared by multiple catalogue records. I verified this exact variant using the other identity attributes.</span></label> : null}
          </> : null}
          {detail.item.status === 'imported' ? <p className="admin-note">This association has been imported. Its review and import history are retained.</p> : <div className="admin-stack mt-5 border-t border-[var(--admin-border)] pt-5"><p className="text-sm text-[var(--admin-muted)]">{viewed ? 'Individual original inspected.' : 'Inspect the original and confirm the checkbox above before approval.'}</p><label>Review note<textarea rows={3} value={note} maxLength={2000} disabled={busy} onChange={event => setNote(event.target.value)} placeholder="Record your decision, evidence or what still needs checking." /></label><div className="admin-actions"><Button variant="primary" disabled={busy || !ready} onClick={() => save('approved')}><CheckIcon className="size-4" aria-hidden="true" />Approve association</Button><Button disabled={busy || note.trim().length < 5} onClick={() => save('held')}>Save on hold</Button><Button variant="danger" disabled={busy || note.trim().length < 5} onClick={() => save('rejected')}>Reject association</Button></div></div>}
        </section> : <section className="admin-card"><h2>Choose an image to review</h2><p>The original image, extracted label text and catalogue identity will appear here. Approval saves the association for export; an administrator imports it separately.</p></section>}
      </div>
    </>}
  </>;
}
