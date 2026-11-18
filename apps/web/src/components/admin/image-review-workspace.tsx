'use client';

import Image from 'next/image';
import Link from '../app-link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowTopRightOnSquareIcon, CheckIcon, MagnifyingGlassIcon, ForwardIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { ImageIdentityField, ImageReviewDecisionInput, ImageReviewDetail, ImageReviewProductChanges } from '@almina/contracts';
import { canApproveImage, editableProductField, imageReviewDecision, isUnchangedMatch, previewImageReview,
  reviewFieldMatches, reviewHoldReasons, reviewLabelEvidence, type ReviewCheck } from '../../lib/admin/image-review-workflow';
import { ImageReviewAssociation } from './image-review-association';
import { productFieldError, productFieldLabels, type DraftProduct } from './image-review-product-fields';
import { Button } from './ui';

const labels: Record<ImageIdentityField, string> = {
  name: 'Product name', brand: 'Brand', line: 'Product line', strength: 'Strength / concentration', form: 'Product form',
  size: 'Net content', quantity: 'Count', multipack: 'Multipack', flavour: 'Flavour / fragrance', shadeModel: 'Shade / model',
  variantSize: 'Size', ageStage: 'Age / stage', barcode: 'Barcode', gtin: 'GTIN',
};
type Decision = Omit<ImageReviewDecisionInput, 'requestId'>;
type FieldReview = {
  image?: string; catalogue?: string; mode?: 'image' | 'evidence' | undefined;
  receipt?: Pick<ReviewCheck, 'imageValue' | 'catalogueValue' | 'evidence'> | undefined;
};

