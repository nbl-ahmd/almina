'use client';
import Image from 'next/image';
import Link from '../app-link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowTopRightOnSquareIcon, CheckIcon, ForwardIcon, MagnifyingGlassIcon, NoSymbolIcon, PauseIcon } from '@heroicons/react/24/outline';
import { imageReviewNetContentPattern, type ImageIdentityField, type ImageReviewDecisionInput, type ImageReviewDetail } from '@almina/contracts';
import { editableProductField, previewImageReview, quickReviewDecision, reviewProductChanges } from '../../lib/admin/image-review-workflow';
import { ImageReviewAssociation } from './image-review-association';
import { productFieldError, productFieldLabels, type DraftProduct } from './image-review-product-fields';
import { Button } from './ui';
import { cn } from './cn';
import { inputClass } from './shadcn/styles';

const labels: Record<ImageIdentityField, string> = {
  name: 'Product name', brand: 'Brand', line: 'Product line', strength: 'Strength', form: 'Form',
  size: 'Net content', quantity: 'Count', multipack: 'Multipack', flavour: 'Flavour / fragrance', shadeModel: 'Shade / model',
  variantSize: 'Size', ageStage: 'Age / stage', barcode: 'Barcode', gtin: 'GTIN',
};
type Decision = Omit<ImageReviewDecisionInput, 'requestId'>;

/** One image, one product, one decision. Only details that differ from the label are shown; everything else is a single
 *  "matches" line. The reviewer can fix the catalogue value in place, then approve (and publish) in one action. */
