import Link from 'next/link';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { display, record, rows } from './views';
import { adminFormClass } from '../../lib/admin/styles';
import { Badge, Card, Note, PageHeader } from './ui';

export function NeedsAction({ data, q, reason, status }: { data: unknown; q?: string; reason?: string; status?: string }) {
  const result = record(data), products = rows(result.items);
  const offset = Number(result.offset), total = Number(result.total);
  const page = (value: number) => `/admin/needs-action?${new URLSearchParams({ offset: String(value), ...(q ? { q } : {}), ...(reason ? { reason } : {}), ...(status ? {status} : {}) })}`;
  return <>
    <PageHeader
      eyebrow="Catalogue"
      title="Needs action"
      description="Review draft readiness and finish photos or details for published products."
      actions={<Link href="/admin/products">All products</Link>}
    />
    <Note
      tone="warning"
      icon={<ClipboardDocumentCheckIcon />}
    >
      <p><strong>Medicine classification needs pharmacy review.</strong> Confirm the exact product, strength and pack from its label. Choose an OTC classification only after verification. Prescription products stay unpublished until a suitable dispensing workflow is available.</p>
    </Note>
    <form className={`${adminFormClass} admin-form-panel`} style={{ marginTop: '1rem' }}>
      <label>Search name or product ID<input name="q" defaultValue={q} maxLength={80} placeholder="e.g. product name or PD number" /></label>
      <label>Listing status<select name="status" defaultValue={status ?? 'drafts'}><option value="drafts">Unpublished / drafts</option><option value="published">Published</option><option value="all">All products</option></select></label>
      <label>Action needed<select name="reason" defaultValue={reason ?? 'all'}>
        <option value="all">All review items</option><option value="identity">Incomplete product name</option>
        <option value="classification">Classification not confirmed</option><option value="prescription">Prescription — keep as draft</option>
        <option value="content">Content needs review</option><option value="images">Image or permission needed</option>
        <option value="missing-photo">Missing photo</option>
      </select></label>
      <button>Apply filters</button>
    </form>
    <p className="admin-card__hint" role="status">{total ? `${offset + 1}–${Math.min(offset + products.length, total)} of ${total.toLocaleString()} products` : 'No products match these filters.'}</p>
    <ul className="admin-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {products.map(product => (
        <li key={display(product._id)}>
          <Card>
            <div className="admin-card__head" style={{ marginBottom: '0.75rem' }}>
              <div>
                <p className="admin-card__hint" style={{ marginBottom: '0.2rem' }}>
                  {display(product.product_id)} · <Badge tone={product.published ? 'success' : 'neutral'}>{product.published ? 'Published' : 'Draft'}</Badge>{product.missingPhoto ? ' · Missing photo' : ''}
                </p>
                <h2 style={{ margin: 0 }}>{display(product.name)}</h2>
              </div>
              <Link className="admin-btn--primary" href={`/admin/products/${display(product._id)}`} aria-label={`Review ${display(product.name)}`}>
                <ClipboardDocumentCheckIcon className="admin-nav__icon" aria-hidden="true" />Review product
              </Link>
            </div>
            {product.productType === 'prescription' ? <p style={{ marginBottom: '0.4rem' }}><Badge tone="danger">Prescription — publishing is blocked</Badge></p> : null}
            <ul className="admin-actions" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Review checklist">
              {(Array.isArray(product.reasons) && product.reasons.length ? product.reasons : ['Ready for final publication review']).map(value => <li key={String(value)}><Badge tone="neutral">{String(value).startsWith('Product classification') ? product.productType === 'prescription' ? 'Prescription dispensing workflow required' : 'Confirm product classification' : String(value)}</Badge></li>)}
            </ul>
          </Card>
        </li>
      ))}
    </ul>
    <nav className="admin-pagination" aria-label="Draft review pages">
      {offset > 0 ? <Link href={page(Math.max(0, offset - 25))}>Previous page</Link> : null}
      {offset + products.length < total ? <Link href={page(offset + 25)}>Next page</Link> : null}
    </nav>
  </>;
}
