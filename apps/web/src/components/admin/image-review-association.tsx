'use client';
import { inputClass } from './shadcn/styles';

import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { ImageReviewDetail } from '@almina/contracts';
import { adminRequest } from './controls';
import { ImageReviewDraftForm, type DraftProduct } from './image-review-product-fields';
import { Button } from './ui';

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> =>
    !!row && typeof row === 'object' && !Array.isArray(row)) : [];
}

export function ImageReviewAssociation({ detail, admin, disabled, allowDraft, onChoose, onCreate, onClose, onClear }: {
  detail: ImageReviewDetail; admin: boolean; disabled: boolean; allowDraft: boolean;
  onChoose: (productId: string) => Promise<void>; onCreate: (product: DraftProduct) => Promise<void>; onClose?: () => void; onClear?: () => Promise<void>;
}) {
  const [query, setQuery] = useState(() => (detail.item.source.identity.name || detail.item.source.identity.brand).slice(0, 80));
  const [results, setResults] = useState<{ productId: string; name: string }[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState<'search' | 'categories' | null>(null);
  const [error, setError] = useState('');
  async function search() {
    if (loading || disabled || query.trim().length < 2) return;
    setLoading('search');
    setError('');
    setResults(null);
    try {
      const value = await adminRequest('products/search?' + new URLSearchParams({ q: query.trim(), limit: '8' }));
      setResults(rows(value && typeof value === 'object' && 'products' in value ? value.products : value).flatMap(row =>
        typeof row?.product_id === 'string' && typeof row?.name === 'string' ? [{ productId: row.product_id, name: row.name }] : []));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Search could not be completed.'); }
    finally { setLoading(null); }
  }
  async function loadDraft() {
    if (loading || disabled) return;
    setCreating(true);
    setError('');
    if (categories) return;
    setLoading('categories');
    try {
      const options: { id: string; name: string }[] = [];
      for (let offset = 0; offset <= 10_000; offset += 100) {
        const page = rows(await adminRequest('category?' + new URLSearchParams({ limit: '100', offset: String(offset) })));
        options.push(...page.flatMap(row => typeof row?._id === 'string' && typeof row?.name === 'string' && row.disabled !== true ? [{ id: row._id, name: row.name }] : []));
        if (page.length < 100) break;
        if (offset === 10_000) throw new Error('Too many categories to load. Open Products to create this item.');
      }
      setCategories(options.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Categories could not be loaded.'); }
    finally { setLoading(null); }
  }
  async function choose(id: string) {
    setError('');
    try { await onChoose(id); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Product could not be selected.'); }
  }
  const suggested = detail.candidates.filter(candidate => candidate.productId !== detail.product?.productId);
  const savedDraft = detail.item.draftProductId && detail.item.draftProductId !== detail.product?.productId ? detail.item.draftProductId : null;
  return <div className="space-y-3">
    {!creating ? <h3 className="!m-0 !text-sm">Find a catalogue match</h3> : null}
    {error ? <p role="alert" className="rounded-lg bg-bad-soft p-4 text-[13px] text-bad !my-0">{error}</p> : null}
    {creating ? (categories && categories.length ? <ImageReviewDraftForm identity={detail.item.source.identity} categories={categories}
      busy={disabled} onCreate={onCreate} onCancel={() => { setCreating(false); setError(''); }} /> :
      <div className="space-y-2">
        {loading ? <p role="status" className="!m-0 text-sm">Loading categories…</p> : categories ? <p className="!m-0 text-sm">Add an active category in Categories before creating a product.</p> : <Button onClick={loadDraft}>Retry categories</Button>}
        <Button variant="ghost" disabled={!!loading} onClick={() => { setCreating(false); setError(''); }}>Back to search</Button>
      </div>) : <>
        <form onSubmit={event => { event.preventDefault(); void search(); }} className="flex items-end gap-2">
          <label className="min-w-0 flex-1">Find a product<input className={inputClass} type="search" value={query} maxLength={80} disabled={disabled || !!loading}
            onChange={event => { setQuery(event.target.value); setResults(null); }} placeholder="Name, barcode or product ID" /></label>
          <Button type="submit" disabled={disabled || !!loading || query.trim().length < 2}><MagnifyingGlassIcon className="size-4" aria-hidden="true" />{loading === 'search' ? 'Searching…' : 'Search'}</Button>
        </form>
        {results?.length === 0 ? <p role="status" className="!m-0 text-sm">No products found. Try a shorter name, barcode or product ID.</p> : null}
        {(results?.length || (!results && suggested.length)) ? <div className="space-y-1">
          <p className="!m-0 text-xs font-medium">{results ? 'Search results' : 'Suggested matches'}</p>
          <ul className="!m-0 list-none divide-y rounded-lg border !p-0">
            {(results ?? suggested).map(product => <li key={product.productId}>
              <button type="button" className="!flex !w-full !justify-between !gap-3 !rounded-lg !border-0 !bg-transparent !text-left" disabled={disabled || !!loading}
                onClick={() => choose(product.productId)}><span className="min-w-0 [overflow-wrap:anywhere]">{product.name}</span>
                <span className="shrink-0 text-xs">{product.productId}</span></button>
            </li>)}
          </ul>
        </div> : null}
        <div className="flex flex-wrap gap-2">
          {admin && allowDraft ? <Button size="sm" onClick={loadDraft} disabled={disabled || !!loading}><PlusIcon className="size-4" aria-hidden="true" />Create new product</Button> : null}
          {savedDraft && !suggested.some(product => product.productId === savedDraft) ? <Button size="sm" disabled={disabled || !!loading} onClick={() => choose(savedDraft)}>Use draft {savedDraft}</Button> : null}
          {onClear ? <Button size="sm" variant="ghost" disabled={disabled || !!loading} onClick={onClear}>Clear match</Button> : null}
          {onClose ? <Button size="sm" variant="ghost" disabled={disabled || !!loading} onClick={onClose}>Back to product fields</Button> : null}
        </div>
        {!admin && allowDraft ? <p className="!m-0 text-xs">An administrator can create a product if there’s no match.</p> : null}
      </>}
  </div>;
}