export function ImageReviewWorkspace({ detail, admin, busy, hasNext, onDecision, onChoose, onCreate, onSkip }: {
  detail: ImageReviewDetail; admin: boolean; busy: boolean; hasNext: boolean;
  onDecision: (value: Decision) => Promise<void>; onChoose: (id: string) => Promise<void>;
  onCreate: (product: DraftProduct) => Promise<void>; onSkip: () => void;
}) {
  const [loaded, setLoaded] = useState(false), [imageFailed, setImageFailed] = useState(false), [zoom, setZoom] = useState(false);
  const [edits, setEdits] = useState<Partial<Record<ImageIdentityField, string>>>({});
  const [shared, setShared] = useState(false), [showAssociation, setShowAssociation] = useState(false), [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null), panel = useRef<HTMLElement>(null), sending = useRef(false);
  useEffect(() => { title.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ block: 'start' }); }, []);

  const imported = detail.item.status === 'imported';
  const locked = busy || imported;
  const blocked = !!detail.withdrawalReason || detail.item.source.flags.length > 0;
  const canEditProduct = admin && !!detail.product?.fields;
  const productChanges = reviewProductChanges(detail, Object.fromEntries(Object.entries(edits).map(([field, value]) => [field, { target: 'catalogue' as const, value }])));
  const hasChanges = Object.keys(productChanges).length > 0;
  const preview = previewImageReview(detail, productChanges);
  const requiresShared = detail.sharedIdentifiers.length > 0 || productChanges.barcode !== undefined || productChanges.gtin !== undefined;
  const rows = preview.comparison.filter(row => row.required || edits[row.field] !== undefined || (row.status !== 'match' && (row.imageValue || row.catalogueValue)));
  const differing = rows.filter(row => row.status !== 'match' || edits[row.field] !== undefined);
  const agreeing = rows.filter(row => !differing.includes(row));

  function editError(field: ImageIdentityField) {
    const key = editableProductField(field);
    const value = edits[field];
    if (!key || value === undefined || productChanges[key] === undefined) return '';
    if (!value.trim()) return 'Enter the value from the label, or use the catalogue value.';
    if (field === 'size' && !imageReviewNetContentPattern.test(value.trim())) return 'Enter a weight or volume, such as 113 g or 200 ml.';
    return productFieldError(key, productChanges[key] ?? '');
  }
  const editProblem = rows.some(row => !!editError(row.field));
  const unresolved = differing.filter(row => row.status !== 'match').length;
  const ready = !!detail.product && !showAssociation && !blocked && loaded && !imageFailed && !editProblem && (!requiresShared || shared);
  const approveLabel = admin ? 'Save & publish' : 'Approve';

  async function decide(decision: 'approved' | 'held' | 'rejected') {
    if (locked || sending.current || (decision === 'approved' && !ready)) return;
    sending.current = true; setError('');
    try { await onDecision(quickReviewDecision(detail, productChanges, decision, loaded, shared)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save this review. Try again.'); }
    finally { sending.current = false; }
  }
  function shortcuts(event: KeyboardEvent<HTMLElement>) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat || busy) return;
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Enter' && ready) { event.preventDefault(); void decide('approved'); }
    if (event.code === 'KeyH' && !imported) { event.preventDefault(); void decide('held'); }
    if (event.code === 'KeyJ' && hasNext) { event.preventDefault(); onSkip(); }
  }

  function row(entry: typeof rows[number]) {
    const { field } = entry, key = editableProductField(field), id = `review-field-${field}`;
    const original = detail.comparison.find(value => value.field === field) ?? entry;
    const saved = (field !== 'size' && key ? detail.product?.fields?.[key] : '') || original.catalogueValue;
    const edited = edits[field] !== undefined, value = edited ? edits[field]! : saved;
    const problem = editError(field), editable = canEditProduct && !!key;
    const mismatch = entry.status !== 'match' && !edited;
    return <div key={field} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', mismatch ? 'bg-warn' : 'bg-ok')} />
        {editable ? <label htmlFor={id}>{field !== 'size' && key ? productFieldLabels[key] : labels[field]}</label> : labels[field]}
      </div>
      <div className="min-w-0">
        {editable ? <input id={id} className={inputClass} value={value} disabled={locked} maxLength={500} aria-invalid={!!problem}
          placeholder={original.imageValue ? undefined : 'Not on the label'}
          onChange={event => { const next = event.target.value; setEdits(current => { const copy = { ...current }; if (next.trim() === saved) delete copy[field]; else copy[field] = next; return copy; }); }} />
          : <p className="m-0 break-words text-sm">{value || <span className="text-mute">Missing from catalogue</span>}</p>}
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 text-xs text-mute">
          <span>Label says <strong className="font-medium text-ink-2">{original.imageValue || 'nothing readable'}</strong></span>
          {editable && original.imageValue && original.imageValue !== value && (field !== 'size' || imageReviewNetContentPattern.test(original.imageValue)) && !locked
            ? <button type="button" className="font-medium text-ink underline underline-offset-4 outline-0 focus-visible:outline-2 focus-visible:outline-ink"
              onClick={() => setEdits(current => ({ ...current, [field]: original.imageValue }))}>Use label value</button> : null}
          {edited ? <button type="button" className="underline underline-offset-4 outline-0 focus-visible:outline-2 focus-visible:outline-ink"
            onClick={() => setEdits(current => { const copy = { ...current }; delete copy[field]; return copy; })}>Undo</button> : null}
        </p>
        {problem ? <p role="alert" className="m-0 mt-1 text-xs text-bad">{problem}</p> : null}
      </div>
    </div>;
  }

  const hint = imported ? 'Already published. History is kept.'
    : !loaded && !imageFailed ? 'Loading the original…'
      : blocked ? 'This image cannot be approved. Skip it or hold it.'
        : !detail.product || showAssociation ? 'Choose the matching product first.'
          : requiresShared && !shared ? 'Confirm the variant below to continue.'
            : unresolved ? `${unresolved} ${unresolved === 1 ? 'detail differs' : 'details differ'} from the label. Fix ${unresolved === 1 ? 'it' : 'them'} above or approve as is.`
              : hasChanges ? 'Your corrections are saved with the approval.' : 'Looks right. Approve to continue.';

  return <section ref={panel} onKeyDown={shortcuts} className="mb-4 min-w-0 scroll-mt-20 overflow-hidden rounded-xl border border-line bg-surface" aria-labelledby="review-product-title" aria-busy={busy}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <h2 ref={title} tabIndex={-1} id="review-product-title" className="m-0 text-base font-semibold outline-0 [overflow-wrap:anywhere]">{detail.product?.name || detail.item.source.identity.name || 'Find the product for this image'}</h2>
        <p className="m-0 mt-0.5 text-xs text-mute">{detail.product?.productId || 'No match yet'}{detail.item.status !== 'pending' ? ` · ${detail.item.status}` : ''}
          {detail.product ? <> · <Link className="underline underline-offset-4" href={admin ? `/admin/products/${detail.product.id}` : '/admin/products'} target="_blank">Open product</Link></> : null}</p>
      </div>
      {detail.product && !imported && !showAssociation ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setShowAssociation(true)}>Change product</Button> : null}
    </header>
    <div className="grid min-w-0 items-start gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <figure className="m-0 min-w-0 overflow-hidden rounded-lg border border-line lg:sticky lg:top-20">
        <figcaption className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
          <span className="text-xs font-medium text-mute">Original image</span>
          <span className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={!loaded || imageFailed} onClick={() => setZoom(value => !value)} aria-pressed={zoom}><MagnifyingGlassIcon className="size-4" aria-hidden="true" />{zoom ? 'Fit' : 'Zoom'}</Button>
            <a className="inline-flex h-8 items-center gap-1 px-2 text-xs text-ink-2 underline underline-offset-4" href={detail.item.source.imageUrl} target="_blank" rel="noreferrer">Open<ArrowTopRightOnSquareIcon className="size-3.5" aria-hidden="true" /></a>
          </span>
        </figcaption>
        <div className={cn('flex h-[clamp(14rem,40dvh,22rem)] overflow-auto bg-soft lg:h-[clamp(18rem,60dvh,36rem)]', zoom ? 'items-start justify-start' : 'items-center justify-center')}>
          <Image src={detail.item.source.imageUrl} alt={`Original label: ${detail.item.source.identity.name || 'unidentified product'}`} width={600} height={600} unoptimized
            onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setImageFailed(true); }}
            className={zoom ? 'h-auto w-[180%] max-w-none shrink-0 object-contain' : 'h-full w-full object-contain p-2'} />
        </div>
        {imageFailed ? <p role="alert" className="m-2 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">The image could not load. Hold it or skip.</p> : null}
      </figure>
      <div className="min-w-0 space-y-4">
        {detail.withdrawalReason ? <p role="alert" className="m-0 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">This match was withdrawn. {detail.withdrawalReason}</p> : null}
        {detail.item.source.flags.length ? <p role="alert" className="m-0 rounded-lg bg-warn-soft p-3 text-[13px] text-warn">Flagged image: {detail.item.source.flags.join(', ')}. It cannot be approved.</p> : null}
        {!detail.product || showAssociation ? <ImageReviewAssociation detail={detail} admin={admin} disabled={locked} allowDraft={!imported && !detail.item.draftProductId}
          onChoose={async id => { await onChoose(id); setShowAssociation(false); setEdits({}); setShared(false); }} onCreate={onCreate}
          {...(detail.product ? { onClear: () => onChoose(''), onClose: () => setShowAssociation(false) } : {})} />
          : <>
            <div className="overflow-hidden rounded-lg border border-line">
              <p className="m-0 border-b border-line bg-soft px-4 py-2 text-xs font-medium text-mute">{differing.length ? 'Check these details' : 'Details'}</p>
              {differing.length ? <div className="divide-y divide-line">{differing.map(row)}</div> : <p className="m-0 px-4 py-3 text-sm text-ink-2">Everything on the label matches the catalogue.</p>}
              {agreeing.length ? <details className="border-t border-line">
                <summary className="cursor-pointer px-4 py-2.5 text-[13px] text-ink-2">{agreeing.length} {agreeing.length === 1 ? 'detail matches' : 'details match'}: {agreeing.map(entry => labels[entry.field]).join(', ')}</summary>
                <div className="divide-y divide-line border-t border-line">{agreeing.map(row)}</div>
              </details> : null}
            </div>
            {requiresShared ? <label className="flex items-start gap-2.5 rounded-lg bg-warn-soft p-3 text-[13px] text-warn">
              <input type="checkbox" className="mt-0.5" checked={shared} disabled={locked} onChange={event => setShared(event.target.checked)} />
              <span>This barcode is also used by another product. I confirm this image shows this exact variant.</span>
            </label> : null}
          </>}
        <details className="rounded-lg border border-line">
          <summary className="cursor-pointer px-4 py-2.5 text-[13px] text-ink-2">Label text and history</summary>
          <div className="grid gap-2 border-t border-line p-4 text-xs text-mute">
            <p className="m-0 whitespace-pre-line">Saved label text · {detail.item.source.labelText.join(' · ') || 'None'}</p>
            {detail.item.source.sourceNote ? <p className="m-0">{detail.item.source.sourceNote}</p> : null}
            {detail.item.note ? <p className="m-0">Latest note · {detail.item.note}</p> : null}
            {detail.history.length ? <ol className="m-0 grid list-none gap-1 p-0">{detail.history.map((entry, index) => <li key={entry.reviewedAt + String(index)}>{entry.decision} · {entry.reviewedAt.slice(0, 16).replace('T', ' ')} UTC</li>)}</ol> : null}
          </div>
        </details>
      </div>
    </div>
    <div className="sticky bottom-[5.5rem] z-20 grid gap-2 border-t border-line bg-surface px-4 py-3 sm:px-5 md:bottom-0">
      {error ? <p role="alert" className="m-0 rounded-lg bg-bad-soft p-3 text-[13px] text-bad">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 min-w-0 flex-1 text-[13px] text-ink-2" role="status">{hint}<span className="ml-2 hidden text-xs text-mute lg:inline">{!imported ? 'Alt+Enter approve · Alt+H hold · Alt+J skip' : ''}</span></p>
        {!imported ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="ghost" disabled={busy || !hasNext} onClick={onSkip} aria-keyshortcuts="Alt+J"><ForwardIcon className="size-4" aria-hidden="true" />Skip</Button>
          <Button variant="ghost" disabled={busy || !detail.product} onClick={() => decide('rejected')}><NoSymbolIcon className="size-4" aria-hidden="true" />Not a match</Button>
          <Button variant="outline" disabled={busy} onClick={() => decide('held')} aria-keyshortcuts="Alt+H"><PauseIcon className="size-4" aria-hidden="true" />Hold</Button>
          <Button className="flex-1 sm:flex-none" variant="primary" size="lg" disabled={busy || !ready} onClick={() => decide('approved')} aria-keyshortcuts="Alt+Enter">
            <CheckIcon className="size-4" aria-hidden="true" />{busy ? 'Working…' : `${approveLabel} & next`}
          </Button>
        </div> : null}
      </div>
    </div>
  </section>;
}
