import Link from '../app-link';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { display, record, rows } from './views';
import { Badge, Note, PageHeader, buttonVariants, cn } from './ui';

const select = 'h-11 w-full rounded-lg border-0 bg-fill px-4 text-sm text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink';
export function NeedsAction({ data, q, reason, status }: { data: unknown; q?: string; reason?: string; status?: string }) {
  const result = record(data), products = rows(result.items);
  const offset = Number(result.offset), total = Number(result.total);
  const page = (value: number) => `/admin/needs-action?${new URLSearchParams({ offset: String(value), ...(q ? { q } : {}), ...(reason ? { reason } : {}), ...(status ? {status} : {}) })}`;
  return <>
    <PageHeader
      title="Needs action"
      description="Review draft readiness and finish photos or details for published products."
      actions={<Link className={buttonVariants({ variant: 'outline' })} href="/admin/products">All products</Link>}
    />
    <Note tone="warning" icon={<ClipboardDocumentCheckIcon />}>
      <p><strong>Medicine classification needs pharmacy review.</strong> Confirm the exact product, strength and pack from its label. Choose an OTC classification only after verification. Prescription products stay unpublished until a suitable dispensing workflow is available.</p>
    </Note>
    <form className="mb-4 grid gap-3 rounded-xl bg-surface p-4 border border-line md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto] md:items-end">
      <label className="grid gap-1.5 text-xs font-medium text-mute">Search name or product ID<input className={select} name="q" defaultValue={q} maxLength={80} placeholder="Product name or PD number" /></label>
      <label className="grid gap-1.5 text-xs font-medium text-mute">Listing status<select className={select} name="status" defaultValue={status ?? 'drafts'}><option value="drafts">Unpublished / drafts</option><option value="published">Published</option><option value="all">All products</option></select></label>
      <label className="grid gap-1.5 text-xs font-medium text-mute">Action needed<select className={select} name="reason" defaultValue={reason ?? 'all'}>
        <option value="all">All review items</option><option value="identity">Incomplete product name</option>
        <option value="classification">Classification not confirmed</option><option value="prescription">Prescription — keep as draft</option>
        <option value="content">Brand or description missing</option>
        <option value="missing-photo">Missing photo</option>
      </select></label>
      <button className={buttonVariants({ variant: 'dark' })}>Apply filters</button>
    </form>
    <p className="mb-3 text-[13px] text-mute" role="status">{total ? `${offset + 1}–${Math.min(offset + products.length, total)} of ${total.toLocaleString()} products` : 'No products match these filters.'}</p>
    <ul className="m-0 grid list-none gap-3 p-0">
      {products.map(product => (
        <li key={display(product._id)} className="flex flex-wrap items-center gap-4 rounded-xl bg-surface p-4 border border-line md:p-5">
          <div className="grid min-w-0 flex-1 basis-72 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-[15px] font-semibold">{display(product.name)}</h2>
              <Badge tone={product.published ? 'success' : 'neutral'} dot>{product.published ? 'Published' : 'Draft'}</Badge>
              {product.missingPhoto ? <Badge tone="warning">Missing photo</Badge> : null}
              {product.productType === 'prescription' ? <Badge tone="danger">Prescription — publishing is blocked</Badge> : null}
            </div>
            <p className="m-0 text-xs text-mute">{display(product.product_id)}</p>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Review checklist">
              {(Array.isArray(product.reasons) && product.reasons.length ? product.reasons : ['Ready to publish']).map(value => <li key={String(value)}><Badge tone="neutral" className="normal-case">{String(value).startsWith('Product classification') ? product.productType === 'prescription' ? 'Prescription dispensing workflow required' : 'Confirm product classification' : String(value)}</Badge></li>)}
            </ul>
          </div>
          <Link className={buttonVariants({ variant: 'primary' })} href={`/admin/products/${display(product._id)}`} aria-label={`Review ${display(product.name)}`}>
            <ClipboardDocumentCheckIcon className="size-5" aria-hidden="true" />Review product
          </Link>
        </li>
      ))}
    </ul>
    <nav className="my-4 flex gap-2" aria-label="Draft review pages">
      {offset > 0 ? <Link className={cn(buttonVariants({ variant: 'outline' }))} href={page(Math.max(0, offset - 25))}>Previous page</Link> : null}
      {offset + products.length < total ? <Link className={buttonVariants({ variant: 'outline' })} href={page(offset + 25)}>Next page</Link> : null}
    </nav>
  </>;
}
