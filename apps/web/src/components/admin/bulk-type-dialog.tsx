'use client';
/* eslint-disable @next/next/no-img-element -- thumbnails come from the catalogue CDN or the legacy media origin. */
import { useState } from 'react';
import { Dialog } from 'radix-ui';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { productTypeLabels, productTypes, type ProductType } from '@almina/contracts';
import { adminPortal, cn } from './cn';
import { Button } from './shadcn/button';

export type TypeCandidate = { _id: string; name: string; productId: string; category: string; productType: string; thumb: string | null };
const hints: Record<ProductType, string> = {
  general: 'Not a medicine. Can be sold online.',
  otc: 'A medicine sold without a prescription, confirmed by a pharmacist.',
  prescription: 'Never sold online. These products are hidden from the shop.',
};

/** One type for the products the administrator selected. Nothing is chosen in advance: they pick the type, can untick any
 *  product, and state that they checked each pack. Products that already have a type are listed but cannot change here. */
export function BulkTypeDialog({ products, onClose, onApply }: {
  products: TypeCandidate[]; onClose: () => void; onApply: (type: ProductType, chosen: TypeCandidate[]) => void;
}) {
  const open = (product: TypeCandidate) => !productTypes.some(type => type === product.productType);
  const [type, setType] = useState<ProductType | ''>('');
  const [excluded, setExcluded] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const chosen = products.filter(product => open(product) && !excluded.includes(product._id));
  const skipped = products.length - products.filter(open).length;
  return (
    <Dialog.Root open onOpenChange={value => { if (!value) onClose(); }}>
      <Dialog.Portal container={adminPortal()}>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] flex max-h-[90dvh] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-surface p-5 text-ink shadow-pop max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-h-[94dvh] max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none">
          <div className="flex items-start justify-between gap-3">
            <div><Dialog.Title className="m-0 text-lg font-semibold">Set product type</Dialog.Title>
              <Dialog.Description className="m-0 mt-1 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">Classification needs a pharmacist’s confirmation. Check each pack. If the products are not all the same type, untick the ones that differ.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-fill"><XMarkIcon className="size-5" aria-hidden="true" /></button></Dialog.Close>
          </div>
          <fieldset className="m-0 grid gap-2 border-0 p-0 sm:grid-cols-3"><legend className="sr-only">Product type</legend>
            {productTypes.map(value => <label key={value} className={cn('grid cursor-pointer content-start gap-1 rounded-lg border p-3 text-[13px]', type === value ? '!border-ink bg-fill' : '!border-line hover:bg-soft')}>
              <span className="flex items-center gap-2 font-medium"><input type="radio" name="bulk-product-type" value={value} checked={type === value} onChange={() => { setType(value); setChecked(false); }} aria-labelledby={`bulk-type-${value}-name`} aria-describedby={`bulk-type-${value}`} /><span id={`bulk-type-${value}-name`}>{productTypeLabels[value]}</span></span>
              <span id={`bulk-type-${value}`} className="text-xs text-mute">{hints[value]}</span>
            </label>)}
          </fieldset>
          <p className="m-0 text-[13px] text-mute" role="status">{chosen.length} of {products.length} selected {products.length === 1 ? 'product' : 'products'} will change.{skipped ? ` ${skipped} already ${skipped === 1 ? 'has' : 'have'} a type and ${skipped === 1 ? 'is' : 'are'} left as ${skipped === 1 ? 'it is' : 'they are'}.` : ''}</p>
          <ul className="m-0 grid max-h-[34dvh] min-h-24 shrink-0 list-none content-start gap-1.5 overflow-y-auto p-0" aria-label="Products to classify">
            {products.map(product => <li key={product._id}><label className={cn('flex items-center gap-3 rounded-lg border !border-line p-2', open(product) ? 'cursor-pointer' : 'opacity-60')}>
              <input type="checkbox" aria-label={`Include ${product.name}`} disabled={!open(product)} checked={open(product) && !excluded.includes(product._id)}
                onChange={event => { setChecked(false); setExcluded(list => event.target.checked ? list.filter(id => id !== product._id) : [...list, product._id]); }} />
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-fill text-faint">{product.thumb ? <img src={product.thumb} alt="" width={48} height={48} loading="lazy" className="size-full object-contain" /> : <PhotoIcon className="size-5" aria-hidden="true" />}</span>
              <span className="grid min-w-0 text-left"><span className="break-words text-[13px] font-medium">{product.name}</span>
                <span className="text-xs text-mute">{product.productId}{product.category ? ` · ${product.category}` : ''}{open(product) ? '' : ` · already ${productTypeLabels[product.productType as ProductType]}`}</span></span>
            </label></li>)}
          </ul>
          <label className="flex cursor-pointer items-start gap-2.5 border-t border-line pt-3 text-[13px]">
            <input type="checkbox" className="mt-0.5" checked={checked} disabled={!type || !chosen.length} onChange={event => setChecked(event.target.checked)} />
            <span>I checked the pack of every ticked product{type ? <> and each one is <strong>{productTypeLabels[type]}</strong></> : null}.</span>
          </label>
          <div className="flex justify-end gap-2 max-sm:flex-col-reverse">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant={type === 'prescription' ? 'danger' : 'primary'} disabled={!type || !checked || !chosen.length} onClick={() => { if (type) onApply(type, chosen); }}>
              {type ? `Mark ${chosen.length} as ${productTypeLabels[type]}` : 'Choose a type'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
