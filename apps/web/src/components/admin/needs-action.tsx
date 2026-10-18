import Link from 'next/link';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { display, record, rows } from './views';
import { adminFormClass } from '../../lib/admin/styles';

export function NeedsAction({ data, q, reason }: { data: unknown; q?: string; reason?: string }) {
  const result = record(data), products = rows(result.items);
  const offset = Number(result.offset), total = Number(result.total);
  const page = (value: number) => `/admin/needs-action?${new URLSearchParams({ offset: String(value), ...(q ? { q } : {}), ...(reason ? { reason } : {}) })}`;
  return <>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1>Needs action</h1><p>Complete and verify these drafts before they appear in the store.</p></div>
      <Link href="/admin/products">All products</Link>
    </div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="font-semibold">Medicine classification needs pharmacy review</p>
      <p>Confirm the exact product, strength and pack from its label. Choose an OTC classification only after verification. Prescription products stay unpublished until a suitable dispensing workflow is available.</p>
    </div>
    <form className={adminFormClass}>
      <label>Search name or product ID<input name="q" defaultValue={q} maxLength={80} placeholder="e.g. product name or PD number" /></label>
      <label>Action needed<select name="reason" defaultValue={reason ?? 'all'}>
        <option value="all">All drafts</option><option value="identity">Incomplete product name</option>
        <option value="classification">Classification not confirmed</option><option value="prescription">Prescription — keep as draft</option>
        <option value="content">Content needs review</option><option value="images">Image or permission needed</option>
      </select></label>
      <button className="self-end">Apply filters</button>
    </form>
    <p className="my-4" role="status">{total ? `${offset + 1}–${Math.min(offset + products.length, total)} of ${total.toLocaleString()} drafts` : 'No drafts match these filters.'}</p>
    <ul className="m-0 grid list-none gap-4 p-0">
      {products.map(product => <li key={display(product._id)} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-sm text-slate-500">{display(product.product_id)} · Draft</p><h2 className="break-words text-lg font-semibold">{display(product.name)}</h2></div>
          <Link className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold" href={`/admin/products/${display(product._id)}`} aria-label={`Review ${display(product.name)}`}><ClipboardDocumentCheckIcon className="size-5 shrink-0" aria-hidden="true" />Review product</Link>
        </div>
        {product.productType === 'prescription' ? <p className="mt-3 font-semibold text-amber-800">Prescription product — publishing is blocked.</p> : null}
        <ul className="mt-3 flex list-none flex-wrap gap-2 p-0" aria-label="Required actions">
          {(Array.isArray(product.reasons) && product.reasons.length ? product.reasons : ['Ready for final publication review']).map(value => <li key={String(value)} className="rounded-md bg-slate-100 px-2.5 py-1 text-sm text-slate-700">{String(value).startsWith('Product classification') ? product.productType === 'prescription' ? 'Prescription dispensing workflow required' : 'Confirm product classification' : String(value)}</li>)}
        </ul>
      </li>)}
    </ul>
    <nav className="admin-actions my-6" aria-label="Draft review pages">
      {offset > 0 ? <Link href={page(Math.max(0, offset - 25))}>Previous page</Link> : null}
      {offset + products.length < total ? <Link href={page(offset + 25)}>Next page</Link> : null}
    </nav>
  </>;
}
