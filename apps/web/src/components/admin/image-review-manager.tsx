'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, PlayIcon } from '@heroicons/react/24/outline';
import { imageReviewPackageSchema, type ImageReviewList, type ImageReviewDetail, type ImageReviewDecisionInput, type ImageReviewDraftInput, type ImageReviewApprovedMapping, type ImageReviewManifest, type ImagePublicationResponse } from '@almina/contracts';
import { adminRequest, AdminRateLimitError } from './controls';
import { Button, PageHeader } from './ui';
import { ImageReviewWorkspace } from './image-review-workspace';
import { nextImageReviewId } from '../../lib/admin/image-review-workflow';

const emptyCounts = { pending: 0, held: 0, approved: 0, rejected: 0, imported: 0 };
const tabs = ['pending', 'held', 'approved', 'imported', 'rejected', 'all'] as const;
type Filter = typeof tabs[number];
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
export function ImageReviewManager({ initial, admin }: { initial: ImageReviewList; admin: boolean }) {
  const [list, setList] = useState(initial), [filter, setFilter] = useState<Filter>('pending');
  const [detail, setDetail] = useState<ImageReviewDetail | null>(null);
  const [reviewed, setReviewed] = useState(0), [lastReview, setLastReview] = useState<string | null>(null);
  const [viewKey, setViewKey] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]), [preview, setPreview] = useState<ImageReviewManifest | null>(null);
  const file = useRef<HTMLInputElement>(null), inFlight = useRef(false);
  const nextCache = useRef(new Map<string, Promise<ImageReviewDetail>>());
  const countedReviews = useRef(new Set<string>());
  const retry = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const draftRetry = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const publishRetry = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const [publicationStatus, setPublicationStatus] = useState<ImagePublicationResponse>({ publication: null });
  const [publicationRefresh, setPublicationRefresh] = useState(0), [publicationError, setPublicationError] = useState('');
  const publicationRequest = useRef<string | null>(null), completedPublication = useRef<string | null>(null);
  const publicationVersion = useRef(0);
  const { publication, execution } = publicationStatus;
  const publishing = publication?.phase === 'preparing' || publication?.phase === 'publishing';
  useEffect(() => {
    if (!admin || !initial.enabled) return;
    let cancelled = false, polling = false, follow = false, timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (cancelled || polling || document.hidden) return;
      polling = true;
      const version = publicationVersion.current;
      let delay = 10000;
      try {
        const result = await adminRequest('image-review/publication') as ImagePublicationResponse;
        if (cancelled || version !== publicationVersion.current) return;
        const run = result.publication;
        follow = result.execution !== 'local' && (run?.phase === 'preparing' || run?.phase === 'publishing' || (run?.phase === 'paused' && !run.canResume));
        setPublicationStatus(result); setPublicationError('');
        if (result.publication?.phase === 'complete' && completedPublication.current !== result.publication.jobId) {
          const page = await adminRequest('image-review?' + new URLSearchParams({ status: filter })) as ImageReviewList;
          if (!cancelled && version === publicationVersion.current) { completedPublication.current = result.publication.jobId; setList(page); setSelected([]); setPreview(null); }
        }
      } catch (failure) {
        if (failure instanceof AdminRateLimitError) delay = failure.retryAfterSeconds * 1000;
        if (!cancelled) setPublicationError('Saved progress could not be refreshed. Select Refresh to check again.');
      } finally {
        polling = false;
        if (!cancelled && follow && !document.hidden) timer = setTimeout(() => { void poll(); }, delay);
      }
    }
    function visibilityChanged() { clearTimeout(timer); if (!document.hidden) void poll(); }
    void poll();
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', visibilityChanged); };
  }, [admin, initial.enabled, filter, publicationRefresh]);
  const nextId = detail ? nextImageReviewId(list.items, detail.item.itemId) : null;
  useEffect(() => {
    if (!detail || !nextId || !['pending', 'held'].includes(filter)) { nextCache.current.clear(); return; }
    const cache = nextCache.current;
    for (const id of cache.keys()) if (id !== nextId) cache.delete(id);
    if (cache.has(nextId)) return;
    const pending = adminRequest(`image-review/${nextId}`) as Promise<ImageReviewDetail>;
    cache.set(nextId, pending);
    let cancelled = false;
    void pending.then(value => { if (!cancelled) { const preload = new window.Image(); preload.src = value.item.source.imageUrl; } }).catch(() => { if (cache.get(nextId) === pending) cache.delete(nextId); });
    return () => { cancelled = true; };
  }, [detail, nextId, filter]);
  function populate(value: ImageReviewDetail) { setViewKey(key => key + 1); setDetail(value); retry.current = null; }
  async function loadDetail(id: string, usePrefetch = false) {
    const pending = usePrefetch ? nextCache.current.get(id) : undefined;
    nextCache.current.delete(id);
    return pending ? pending.catch(() => adminRequest(`image-review/${id}`) as Promise<ImageReviewDetail>) : await adminRequest(`image-review/${id}`) as ImageReviewDetail;
  }
  async function task(action: () => Promise<void>, propagate = false) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (failure) {
      if (propagate) throw failure;
      setError(failure instanceof Error ? failure.message : 'The request failed. Your saved reviews are retained.');
    }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function refresh(status = filter, after?: string) {
    const qs = new URLSearchParams({ status, ...(after ? { after } : {}) });
    const value = await adminRequest(`image-review?${qs}`) as ImageReviewList; setList(value); setSelected([]); setPreview(null);
    return value;
  }
  const open = (id: string) => task(async () => { populate(await loadDetail(id)); });
  async function choose(id: string) {
    if (!detail) return;
    await task(async () => {
      if (!id) { populate({ ...detail, product: null, comparison: [], sharedIdentifiers: [], withdrawalReason: null }); return; }
      const selection = await adminRequest('image-review/select', 'POST', { itemId: detail.item.itemId, productId: id }) as ImageReviewDetail;
      if (!selection.product) throw new Error('This product is no longer available. Search the catalogue again.');
      populate(selection);
    }, true);
  }
  async function createDraft(product: ImageReviewDraftInput['product']) {
    if (!detail) return;
    await task(async () => {
      const input = { itemId: detail.item.itemId, expectedRevision: detail.item.revision, product };
      const fingerprint = JSON.stringify(input);
      if (draftRetry.current?.fingerprint !== fingerprint) draftRetry.current = { fingerprint, requestId: crypto.randomUUID() };
      await adminRequest('image-review/draft', 'POST', { ...input, requestId: draftRetry.current.requestId });
      const updated = await loadDetail(input.itemId);
      populate(updated);
      draftRetry.current = null;
      setMessage(updated.item.source.flags.length ? 'Draft created and selected. The flagged image is held.' : 'Draft created and selected. Verify the image to continue.');
      if (updated.item.status !== detail.item.status) {
        // The draft is already selected even if updating the queue count fails.
        await refresh().catch(() => setError('Draft saved. Refresh the queue to update its counts.'));
      }
    }, true);
  }
  const skip = () => { if (nextId) void task(async () => { populate(await loadDetail(nextId, true)); setMessage('Skipped for now. No decision was saved.'); }); };
  async function save(input: Omit<ImageReviewDecisionInput, 'requestId'>) {
    await task(async () => {
      const fingerprint = JSON.stringify(input);
      if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, requestId: crypto.randomUUID() };
      await adminRequest('image-review/decide', 'POST', { ...input, requestId: retry.current.requestId });
      if (!countedReviews.current.has(retry.current.requestId)) { countedReviews.current.add(retry.current.requestId); setReviewed(count => count + 1); }
      setLastReview(input.itemId);
      const page = await refresh();
      setMessage(input.decision === 'approved' ? 'Approved. Saved for publication.' : input.decision === 'held' ? 'Held for another check.' : 'Association rejected.');
      const following = ['pending', 'held'].includes(filter) ? (page.items.some(item => item.itemId === nextId) ? nextId : nextImageReviewId(page.items, input.itemId)) : null;
      if (following) {
        try { populate(await loadDetail(following, true)); }
        catch { setDetail(null); setMessage('Review saved. Choose the next image to continue.'); }
      } else setDetail(null);
    }, true);
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
      publicationRequest.current ??= crypto.randomUUID();
      const value = await adminRequest('image-review/publication/start', 'POST', { requestId: publicationRequest.current }) as ImagePublicationResponse;
      publicationVersion.current++;
      setPublicationStatus(value); setPublicationError(''); publicationRequest.current = null;
      if (value.execution !== 'local') setPublicationRefresh(count => count + 1);
      setMessage(value.execution === 'local' ? 'Publication queued for the local runner.' : 'Publication is saved. You can close this page and return to check progress.');
    });
  }
  async function publicationAction(action: 'resume' | 'pause') {
    if (!publication) return;
    await task(async () => {
      const value = await adminRequest(`image-review/publication/${action}`, 'POST', { jobId: publication.jobId }) as ImagePublicationResponse;
      publicationVersion.current++;
      setPublicationStatus(value); setPublicationError('');
      if (value.execution !== 'local') setPublicationRefresh(count => count + 1);
      setMessage(action === 'pause' ? 'Publication paused. An image import already in progress may finish.' : value.execution === 'local' ? 'Publication is ready for the local runner.' : 'Publication resumed.');
    });
  }
  async function apply() {
    if (!preview) return;
    await task(async () => {
      const result = await adminRequest('image-review/import', 'POST', { manifestId: preview.manifestId, approvalIds: preview.mappings.map(m => m.approvalId) }) as { imported: number; replayed: boolean };
      await refresh(); setDetail(null); setMessage(`${result.imported} approved image associations ${result.replayed ? 'were already imported' : 'imported'}. Existing photos are retained.`);
    });
  }
  const counts = list.counts ?? emptyCounts;
  return <>
    <PageHeader title="Image review" description="Check each image against the catalogue, then approve or hold it." actions={<Button variant="ghost" disabled={busy || !list.enabled} onClick={exportApproved}><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Export approvals</Button>} />
    {!list.enabled ? <section className="admin-card admin-stack"><h2>Image review is temporarily disabled</h2><p>Enable the temporary review module on the API service to load maps and review images. Saved review history is retained.</p></section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Review status">{tabs.map(status => <Button key={status} variant={filter === status ? 'primary' : 'ghost'} disabled={busy} aria-pressed={filter === status} onClick={() => task(async () => { await refresh(status); setFilter(status); setDetail(null); })}>{status === 'all' ? 'All images' : `${status[0]!.toUpperCase()}${status.slice(1)} ${counts[status]}`}</Button>)}</div>
        <Button variant="ghost" disabled={busy} onClick={() => task(async () => { await refresh(); setDetail(null); setPublicationRefresh(count => count + 1); })}><ArrowPathIcon className="size-4" aria-hidden="true" />Refresh</Button>
      </div>
      {admin ? <details open={!Object.values(counts).some(Boolean) ? true : undefined} className="admin-card"><summary className="cursor-pointer font-medium">Load saved pipeline maps</summary><div className="admin-stack pt-4"><p>The pipeline prepares images, label text and product candidates. Loading maps creates a persistent review queue; pharmacist approval is required.</p><label>Pipeline review package<input ref={file} type="file" accept=".json,application/json" disabled={busy} /></label><div><Button disabled={busy} onClick={upload}>Load image maps</Button></div></div></details> : null}
      {error ? <p role="alert" className="admin-note admin-note--danger">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3"><p role="status" aria-live="polite" className="!m-0 text-xs text-[var(--admin-muted)]">{busy ? message || 'Saving…' : message || (reviewed ? `${reviewed} reviewed this visit. Decisions are saved.` : `${counts[filter === 'all' ? 'pending' : filter]} ${filter === 'pending' ? 'waiting for review' : 'in this queue'}.`)}</p>{lastReview ? <Button size="sm" variant="ghost" disabled={busy || detail?.item.itemId === lastReview} onClick={() => open(lastReview)}>Last decision</Button> : null}{reviewed > 0 && detail ? <span className="text-xs text-[var(--admin-muted)]">{reviewed} reviewed this visit</span> : null}{!detail && list.items.length ? <Button variant="primary" disabled={busy} onClick={() => open(list.items[0]!.itemId)}><PlayIcon className="size-4" aria-hidden="true" />Start reviewing</Button> : null}</div>
      {admin && publication ? <details open={publishing || publication.phase === 'paused' ? true : undefined} className="admin-card" aria-labelledby="publication-title">
        <summary className="cursor-pointer font-medium" id="publication-title">Image publication · {publication.phase === 'preparing' ? 'Preparing' : publication.phase === 'publishing' ? 'In progress' : publication.phase === 'paused' ? 'Paused' : 'Complete'}</summary><div className="admin-stack pt-3">
        <p role="status" aria-live="polite">{publication.publishedImages} published · {publication.skippedImages} returned for review · {publication.preparedImages} included. Products processed: {publication.processedProducts} of {publication.totalProducts}.</p>
        {execution === 'local' && publication.phase !== 'complete' ? <p className="text-sm text-[var(--admin-muted)]">Bulk publication runs on the operations computer. Give the operator run ID <code className="break-all">{publication.jobId}</code>. Select Refresh to check progress.</p> : <p className="text-sm text-[var(--admin-muted)]">Progress is saved. You can close this page and return from another browser.</p>}
        {publication.error ? <p role="alert">{publication.error === 'access' ? 'The administrator who started this run no longer has access. An active administrator can resume it.' : 'Publication paused after a service or image-provider failure. Retry when the service is available.'}</p> : null}
        {publication.phase === 'paused' && !publication.canResume ? <p>The current worker is finishing or recovering. Resume will become available when it releases this run.</p> : null}
        <div className="admin-actions">{publishing ? <Button disabled={busy} onClick={() => publicationAction('pause')}>Pause publication</Button> : publication.phase === 'paused' ? <Button variant="primary" disabled={busy || !publication.canResume} onClick={() => publicationAction('resume')}>Resume publication</Button> : null}<Button disabled={busy} onClick={() => task(async () => { await refresh(); setPublicationRefresh(count => count + 1); })}>Refresh image queue</Button></div>
        {publication.issues.length ? <details><summary>Products needing another review</summary><ul>{publication.issues.map(issue => <li key={issue.productId}>{issue.productId} · {issue.images} {issue.images === 1 ? 'image' : 'images'} · {issue.reason}</li>)}</ul><p>Open the Held queue to check these associations. Newer pharmacist decisions are preserved.</p>{publication.moreIssues ? <p>More products require review. The Held queue contains the remaining associations.</p> : null}</details> : null}
      </div></details> : null}
      {admin && publicationError ? <p role="alert" className="admin-note admin-note--danger">{publicationError}</p> : null}
      {preview ? <section className="admin-card admin-stack" aria-labelledby="image-import-title"><h2 id="image-import-title">Import preview · {preview.mappings.length} approved {preview.mappings.length === 1 ? 'image' : 'images'}</h2><p>These existing image links will be added to the listed products. Existing galleries, publication status, prices and stock are preserved.</p><ul className="space-y-2">{preview.mappings.map(mapping => <li key={mapping.approvalId}>{mapping.productId} · {mapping.name}</li>)}</ul><div className="admin-actions"><Button variant="primary" disabled={busy || publishing} onClick={apply}>Import {preview.mappings.length} approved {preview.mappings.length === 1 ? 'image' : 'images'}</Button><Button disabled={busy} onClick={() => setPreview(null)}>Cancel preview</Button><Button disabled={busy} onClick={() => download('image-import-manifest.json', preview)}>Download this list</Button></div></section> : null}
      {detail ? <ImageReviewWorkspace key={detail.item.itemId + ':' + viewKey} detail={detail} admin={admin} busy={busy} hasNext={!!nextId} onDecision={save} onChoose={choose} onCreate={createDraft} onSkip={skip} /> : <section className="admin-card"><h2>{list.items.length ? 'Ready to review' : 'No images in this queue'}</h2><p>{list.items.length ? 'Start with the first image or pick one below. Each decision opens the next image automatically.' : filter === 'pending' ? (admin ? 'Load saved image maps above, or choose another queue.' : 'The administrator can load image maps. You can also check the Held queue.') : 'Choose another queue to continue.'}</p></section>}
      {filter === 'approved' && admin ? <div className="mt-4 flex flex-wrap items-center gap-3"><Button variant="primary" disabled={busy || publishing || publication?.phase === 'paused' || !counts.approved} onClick={publishAll}>Publish all approved images</Button><details><summary className="cursor-pointer py-3 text-sm">Publish a selection</summary><div className="flex flex-wrap gap-2 py-3"><Button disabled={busy || publishing || !selected.length} onClick={publish}>Publish selected ({selected.length})</Button><Button disabled={busy || !selected.length} onClick={previewImport}>Preview selected</Button></div><p className="text-xs text-[var(--admin-muted)]">Select up to eight images from the queue below.</p></details></div> : null}
      <details key={detail ? 'reviewing' : 'choosing'} open={!detail} className="mt-5 min-w-0 border-t border-[var(--admin-border)] pt-3"><summary className="cursor-pointer py-2 text-sm font-medium">Browse queue · {list.items.length} on this page</summary>
        <section className="mt-2 min-w-0" aria-label="Images to review">
          {!list.items.length ? <p className="text-sm text-[var(--admin-muted)]">No images on this page.</p> : <ul className="!m-0 grid max-h-64 list-none gap-1 overflow-y-auto !p-0 sm:grid-cols-2 xl:grid-cols-3">{list.items.map(item => <li key={item.itemId}><div className="flex min-h-14 items-center gap-2 rounded-lg p-2 hover:bg-[var(--admin-paper)]">
            {filter === 'approved' && admin && item.approvalId ? <input type="checkbox" aria-label={`Select ${item.selectedProductId} for import`} checked={selected.includes(item.approvalId)} disabled={busy || (!selected.includes(item.approvalId) && selected.length >= 8)} onChange={event => { setPreview(null); setSelected(values => event.target.checked ? [...values, item.approvalId!] : values.filter(id => id !== item.approvalId)); }} /> : null}
            <button type="button" aria-current={detail?.item.itemId === item.itemId ? 'true' : undefined} className="!flex !min-w-0 !flex-1 !items-center !gap-3 !border-0 !bg-transparent !p-0 !text-left !text-[var(--admin-ink)]" disabled={busy} onClick={() => open(item.itemId)}><Image src={item.source.imageUrl} alt="" width={40} height={48} unoptimized className="h-12 w-10 shrink-0 object-contain" /><span className="min-w-0"><span className="block truncate text-xs font-medium">{item.source.identity.name || 'Unidentified product'}</span><span className="text-xs text-[var(--admin-muted)]">{item.selectedProductId || 'No product selected'} · {item.status}</span></span></button>
          </div></li>)}</ul>}
          <div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={() => task(async () => { await refresh(); setDetail(null); })}>First page</Button><Button disabled={busy || !list.nextAfter} onClick={() => task(async () => { await refresh(filter, list.nextAfter!); setDetail(null); })}>Next page</Button></div>
        </section>
      </details>
    </>}
  </>;
}