export function ImageReviewWorkspace({ detail, admin, busy, hasNext, onDecision, onChoose, onCreate, onSkip }: {
  detail: ImageReviewDetail; admin: boolean; busy: boolean; hasNext: boolean;
  onDecision: (value: Decision) => Promise<void>; onChoose: (id: string) => Promise<void>;
  onCreate: (product: DraftProduct) => Promise<void>; onSkip: () => void;
}) {
  const [loaded, setLoaded] = useState(false), [imageFailed, setImageFailed] = useState(false), [zoom, setZoom] = useState(false);
  const [shared, setShared] = useState(false), [note, setNote] = useState(''), [holdReason, setHoldReason] = useState<string>(detail.product ? reviewHoldReasons[0] : reviewHoldReasons[3]);
  const [productChanges, setProductChanges] = useState<ImageReviewProductChanges>({});
  const [fieldReviews, setFieldReviews] = useState<Partial<Record<ImageIdentityField, FieldReview>>>({});
  const [writingEvidence, setWritingEvidence] = useState<Partial<Record<ImageIdentityField, string>>>({});
  const [showAssociation, setShowAssociation] = useState(false), [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null), panel = useRef<HTMLElement>(null), sending = useRef(false);
  useEffect(() => { title.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ block: 'start' }); }, []);

  const imported = detail.item.status === 'imported';
  const controlsDisabled = busy || imported;
  const hasProductChanges = Object.keys(productChanges).length > 0;
  const changedIdentifier = productChanges.barcode !== undefined || productChanges.gtin !== undefined;
  const requiresSharedCheck = !!detail.sharedIdentifiers.length || changedIdentifier;
  const preview = previewImageReview(detail, productChanges);
  const priority = new Set(detail.comparison.filter(row => row.required && row.status !== 'match').map(row => row.field));
  const visible = preview.comparison.filter(row => {
    const key = editableProductField(row.field);
    return row.required || !!fieldReviews[row.field] || !!(key && productChanges[key] !== undefined) ||
      (row.field === 'barcode' || row.field === 'gtin') && !!row.catalogueValue;
  }).sort((a, b) => Number(priority.has(b.field)) - Number(priority.has(a.field)));
  const checks: ReviewCheck[] = visible.flatMap(row => {
    const field = fieldReviews[row.field];
    // Catalogue-only barcodes are corroboration until the reviewer reads one from the label.
    const key = editableProductField(row.field);
    if (!row.required && field?.image === undefined && !field?.catalogue && !(key && productChanges[key] !== undefined)) return [];
    const imageValue = (field?.image ?? row.imageValue).trim();
    const catalogueValue = row.catalogueValue || field?.catalogue?.trim() || '';
    const receipt = field?.receipt;
    const confirmed = receipt?.imageValue === imageValue && receipt.catalogueValue === catalogueValue;
    return [{ field: row.field, imageValue, catalogueValue, confirmed, evidence: confirmed ? receipt.evidence : '' }];
  });
  const changedFieldsVerified = Object.entries(productChanges).every(([key, value]) => {
    const check = checks.find(row => editableProductField(row.field) === key);
    return !productFieldError(key as keyof ImageReviewProductChanges, value ?? '') && check?.confirmed && check.evidence.length >= 10;
  });
  const ready = !showAssociation && changedFieldsVerified && (!requiresSharedCheck || shared) &&
    canApproveImage(preview, checks, loaded && !imageFailed, shared);
  function updateReview(field: ImageIdentityField, update: Partial<FieldReview>) {
    setFieldReviews(current => ({ ...current, [field]: { ...current[field], ...update } }));
  }
  function editProduct(field: ImageIdentityField, key: keyof ImageReviewProductChanges, value: string) {
    const previous = detail.comparison.find(row => row.field === field)?.catalogueValue ?? '';
    const raw = detail.product?.fields?.[key] || previous;
    setProductChanges(current => {
      const next = { ...current };
      if (value === raw) delete next[key];
      else next[key] = value;
      return next;
    });
    updateReview(field, { receipt: undefined });
    if (key === 'barcode' || key === 'gtin') setShared(false);
  }
  async function decide(decision: 'approved' | 'held' | 'rejected') {
    if (controlsDisabled || sending.current || (decision === 'approved' && !ready)) return;
    sending.current = true;
    setError('');
    try {
      const input = imageReviewDecision(preview, checks, decision, loaded, shared, note || (decision === 'held' ? holdReason : ''));
      if (decision === 'approved' && hasProductChanges) input.productChanges = productChanges;
      await onDecision(input);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Review could not be saved. Retry this image.'); }
    finally { sending.current = false; }
  }
  function shortcuts(event: KeyboardEvent<HTMLElement>) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat || busy) return;
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Enter' && ready) { event.preventDefault(); void decide('approved'); }
    if (event.code === 'KeyH' && !imported) { event.preventDefault(); void decide('held'); }
    if (event.code === 'KeyJ' && hasNext) { event.preventDefault(); onSkip(); }
  }

  function renderRow(row: typeof visible[number]) {
    const field = row.field;
    const original = detail.comparison.find(value => value.field === field) ?? row;
    const key = editableProductField(field);
    const editCatalogue = admin && !!detail.product?.fields && !!key;
    const change = key ? productChanges[key] : undefined;
    const savedValue = (key ? detail.product?.fields?.[key] : undefined) || original.catalogueValue;
    const review = fieldReviews[field];
    const check = checks.find(value => value.field === field);
    const matching = check && isUnchangedMatch(preview, check);
    const needsAttention = !!check && (!matching || change !== undefined || original.status !== 'match');
    const canVerify = !!check && reviewFieldMatches(preview, check);
    const verified = check?.confirmed;
    const evidenceMode = review?.mode === 'evidence';
    const imageMode = review?.mode === 'image' || evidenceMode;
    const id = `review-field-${field}`;
    const fieldError = key && change !== undefined ? productFieldError(key, change) : '';
    return <div key={field} className="min-w-0 border-b border-[var(--admin-hairline)] px-3 py-3 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <label htmlFor={editCatalogue || imageMode ? id : undefined} className="!m-0 !text-sm !font-medium">{imageMode ? `Image label · ${labels[field]}` : editCatalogue && key ? productFieldLabels[key] : labels[field]}</label>
        {verified ? <span className="flex items-center gap-1 text-xs text-[var(--admin-success)]"><CheckIcon className="size-3.5" aria-hidden="true" />Verified</span>
          : needsAttention ? <span className="rounded-md bg-[var(--admin-warning-soft)] px-2 py-1 text-xs font-medium text-[var(--admin-warning)]">
            {change !== undefined ? 'Unsaved change' : row.status === 'conflict' ? 'Conflict' : 'Check value'}
          </span> : !imported && !imageMode ? <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm !text-xs" disabled={busy}
            onClick={() => updateReview(field, { mode: row.catalogueValue ? 'image' : 'evidence' })}>Correct extraction<span className="sr-only"> for {labels[field]}</span></button> : null}
      </div>
      {imageMode ? <input id={id} autoFocus aria-describedby={`${id}-context`} className="mt-1.5" value={review?.image ?? row.imageValue}
        disabled={controlsDisabled} maxLength={500} placeholder="Read from the original label"
        onChange={event => updateReview(field, { image: event.target.value, receipt: undefined })} />
        : editCatalogue && key ? <input id={id} aria-describedby={`${id}-context`} aria-invalid={!!fieldError} className="mt-1.5"
          value={change ?? savedValue} disabled={controlsDisabled} placeholder={row.imageValue ? `Extracted ${row.imageValue}` : 'No catalogue value'}
          onChange={event => editProduct(field, key, event.target.value)} />
        : <p id={id} className="!mb-0 !mt-1 break-words text-sm">{row.catalogueValue || 'Missing from catalogue'}</p>}
      <p id={`${id}-context`} className={`!mb-0 !mt-1.5 break-words text-xs text-[var(--admin-muted)] ${!needsAttention && !imageMode && row.imageValue === (editCatalogue ? savedValue : row.catalogueValue) ? 'sr-only' : ''}`}>
        Image label <strong>{row.imageValue || 'Unreadable'}</strong>
        {imageMode ? <> · Catalogue <strong>{row.catalogueValue || review?.catalogue || 'Missing'}</strong></> : null}
        {change !== undefined ? <> · Previously <strong>{savedValue || 'blank'}</strong></> : null}
        {!imageMode && review?.image !== undefined ? <> · Corrected label <strong>{review.image || 'blank'}</strong></> : null}
      </p>
      {fieldError ? <p role="alert" className="!my-1 text-xs text-[var(--admin-warning)]">{fieldError}</p> : null}
      {evidenceMode ? <div className="mt-2 grid gap-2">
        {!row.catalogueValue ? <label className="!text-xs">Independently verified catalogue value<input value={review?.catalogue ?? ''} maxLength={500}
          disabled={controlsDisabled} onChange={event => updateReview(field, { catalogue: event.target.value, receipt: undefined })} /></label> : null}
        <label className="!text-xs">Evidence for {labels[field]}<input value={writingEvidence[field] ?? ''} maxLength={1000} disabled={controlsDisabled}
          placeholder="Manufacturer, catalogue record or other verified source"
          onChange={event => { setWritingEvidence(current => ({ ...current, [field]: event.target.value })); updateReview(field, { receipt: undefined }); }} /></label>
      </div> : null}
      {!imported ? <div className="mt-2 flex flex-wrap gap-1.5">
        {(needsAttention || imageMode) && (canVerify || imageMode) && !verified ? <Button size="sm" disabled={busy || !loaded || !canVerify || !!fieldError || !!verified ||
          (evidenceMode ? (writingEvidence[field]?.trim().length ?? 0) < 10 : !row.catalogueValue)} onClick={() => {
          if (!check) return;
          updateReview(field, { mode: undefined, receipt: { imageValue: check.imageValue, catalogueValue: check.catalogueValue,
            evidence: evidenceMode ? writingEvidence[field]!.trim() : reviewLabelEvidence } });
        }}>{evidenceMode ? 'Verify with evidence' : 'Verified on label'}<span className="sr-only"> for {labels[field]}</span></Button> : null}
        {!imageMode && editCatalogue && key && !matching && row.imageValue && row.imageValue !== (change ?? savedValue) ?
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => editProduct(field, key, row.imageValue)}>Use extracted value</Button> : null}
        {imageMode ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateReview(field, { mode: undefined })}>Back to product field</Button>
          : needsAttention ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateReview(field, { mode: row.catalogueValue ? 'image' : 'evidence' })}>Correct extraction<span className="sr-only"> for {labels[field]}</span></Button> : null}
        {imageMode && row.catalogueValue && row.catalogueValue !== check?.imageValue ? <Button size="sm" variant="ghost" disabled={busy}
          onClick={() => updateReview(field, { image: row.catalogueValue, receipt: undefined })}>Use catalogue reading</Button> : null}
        {needsAttention && !imageMode && !verified && row.status === 'unknown' && row.catalogueValue && !canVerify &&
          reviewFieldMatches(preview, { field, confirmed: false, evidence: '', imageValue: row.catalogueValue, catalogueValue: row.catalogueValue }) ?
          <Button size="sm" variant="ghost" disabled={busy || !loaded || !!fieldError} onClick={() => updateReview(field, {
            image: row.catalogueValue, receipt: { imageValue: row.catalogueValue, catalogueValue: row.catalogueValue, evidence: reviewLabelEvidence },
          })}>Confirm catalogue value on label</Button> : null}
        {imageMode && !evidenceMode ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateReview(field, { mode: 'evidence' })}>Cite another source</Button> : null}
        {key && change !== undefined && !imageMode ? <Button size="sm" variant="ghost" disabled={busy}
          onClick={() => editProduct(field, key, savedValue)}>Undo product change</Button> : null}
        {!original.required && fieldReviews[field] && change === undefined ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
          setFieldReviews(current => { const next = { ...current }; delete next[field]; return next; });
          setWritingEvidence(current => { const next = { ...current }; delete next[field]; return next; });
        }}>Remove added check</Button> : null}
      </div> : null}
    </div>;
  }

  const fieldsToReview = checks.filter(check => {
    const key = editableProductField(check.field);
    return !check.confirmed && (!isUnchangedMatch(preview, check) || !!(key && productChanges[key] !== undefined));
  }).length;
  const unavailable = !loaded ? 'Load the original to verify the image.' : detail.withdrawalReason || detail.item.source.flags.length ? 'This image is blocked from approval.'
    : !detail.product || showAssociation ? 'Select the exact catalogue product to approve.'
      : !ready ? 'Verify the highlighted fields or hold this image.' : hasProductChanges ? 'Saves the product changes and approves the image together.' : 'Approval confirms you checked this original against the listed fields.';

  return <section ref={panel} onKeyDown={shortcuts} className="min-w-0 scroll-mt-20 rounded-xl border border-[var(--admin-border)] bg-white" aria-labelledby="review-product-title" aria-busy={busy}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <h2 ref={title} tabIndex={-1} id="review-product-title" className="!m-0 !text-base [overflow-wrap:anywhere]">{detail.product?.name || detail.item.source.identity.name || 'Identify this product'}</h2>
        <p className="!mb-0 !mt-1 text-xs text-[var(--admin-muted)]">{detail.product?.productId || 'No catalogue match'}{detail.item.status !== 'pending' ? ` · ${detail.item.status}` : ''}</p>
      </div>
      <Button variant="ghost" disabled={busy || !hasNext} onClick={onSkip} aria-keyshortcuts="Alt+J"><ForwardIcon className="size-4" aria-hidden="true" />Skip for now</Button>
    </header>
    <div className="grid min-w-0 items-start gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <figure className="m-0 min-w-0 rounded-lg border border-[var(--admin-border)] lg:sticky lg:top-20">
        <figcaption className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--admin-hairline)] px-3 py-1.5">
          <span className="text-xs font-medium">Original image</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={!loaded || imageFailed} onClick={() => setZoom(value => !value)} aria-pressed={zoom}><MagnifyingGlassIcon className="size-4" aria-hidden="true" />{zoom ? 'Fit image' : 'Zoom label'}</Button>
            <a className="inline-flex min-h-9 items-center gap-1 text-xs underline underline-offset-4" href={detail.item.source.imageUrl} target="_blank" rel="noreferrer">Open original<ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden="true" /></a>
          </div>
        </figcaption>
        <div className={`flex h-[clamp(12rem,34dvh,19rem)] overflow-auto rounded-b-lg lg:h-[clamp(17rem,55dvh,32rem)] ${zoom ? 'items-start justify-start' : 'items-center justify-center'}`}>
          <Image src={detail.item.source.imageUrl} alt={`Original label: ${detail.item.source.identity.name || 'unidentified product'}`} width={600} height={600} unoptimized
            onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setImageFailed(true); }}
            className={zoom ? 'h-auto w-[180%] max-w-none shrink-0 object-contain' : 'h-full w-full object-contain p-2'} />
        </div>
        {imageFailed ? <p role="alert" className="admin-note admin-note--danger !m-2">Image could not load. Hold it or skip.</p>
          : !loaded ? <p role="status" className="m-2 text-xs text-[var(--admin-muted)]">Loading original…</p> : null}
      </figure>
      <div className="min-w-0 space-y-4">
        {detail.withdrawalReason ? <p role="alert" className="admin-note admin-note--danger">Withdrawn association. {detail.withdrawalReason}</p> : null}
        {detail.item.source.flags.length ? <p role="alert" className="admin-note admin-note--warning">Image flagged for review. {detail.item.source.flags.join(', ')}</p> : null}
        {!detail.product || showAssociation ? <ImageReviewAssociation detail={detail} admin={admin} disabled={controlsDisabled}
          allowDraft={['pending', 'held'].includes(detail.item.status) && !detail.item.source.flags.length && !detail.item.draftProductId}
          onChoose={onChoose} onCreate={onCreate} {...(detail.product ? { onClear: () => onChoose(''), onClose: () => setShowAssociation(false) } : {})} />
          : <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="!m-0 !text-sm">Product fields</h3>
              {!imported ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setShowAssociation(true)}>Change product</Button> : null}
            </div>
            {fieldsToReview ? <p role="status" className="!m-0 text-xs text-[var(--admin-warning)]">{fieldsToReview} {fieldsToReview === 1 ? 'field needs' : 'fields need'} verification</p> : null}
            <div className="rounded-lg border border-[var(--admin-border)]">{visible.map(renderRow)}</div>
            {!imported && preview.comparison.some(row => !visible.includes(row)) ? <details>
              <summary className="cursor-pointer py-1 text-sm font-medium">Add an attribute</summary>
              <label className="mt-2 !text-xs">Additional identity field<select value="" disabled={busy} onChange={event => {
                const row = preview.comparison.find(value => value.field === event.target.value);
                if (row) updateReview(row.field, { image: row.imageValue, mode: 'evidence' });
              }}><option value="">Choose a field</option>{preview.comparison.filter(row => !visible.includes(row)).map(row => <option key={row.field} value={row.field}>{labels[row.field]}</option>)}</select></label>
            </details> : null}
            {requiresSharedCheck ? <label className="!flex-row !items-start !gap-2 !text-sm"><input type="checkbox" checked={shared} disabled={controlsDisabled} onChange={event => setShared(event.target.checked)} />
              <span>{changedIdentifier ? 'I verified the identifier and checked the other fields for the exact variant.' : 'This identifier is shared. I verified the exact variant using the other fields.'}</span>
            </label> : null}
          </>}
        <details className="border-t border-[var(--admin-border)] pt-2">
          <summary className="cursor-pointer py-1 text-sm font-medium">Notes & history</summary>
          <div className="admin-stack pt-3">
            {!imported ? <>
              <label>Review note<textarea rows={2} maxLength={2000} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label>
              <label>Reason for holding<select value={holdReason} disabled={busy} onChange={event => setHoldReason(event.target.value)}>{reviewHoldReasons.map(reason => <option key={reason}>{reason}</option>)}</select></label>
            </> : null}
            <p className="whitespace-pre-line text-xs text-[var(--admin-muted)]">Saved label text · {detail.item.source.labelText.join(' · ') || 'None'}</p>
            {detail.item.source.sourceNote ? <p className="text-xs text-[var(--admin-muted)]">{detail.item.source.sourceNote}</p> : null}
            {detail.item.note ? <p className="text-xs">Latest note · {detail.item.note}</p> : null}
            {detail.product ? <Link className="text-xs underline underline-offset-4" href={admin ? `/admin/products/${detail.product.id}` : '/admin/products'} target="_blank">Open full catalogue record</Link> : null}
            {detail.history.length ? <ol className="space-y-2">{detail.history.map((entry, index) => <li key={entry.reviewedAt + String(index)} className="text-xs"><p>{entry.decision} · {entry.reviewedAt.slice(0, 16).replace('T', ' ')} UTC</p><p>{entry.note}</p></li>)}</ol> : null}
            {!imported ? <Button variant="danger" disabled={busy} onClick={() => decide('rejected')}>Reject association & next</Button> : null}
          </div>
        </details>
      </div>
    </div>
    <div className="sticky bottom-[calc(var(--admin-bottomnav-height)+20px+env(safe-area-inset-bottom))] z-20 space-y-2 rounded-b-xl border-t border-[var(--admin-border)] bg-white px-3 py-2.5 sm:px-5 md:bottom-0">
      {error ? <p role="alert" className="admin-note admin-note--danger !m-0">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="!m-0 text-xs text-[var(--admin-muted)]">{imported ? 'Already imported. Review history is retained.' : unavailable}</p>
          {!imported ? <p className="!mb-0 !mt-1 hidden text-xs text-[var(--admin-muted)] sm:block">Alt + Enter to approve · Alt + H to hold · Alt + J to skip</p> : null}
        </div>
        {!imported ? <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button className="!min-h-10 flex-1 sm:flex-none" disabled={busy} onClick={() => decide('held')} aria-keyshortcuts="Alt+H"><PauseIcon className="size-4" aria-hidden="true" />Hold & next</Button>
          <Button className="!min-h-10 flex-1 disabled:!border-[var(--admin-border)] disabled:!bg-[var(--admin-paper-strong)] disabled:!text-[var(--admin-muted)] sm:flex-none" variant="primary" disabled={busy || !ready} onClick={() => decide('approved')} aria-keyshortcuts="Alt+Enter">
            <CheckIcon className="size-4" aria-hidden="true" />{busy ? 'Working…' : hasProductChanges ? 'Save changes & approve' : 'Approve & next'}
          </Button>
        </div> : null}
      </div>
    </div>
  </section>;
}
