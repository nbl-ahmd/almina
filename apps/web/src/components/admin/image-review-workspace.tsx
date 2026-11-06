'use client';

import Image from 'next/image';
import Link from '../app-link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowTopRightOnSquareIcon, CheckIcon, MagnifyingGlassIcon, ForwardIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { ImageIdentityField, ImageReviewDecisionInput, ImageReviewDetail } from '@almina/contracts';
import { canApproveImage, imageReviewDecision, initialReviewChecks, isUnchangedMatch, reviewHoldReasons, type ReviewCheck } from '../../lib/admin/image-review-workflow';
import { adminRequest } from './controls';
import { Button } from './ui';

const labels: Record<ImageIdentityField, string> = { name: 'Product name', brand: 'Brand', line: 'Product line', strength: 'Strength / concentration', form: 'Form', size: 'Net content', quantity: 'Count', multipack: 'Multipack', flavour: 'Flavour / fragrance', shadeModel: 'Shade / model', variantSize: 'Size', ageStage: 'Age / stage', barcode: 'Barcode', gtin: 'GTIN' };
type Decision = Omit<ImageReviewDecisionInput, 'requestId'>;

export function ImageReviewWorkspace({ detail, admin, busy, hasNext, onDecision, onChoose, onSkip }: {
  detail: ImageReviewDetail; admin: boolean; busy: boolean; hasNext: boolean;
  onDecision: (value: Decision) => Promise<void>; onChoose: (id: string) => Promise<void>; onSkip: () => void;
}) {
  const [checks, setChecks] = useState(() => initialReviewChecks(detail));
  const [loaded, setLoaded] = useState(false), [imageFailed, setImageFailed] = useState(false), [zoom, setZoom] = useState(false);
  const [shared, setShared] = useState(false), [note, setNote] = useState(''), [holdReason, setHoldReason] = useState<string>(reviewHoldReasons[0]);
  const [editing, setEditing] = useState<ImageIdentityField[]>([]), [additional, setAdditional] = useState<ImageIdentityField | ''>('');
  const [query, setQuery] = useState(''), [productId, setProductId] = useState(''), [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ productId: string; name: string }[]>([]), [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null), panel = useRef<HTMLElement>(null), sending = useRef(false);
  useEffect(() => { title.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ block: 'start' }); }, []);
  const imported = detail.item.status === 'imported';
  const ready = canApproveImage(detail, checks, loaded && !imageFailed, shared);
  const matched = checks.filter(check => isUnchangedMatch(detail, check));
  const attention = checks.filter(check => !isUnchangedMatch(detail, check) || editing.includes(check.field));
  function change(field: ImageIdentityField, patch: Partial<ReviewCheck>) { setChecks(values => values.map(check => check.field === field ? { ...check, ...patch } : check)); }
  async function decide(decision: 'approved' | 'held' | 'rejected') {
    if (busy || searching || sending.current || imported || (decision === 'approved' && !ready)) return;
    sending.current = true; setError('');
    try { await onDecision(imageReviewDecision(detail, checks, decision, loaded, shared, note || (decision === 'held' ? holdReason : ''))); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Review could not be saved. Retry this image.'); }
    finally { sending.current = false; }
  }
  function shortcuts(event: KeyboardEvent<HTMLElement>) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat || busy || searching) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Enter' && ready && !imported) { event.preventDefault(); void decide('approved'); }
    if ((event.code === 'KeyH' || event.key.toLowerCase() === 'h') && !imported) { event.preventDefault(); void decide('held'); }
    if ((event.code === 'KeyJ' || event.key.toLowerCase() === 'j') && hasNext) { event.preventDefault(); onSkip(); }
  }
  async function search() {
    setSearching(true); setError('');
    try {
      const value = await adminRequest('products/search?' + new URLSearchParams({ q: query, limit: '8' }));
      const rows = Array.isArray(value) ? value : value && typeof value === 'object' && 'products' in value && Array.isArray(value.products) ? value.products : [];
      setResults(rows.filter((row): row is { product_id: string; name: string } => !!row && typeof row === 'object' && typeof row.product_id === 'string' && typeof row.name === 'string').map(row => ({ productId: row.product_id, name: row.name })));
      if (!rows.length) setError('No products found. Try a shorter name or use a product ID.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Search failed. Please retry.'); }
    finally { setSearching(false); }
  }
  return <section ref={panel} onKeyDown={shortcuts} className="min-w-0 scroll-mt-20 rounded-xl border border-[var(--admin-border)] bg-white" aria-labelledby="review-product-title" aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1"><h2 ref={title} tabIndex={-1} id="review-product-title" className="!m-0 !text-base">{detail.product?.name || detail.item.source.identity.name || 'Identify this product'}</h2><p className="!mb-0 !mt-1 text-xs text-[var(--admin-muted)]">{detail.product?.productId || 'No product selected'}{detail.item.status !== 'pending' ? ` · ${detail.item.status}` : ''} · {matched.length} matching {matched.length === 1 ? 'attribute' : 'attributes'}{attention.length ? ` · ${attention.length} to check` : ''}</p></div>
      <Button variant="ghost" disabled={busy || !hasNext} onClick={onSkip} aria-keyshortcuts="Alt+J"><ForwardIcon className="size-4" aria-hidden="true" />Skip for now</Button>
    </div>
    <div className="grid min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className={`flex min-h-64 max-h-[min(32rem,calc(100dvh-18rem))] items-start overflow-auto rounded-lg bg-white sm:min-h-80 ${zoom ? 'justify-start' : 'justify-center'}`}>
          <Image src={detail.item.source.imageUrl} alt={`Original label: ${detail.item.source.identity.name || 'unidentified product'}`} width={600} height={600} unoptimized onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setImageFailed(true); }} className={zoom ? 'h-auto w-[180%] max-w-none shrink-0 object-contain' : 'h-auto max-h-[min(32rem,calc(100dvh-18rem))] w-full object-contain'} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><Button size="sm" disabled={!loaded || imageFailed} onClick={() => setZoom(value => !value)} aria-pressed={zoom}><MagnifyingGlassIcon className="size-4" aria-hidden="true" />{zoom ? 'Fit image' : 'Zoom label'}</Button><a className="inline-flex min-h-9 items-center gap-1.5 text-xs underline underline-offset-4" href={detail.item.source.imageUrl} target="_blank" rel="noreferrer">Open original<ArrowTopRightOnSquareIcon className="size-4" aria-hidden="true" /></a></div>
        {imageFailed ? <p role="alert" className="admin-note admin-note--danger">Image could not load. Hold it for later or skip; approval is blocked.</p> : !loaded ? <p role="status" className="text-sm text-[var(--admin-muted)]">Loading original…</p> : null}
      </div>
      <div className="min-w-0">
        {detail.withdrawalReason ? <p role="alert" className="admin-note admin-note--danger">Withdrawn: {detail.withdrawalReason}. Choose the correct product or hold for another check.</p> : null}
        {detail.item.source.flags.length ? <p role="alert" className="admin-note admin-note--warning">Image needs checking: {detail.item.source.flags.join(', ')}. Hold or reject this source.</p> : null}
        {detail.product ? <>
          <div className="overflow-x-auto"><table className="w-full !text-xs"><caption className="sr-only">Compare the individual image label with the selected catalogue product</caption><thead><tr className="border-b border-[var(--admin-border)] text-left text-[var(--admin-muted)]"><th scope="col" className="py-2 pr-3 font-medium">Attribute</th><th scope="col" className="py-2 pr-3 font-medium">Image label</th><th scope="col" className="py-2 font-medium">Catalogue</th></tr></thead><tbody>{checks.map(check => {
            const match = isUnchangedMatch(detail, check);
            return <tr key={check.field} className={`border-b border-[var(--admin-hairline)] align-top ${match ? '' : 'bg-[var(--admin-warning-soft)]'}`}><th scope="row" className="w-1/4 py-2.5 pr-3 text-left font-medium">{labels[check.field]}{!match ? <span className="mt-1 block font-normal text-[var(--admin-warning)]">Check value</span> : null}</th><td className="w-[37.5%] break-words py-2.5 pr-3">{check.imageValue || 'Not readable'}</td><td className="w-[37.5%] break-words py-2.5">{check.catalogueValue || 'Not recorded'}</td></tr>;
          })}</tbody></table></div>
          {attention.length ? <div className="mt-4 space-y-4"><h3 className="!text-sm">Resolve highlighted attributes</h3>{attention.map(check => {
            const row = detail.comparison.find(value => value.field === check.field)!;
            const corrected = row.imageValue !== check.imageValue;
            return <div key={check.field} className="space-y-3 border-b border-[var(--admin-border)] pb-4">
              <div className="grid gap-3 sm:grid-cols-2"><label className="!text-xs">Image · {labels[check.field]}<input value={check.imageValue} disabled={busy || imported} maxLength={500} onChange={event => change(check.field, { imageValue: event.target.value, confirmed: false })} placeholder="Read from the original" /></label><label className="!text-xs">Catalogue · {labels[check.field]}<input value={check.catalogueValue} readOnly={!!row.catalogueValue} disabled={busy || imported} maxLength={500} onChange={event => change(check.field, { catalogueValue: event.target.value, confirmed: false })} placeholder="Independently verified value" /></label></div>
              {corrected ? <p className="text-xs text-[var(--admin-muted)]">Original extraction: {row.imageValue || 'Unknown'}. Your correction is recorded separately.</p> : null}
              {!isUnchangedMatch(detail, check) ? <><Button disabled={busy || imported || !loaded || !check.imageValue.trim() || !check.catalogueValue.trim()} onClick={() => change(check.field, { confirmed: true, evidence: 'I verified these exact values on this individual original label.' })}>Verified {labels[check.field].toLowerCase()} on original label</Button><p className="text-xs text-[var(--admin-muted)]">Use this only if both values are supported by the original. Otherwise, cite your source below.</p><label className="!text-xs">Evidence for {labels[check.field]}<input maxLength={1000} value={check.evidence} disabled={busy || imported} onChange={event => change(check.field, { evidence: event.target.value, confirmed: false })} placeholder="Where did you verify this exact value?" /></label><label className="!flex !flex-row !items-start !gap-2 !text-xs"><input type="checkbox" checked={check.confirmed} disabled={busy || imported} onChange={event => change(check.field, { confirmed: event.target.checked })} /><span>{labels[check.field]} independently verified</span></label></> : null}
            </div>;
          })}</div> : <p className="mt-3 flex items-center gap-2 text-xs text-[var(--admin-success)]"><CheckIcon className="size-4 shrink-0" aria-hidden="true" />All listed values match. Compare them with the original before approving.</p>}
          {detail.sharedIdentifiers.length ? <label className="!my-4 !flex !flex-row !items-start !gap-2 !text-sm"><input type="checkbox" checked={shared} disabled={busy || imported} onChange={event => setShared(event.target.checked)} /><span>Shared barcode: I verified this exact variant using the other attributes.</span></label> : null}
        </> : <p className="admin-note admin-note--warning">Choose an exact product below, or hold this image for another check.</p>}
        <details className="mt-4 border-t border-[var(--admin-border)] pt-3"><summary className="cursor-pointer py-1 text-sm font-medium">Wrong product? Change association</summary><div className="admin-stack pt-3">
          <label>Suggested products<select value={detail.product?.productId ?? ''} disabled={busy || imported} onChange={event => void onChoose(event.target.value)}><option value="">None · no product match</option>{detail.candidates.map(product => <option key={product.productId} value={product.productId}>{product.productId} · {product.name}</option>)}</select></label>
          <form onSubmit={event => { event.preventDefault(); void search(); }} className="flex items-end gap-2"><label className="min-w-0 flex-1">Find a product<input value={query} maxLength={80} disabled={busy || searching || imported} onChange={event => setQuery(event.target.value)} placeholder="Name or barcode" /></label><Button type="submit" disabled={busy || searching || imported || query.trim().length < 2}>Search</Button></form>
          {results.length ? <ul className="!m-0 list-none !p-0">{results.map(result => <li key={result.productId}><Button className="!h-auto !min-h-11 !whitespace-normal !text-left" variant="ghost" disabled={busy || imported} onClick={() => onChoose(result.productId)}>{result.productId} · {result.name}</Button></li>)}</ul> : null}
          <form onSubmit={event => { event.preventDefault(); void onChoose(productId); }} className="flex items-end gap-2"><label className="min-w-0 flex-1">Product ID<input value={productId} maxLength={80} disabled={busy || imported} onChange={event => setProductId(event.target.value)} placeholder="PD1234" /></label><Button type="submit" disabled={busy || imported || !productId.trim()}>Use product</Button></form>
        </div></details>
        <details className="mt-3 border-t border-[var(--admin-border)] pt-3"><summary className="cursor-pointer py-1 text-sm font-medium">Corrections, notes & history</summary><div className="admin-stack pt-3">
          <label>Correct an extracted attribute<select value="" disabled={busy || imported} onChange={event => { if (event.target.value) setEditing(values => [...new Set([...values, event.target.value as ImageIdentityField])]); }}><option value="">Choose attribute</option>{checks.map(check => <option key={check.field} value={check.field}>{labels[check.field]}</option>)}</select></label>
          <div className="flex items-end gap-2"><label className="min-w-0 flex-1">Add a missing attribute<select value={additional} disabled={busy || imported} onChange={event => setAdditional(event.target.value as ImageIdentityField | '')}><option value="">Choose attribute</option>{detail.comparison.filter(row => !checks.some(check => check.field === row.field)).map(row => <option key={row.field} value={row.field}>{labels[row.field]}</option>)}</select></label><Button disabled={busy || imported || !additional} onClick={() => { const row = detail.comparison.find(value => value.field === additional); if (row) { setChecks(values => [...values, { field: row.field, imageValue: row.imageValue, catalogueValue: row.catalogueValue, confirmed: false, evidence: '' }]); setEditing(values => [...values, row.field]); setAdditional(''); } }}>Add</Button></div>
          <label>Optional review note<textarea rows={2} maxLength={2000} value={note} disabled={busy || imported} onChange={event => setNote(event.target.value)} placeholder="Add context only when needed" /></label>
          <label>Reason for holding<select value={holdReason} disabled={busy || imported} onChange={event => setHoldReason(event.target.value)}>{reviewHoldReasons.map(reason => <option key={reason}>{reason}</option>)}</select></label>
          <p className="whitespace-pre-line text-xs text-[var(--admin-muted)]">Saved label text: {detail.item.source.labelText.join(' · ') || 'None'}</p><p className="text-xs text-[var(--admin-muted)]">{detail.item.source.sourceNote}</p>
          {detail.item.note ? <p className="text-xs">Latest note: {detail.item.note}</p> : null}
          {detail.product ? <Link className="text-xs underline underline-offset-4" href={admin ? `/admin/products/${detail.product.id}` : '/admin/products'} target="_blank">Open catalogue record</Link> : null}
          {detail.history.length ? <ol className="space-y-2">{detail.history.map((entry, index) => <li key={entry.reviewedAt + String(index)} className="text-xs"><p>{entry.decision} · {entry.reviewedAt.slice(0, 16).replace('T', ' ')} UTC</p><p>{entry.note}</p></li>)}</ol> : null}
          {!imported ? <Button variant="danger" disabled={busy} onClick={() => decide('rejected')}>Reject association & next</Button> : null}
        </div></details>
      </div>
    </div>
    <div className="sticky bottom-[calc(var(--admin-bottomnav-height)+20px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-[var(--admin-border)] bg-white px-4 py-3 sm:px-5 md:bottom-0">
      <div className="min-w-0 flex-1"><p className="!m-0 text-xs text-[var(--admin-muted)]">{imported ? 'Already imported. Review history is retained.' : 'Approve confirms you inspected this original and verified every listed attribute.'}</p>{!ready && !imported ? <p className="!mb-0 !mt-1 text-xs text-[var(--admin-warning)]">{!loaded ? 'Wait for the original image to load.' : detail.withdrawalReason || detail.item.source.flags.length ? 'This source is blocked from approval.' : 'Resolve the highlighted checks or hold for later.'}</p> : null}<p className="!mb-0 !mt-1 hidden text-xs text-[var(--admin-muted)] sm:block">Alt + Enter: approve · Alt + H: hold · Alt + J: skip</p></div>
      {!imported ? <div className="flex w-full flex-wrap gap-2 sm:w-auto"><Button className="!min-h-11 flex-1 sm:flex-none" disabled={busy} onClick={() => decide('held')} aria-keyshortcuts="Alt+H"><PauseIcon className="size-4" aria-hidden="true" />Hold & next</Button><Button className="!min-h-11 flex-1 disabled:!border-[var(--admin-border)] disabled:!bg-[var(--admin-paper-strong)] disabled:!text-[var(--admin-muted)] sm:flex-none" variant="primary" disabled={busy || searching || !ready} onClick={() => decide('approved')} aria-keyshortcuts="Alt+Enter"><CheckIcon className="size-4" aria-hidden="true" />{busy ? 'Saving…' : 'Approve & next'}</Button></div> : null}
    </div>
    {error ? <p role="alert" className="admin-note admin-note--danger !m-4">{error}</p> : null}
  </section>;
}
