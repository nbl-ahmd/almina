'use client';

import Image from 'next/image';
import Link from '../app-link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowTopRightOnSquareIcon, CheckIcon, MagnifyingGlassIcon, ForwardIcon, PauseIcon } from '@heroicons/react/24/outline';
import { imageReviewNetContentPattern, isCoreImageIdentityField, type ImageIdentityField, type ImageReviewDecisionInput, type ImageReviewDetail } from '@almina/contracts';
import { canApproveImage, canDiscardReviewField, editableProductField, imageReviewDecision, initialReviewChecks, inlineReviewCheck,
  isUnchangedMatch, previewImageReview, reviewFieldMatches, reviewHoldReasons, reviewProductChanges, type ReviewEdit } from '../../lib/admin/image-review-workflow';
import { ImageReviewAssociation } from './image-review-association';
import { productFieldError, productFieldLabels, type DraftProduct } from './image-review-product-fields';
import { Button } from './ui';

const labels: Record<ImageIdentityField, string> = {
  name: 'Product name', brand: 'Brand', line: 'Product line', strength: 'Strength / concentration', form: 'Product form',
  size: 'Net content', quantity: 'Count', multipack: 'Multipack', flavour: 'Flavour / fragrance', shadeModel: 'Shade / model',
  variantSize: 'Size', ageStage: 'Age / stage', barcode: 'Barcode', gtin: 'GTIN',
};
type Decision = Omit<ImageReviewDecisionInput, 'requestId'>;
export function ImageReviewWorkspace({ detail, admin, busy, hasNext, onDecision, onChoose, onCreate, onSkip }: {
  detail: ImageReviewDetail; admin: boolean; busy: boolean; hasNext: boolean;
  onDecision: (value: Decision) => Promise<void>; onChoose: (id: string) => Promise<void>;
  onCreate: (product: DraftProduct) => Promise<void>; onSkip: () => void;
}) {
  const [loaded, setLoaded] = useState(false), [imageFailed, setImageFailed] = useState(false), [zoom, setZoom] = useState(false);
  const [note, setNote] = useState(''), [holdReason, setHoldReason] = useState<string>(detail.product ? reviewHoldReasons[0] : reviewHoldReasons[3]);
  const [edits, setEdits] = useState<Partial<Record<ImageIdentityField, ReviewEdit>>>({});
  const [showAssociation, setShowAssociation] = useState(false), [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null), panel = useRef<HTMLElement>(null), sending = useRef(false);
  useEffect(() => { title.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ block: 'start' }); }, []);

  const imported = detail.item.status === 'imported';
  const controlsDisabled = busy || imported;
  const productChanges = reviewProductChanges(detail, edits);
  const hasProductChanges = Object.keys(productChanges).length > 0;
  const requiresSharedCheck = !!detail.sharedIdentifiers.length || productChanges.barcode !== undefined || productChanges.gtin !== undefined;
  const preview = previewImageReview(detail, productChanges);
  const priority = new Set(detail.comparison.filter(row => row.required && row.status !== 'match').map(row => row.field));
  const visible = preview.comparison.filter(row =>
    row.required || !!edits[row.field] || (row.field === 'barcode' || row.field === 'gtin') && !!row.catalogueValue
  ).sort((a, b) => Number(priority.has(b.field)) - Number(priority.has(a.field)));
  const checks = visible.filter(row => {
    const edit = edits[row.field];
    const key = editableProductField(row.field);
    return row.required || edit?.target === 'discard' || !!edit?.value.trim() || !!(key && productChanges[key] !== undefined);
  }).map(row => inlineReviewCheck(row, edits[row.field]));
  function editError(field: ImageIdentityField) {
    const key = editableProductField(field);
    const edit = edits[field];
    if (!key || edit?.target !== 'catalogue') return '';
    if (productChanges[key] === undefined) return '';
    if (!edit.value.trim()) return 'Enter a value from the label or undo the change.';
    if (field === 'size' && !imageReviewNetContentPattern.test(edit.value.trim())) return 'Enter a weight or volume, such as 113 g or 200 ml.';
    return productFieldError(key, productChanges[key] ?? '');
  }
  function resolved(field: ImageIdentityField) {
    const check = checks.find(check => check.field === field);
    return !check || (check.discardedExtraction ? canDiscardReviewField(preview, field) :
      (check.confirmed || isUnchangedMatch(preview, check)) && reviewFieldMatches(preview, check));
  }
  const fieldsToReview = visible.filter(row => !resolved(row.field) || !!editError(row.field)).length;
  const ready = !showAssociation && !fieldsToReview &&
    canApproveImage(preview, checks, loaded && !imageFailed, requiresSharedCheck);
  function setEdit(field: ImageIdentityField, edit?: ReviewEdit) {
    setEdits(current => {
      const next = { ...current };
      if (edit) next[field] = edit;
      else delete next[field];
      return next;
    });
  }
  async function decide(decision: 'approved' | 'held' | 'rejected') {
    if (controlsDisabled || sending.current || (decision === 'approved' && !ready)) return;
    sending.current = true;
    setError('');
    try {
      const approving = decision === 'approved';
      const input = imageReviewDecision(approving ? preview : detail, approving ? checks : initialReviewChecks(detail), decision,
        loaded, approving && requiresSharedCheck, note || (decision === 'held' ? holdReason : ''));
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
    const { field } = row;
    const original = detail.comparison.find(value => value.field === field) ?? row;
    const key = editableProductField(field);
    const edit = edits[field];
    const imageMode = edit?.target === 'extraction';
    const canEditProduct = admin && !!detail.product?.fields && !!key;
    const editable = canEditProduct || imageMode;
    const savedValue = (field !== 'size' && key ? detail.product?.fields?.[key] : '') || original.catalogueValue;
    const needsAttention = !resolved(field);
    const fieldError = editError(field);
    const discarded = edit?.target === 'discard';
    const canDiscard = !edit && needsAttention && canDiscardReviewField(preview, field);
    const value = edit && edit.target !== 'discard' ? edit.value : savedValue;
    const optionalBlank = !row.required && !value && !discarded;
    const id = `review-field-${field}`;
    const label = imageMode ? `Image label · ${labels[field]}` : canEditProduct && key && field !== 'size' ? productFieldLabels[key] : labels[field];

    return <div key={field} className="min-w-0 border-b border-[var(--admin-hairline)] px-3 py-3 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {editable && !discarded ? <label htmlFor={id} className="!m-0 !text-sm !font-medium">{label}</label> : <span className="text-sm font-medium">{label}</span>}
        {needsAttention || fieldError ? <span className="rounded-md bg-[var(--admin-warning-soft)] px-2 py-1 text-xs font-medium text-[var(--admin-warning)]">
          {original.status === 'conflict' && !edit ? 'Conflict' : 'Check value'}</span>
          : discarded ? <span className="text-xs text-[var(--admin-muted)]">Not applicable</span>
          : optionalBlank ? <span className="text-xs text-[var(--admin-muted)]">Optional</span>
          : edit ? <span className="text-xs text-[var(--admin-muted)]">{imageMode ? 'Extraction correction' : 'Product change'}</span> : null}
      </div>
      {discarded ? null : editable ? <input id={id} aria-describedby={optionalBlank ? undefined : `${id}-context`} aria-required={isCoreImageIdentityField(field)} aria-invalid={!!fieldError || !!edit && needsAttention}
        className="mt-1.5" value={value} disabled={controlsDisabled} maxLength={500}
        placeholder={!isCoreImageIdentityField(field) && !row.required ? 'Leave blank if not applicable' : imageMode ? 'Read from the original label' : 'Enter a value from the label'}
        onChange={event => {
          const next = event.target.value;
          setEdit(field, !imageMode && next.trim() === savedValue ? undefined : { target: imageMode ? 'extraction' : 'catalogue', value: next });
        }} />
        : <p className="!mb-0 !mt-1 break-words text-sm">{row.catalogueValue || 'Missing from catalogue'}</p>}
      {!optionalBlank ? <p id={`${id}-context`} className={`!mb-0 !mt-1.5 break-words text-xs text-[var(--admin-muted)] ${!needsAttention && !edit && row.imageValue === savedValue ? 'sr-only' : ''}`}>
        Extracted <strong>{original.imageValue || 'Unreadable'}</strong>
        {imageMode ? <> · Catalogue <strong>{row.catalogueValue || 'Missing'}</strong></>
          : edit?.target === 'catalogue' ? <> · Previously <strong>{savedValue || 'blank'}</strong></> : null}
      </p> : null}
      {fieldError ? <p className="!my-1 text-xs text-[var(--admin-warning)]">{fieldError}</p>
        : imageMode && needsAttention ? <p className="!my-1 text-xs text-[var(--admin-warning)]">{row.catalogueValue ?
          'Enter what the original label shows. Choose another product if the values differ.' :
          'The selected product has no catalogue value to compare.'}</p> : null}
      {!imported ? <div className="mt-1 flex flex-wrap gap-1.5">
        {canEditProduct && key && !edit && needsAttention && original.imageValue && original.imageValue !== savedValue &&
          (field !== 'size' || imageReviewNetContentPattern.test(original.imageValue)) ?
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(field, { target: 'catalogue', value: original.imageValue })}>Use extracted value</Button> : null}
        {!edit && row.catalogueValue ?
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(field, { target: 'extraction', value: original.imageValue })}>Correct extraction<span className="sr-only"> for {labels[field]}</span></Button> : null}
        {!edit && needsAttention && row.status === 'unknown' && row.catalogueValue &&
          reviewFieldMatches(preview, inlineReviewCheck(row, { target: 'extraction', value: row.catalogueValue })) ?
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(field, { target: 'extraction', value: row.catalogueValue })}>Label matches catalogue</Button> : null}
        {imageMode && row.catalogueValue && row.catalogueValue !== value ?
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(field, { target: 'extraction', value: row.catalogueValue })}>Use catalogue value for label</Button> : null}
        {canDiscard ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(field, { target: 'discard' })}>Not applicable<span className="sr-only"> for {labels[field]}</span></Button> : null}
        {edit ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(field)}>Undo<span className="sr-only"> {labels[field]} change</span></Button> : null}
      </div> : null}
    </div>;
  }

  const unavailable = !loaded ? 'Load the original to verify the image.' : detail.withdrawalReason || detail.item.source.flags.length ? 'This image is blocked from approval.'
    : !detail.product || showAssociation ? 'Select the exact catalogue product to approve.'
      : fieldsToReview ? 'Correct the highlighted fields or hold this image.' : requiresSharedCheck ?
        'By approving, you confirm the barcode and other fields identify this exact variant.' :
        'By approving, you confirm these values against the original label.';

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
        {detail.item.source.flags.length ? <p role="alert" className="admin-note admin-note--warning">This image is blocked from approval. {detail.item.source.flags.join(', ')}</p> : null}
        {!detail.product || showAssociation ? <ImageReviewAssociation detail={detail} admin={admin} disabled={controlsDisabled}
          allowDraft={!imported && !detail.item.draftProductId}
          onChoose={onChoose} onCreate={onCreate} {...(detail.product ? { onClear: () => onChoose(''), onClose: () => setShowAssociation(false) } : {})} />
          : <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="!m-0 !text-sm">Product fields</h3>
              {!imported ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setShowAssociation(true)}>Change product</Button> : null}
            </div>
            {fieldsToReview ? <p role="status" className="!m-0 text-xs text-[var(--admin-warning)]">{fieldsToReview} {fieldsToReview === 1 ? 'field needs' : 'fields need'} attention</p> : null}
            <div className="rounded-lg border border-[var(--admin-border)]">{visible.map(renderRow)}</div>
            {admin && !imported && detail.product.fields && preview.comparison.some(row => !visible.includes(row) && editableProductField(row.field)) ? <details>
              <summary className="cursor-pointer py-1 text-sm font-medium">Add a product field</summary>
              <label className="mt-2 !text-xs">Additional product field<select value="" disabled={busy} onChange={event => {
                const row = preview.comparison.find(value => value.field === event.target.value);
                if (row && editableProductField(row.field)) setEdit(row.field, { target: 'catalogue', value: '' });
              }}><option value="">Choose a field</option>{preview.comparison.filter(row => !visible.includes(row) && editableProductField(row.field))
                .map(row => <option key={row.field} value={row.field}>{labels[row.field]}</option>)}</select></label>
            </details> : null}
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
