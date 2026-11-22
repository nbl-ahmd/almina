'use client';
import { inputClass, selectClass, textareaClass } from './shadcn/styles';

import { useState, type FormEvent } from 'react';
import { imageReviewDraftSchema, imageReviewProductChangesSchema, reviewGtin,
  type ImageIdentity, type ImageReviewDraftInput, type ImageReviewProductChanges } from '@almina/contracts';
import { Button } from './ui';

export type DraftProduct = ImageReviewDraftInput['product'];
type Category = { id: string; name: string };

export const productFieldLabels = {
  name: 'Product name', brand: 'Brand', productForm: 'Product form', strength: 'Strength / concentration',
  packLabel: 'Pack / specification', mpn: 'Model / MPN', barcode: 'Barcode', gtin: 'GTIN',
} satisfies Record<keyof ImageReviewProductChanges, string>;

function prefill(identity: ImageIdentity) {
  return {
    name: identity.name || [identity.brand, identity.line, identity.form].filter(Boolean).join(' ').slice(0, 500),
    brand: identity.brand.slice(0, 100), productForm: identity.form.slice(0, 120), strength: identity.strength.slice(0, 120),
    packLabel: [...new Set([identity.size, identity.quantity].filter(Boolean))].join(' · ').slice(0, 150),
    mpn: identity.shadeModel.slice(0, 70), barcode: identity.barcode,
    gtin: reviewGtin(identity.gtin) ?? '', description: '', category: '', price: '', stock: '0', vat: false,
  } satisfies DraftProduct;
}

export function ImageReviewDraftForm({ identity, categories, busy, onCancel, onCreate }: {
  identity: ImageIdentity; categories: Category[]; busy: boolean; onCancel: () => void;
  onCreate: (product: DraftProduct) => Promise<void>;
}) {
  const [product, setProduct] = useState(() => prefill(identity));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  function update<K extends keyof DraftProduct>(key: K, value: DraftProduct[K]) {
    setProduct(current => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting) return;
    const result = imageReviewDraftSchema.shape.product.safeParse(product);
    if (!result.success) {
      setError('Check the name, category, price, stock and GTIN. A GTIN must have a valid check digit.');
      return;
    }
    setSubmitting(true);
    setError('');
    try { await onCreate(result.data); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to create the draft.'); }
    finally { setSubmitting(false); }
  }
  return <form onSubmit={submit} className="space-y-4" aria-labelledby="review-draft-title">
    <div>
      <h3 id="review-draft-title" className="!m-0 !text-sm">New product draft</h3>
      <p className="!mb-0 !mt-1 text-xs">Check the prefilled label details and add the catalogue information. The product starts unpublished.</p>
    </div>
    <fieldset disabled={busy || submitting} className="grid min-w-0 gap-3 sm:grid-cols-2">
      {(Object.keys(productFieldLabels) as (keyof ImageReviewProductChanges)[]).map(key => <label key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
        {productFieldLabels[key]}<input className={inputClass} required={key === 'name'} value={product[key]} onChange={event => update(key, event.target.value)}
          maxLength={{ name: 500, brand: 100, productForm: 120, strength: 120, packLabel: 150, mpn: 70, barcode: 500, gtin: 14 }[key]} />
        {key === 'gtin' && identity.gtin && !reviewGtin(identity.gtin) ? <span className="text-xs">Extracted GTIN {identity.gtin} needs checking.</span> : null}
      </label>)}
      <label>Category<select className={selectClass} required value={product.category} onChange={event => update('category', event.target.value)}><option value="">Choose a category</option>
        {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></label>
      <label>Retail price (AED)<input className={inputClass} required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" value={product.price} onChange={event => update('price', event.target.value)} /></label>
      <label>Opening stock<input className={inputClass} required type="number" min="0" step="1" value={product.stock} onChange={event => update('stock', event.target.value)} /></label>
      <label className="!flex-row !items-center !gap-2 self-end py-2"><input type="checkbox" checked={product.vat} onChange={event => update('vat', event.target.checked)} />Apply VAT</label>
      <label className="sm:col-span-2">Description (optional)<textarea className={textareaClass} rows={3} maxLength={4000} value={product.description} onChange={event => update('description', event.target.value)} /></label>
    </fieldset>
    {error ? <p role="alert" className="rounded-lg bg-bad-soft p-4 text-[13px] text-bad">{error}</p> : null}
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" type="submit" disabled={busy || submitting || !categories.length}>{submitting ? 'Creating draft…' : 'Create draft & select'}</Button>
      <Button variant="ghost" disabled={busy || submitting} onClick={onCancel}>Cancel</Button>
    </div>
  </form>;
}

export function productFieldError(key: keyof ImageReviewProductChanges, value: string) {
  if (imageReviewProductChangesSchema.shape[key].safeParse(value).success) return '';
  return key === 'gtin' ? 'Enter the full GTIN with a valid check digit.' : 'Check this field’s length and required value.';
}
