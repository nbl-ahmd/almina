"use client";
import { useRef, useState } from 'react';
import { adminRequest } from './controls';
type Preview = { previewId?: string; hash?: string; rows: { product_id: string; name: string; barcode: string; price: string; salePrice?: string; category: string; vat: boolean; featured: boolean; description: string; cloudinaryImages: string[] }[];
  errors: { row: number; field: string; message: string }[] };
const retryKey = 'almina-recovery-import-v1';
export function RecoveryImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  async function inspect() {
    const file = fileInput.current?.files?.[0];
    setPreview(null); setFailure(''); setMessage('');
    if (!file) { setFailure('Choose a reviewed CSV or JSON file.'); return; }
    if (file.size > 3 * 1024 * 1024) { setFailure('Use a file smaller than 3 MiB, with at most 500 products.'); return; }
    if (sessionStorage.getItem(retryKey)) { setFailure('Retry the interrupted import before reviewing another file.'); return; }
    setPending(true);
    try {
      const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : file.name.toLowerCase().endsWith('.json') ? 'json' : undefined;
      if (!format) throw new Error('Choose a CSV or JSON file.');
      const result = await adminRequest('recovery/preview', 'POST', { format, content: await file.text() }) as Preview;
      setPreview(result);
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Preview failed.'); }
    finally { setPending(false); }
  }
  async function commit(retry = false) {
    setPending(true); setFailure(''); setMessage('');
    try {
      const receipt = retry ? JSON.parse(sessionStorage.getItem(retryKey) ?? 'null') as unknown
        : { previewId: preview?.previewId, hash: preview?.hash };
      if (!receipt || typeof receipt !== 'object') throw new Error('No interrupted import is saved.');
      sessionStorage.setItem(retryKey, JSON.stringify(receipt));
      const result = await adminRequest('recovery/commit', 'POST', receipt) as { created: number; replayed: boolean };
      sessionStorage.removeItem(retryKey); setPreview(null);
      setMessage(result.replayed ? 'This import was already saved. No products or stock were changed.'
        : `${result.created} products saved as disabled drafts with zero stock. The store remains closed.`);
    } catch (error) { setFailure(`${error instanceof Error ? error.message : 'Import failed.'} Retry the same review after an uncertain response.`); }
    finally { setPending(false); }
  }
  return <section className="admin-card admin-stack" aria-labelledby="recovery-title">
    <div><h2 id="recovery-title">Recover product drafts</h2>
      <p>Use reviewed product IDs, barcodes, AED prices and image matches. Importing keeps every product disabled with zero stock and keeps the store closed.</p>
      <p><a href="/api/admin/recovery/template" download="recovery-products.csv">Download CSV template</a> or <a href="/templates/recovery-products.xlsx" download="recovery-products.xlsx">spreadsheet template</a>. Open it in your spreadsheet application and set product IDs and barcodes to text before entering values. Export the product sheet as CSV.</p>
    </div>
    <div className="admin-form-panel">
      <label htmlFor="recovery-file">Reviewed product file
        <input ref={fileInput} id="recovery-file" type="file" accept=".csv,.json,text/csv,application/json" disabled={pending}
          onChange={() => { setPreview(null); setFailure(''); setMessage(''); }} />
      </label>
      <button disabled={pending} onClick={() => { void inspect(); }}>{pending ? 'Working…' : 'Preview products'}</button>
    </div>
    {failure ? <p role="alert" className="admin-note admin-note--danger admin-note--flush">{failure}</p> : null}
    {message ? <p role="status" className="admin-note admin-note--flush">{message}</p> : null}
    {preview?.errors.length ? <div role="region" aria-label="Import errors"><h3>Correct these rows and preview again</h3>
      <ul className="admin-list-disc">{preview.errors.map((error, i) => <li key={i}>Row {error.row || 'file'} · {error.field}: {error.message}</li>)}</ul></div> : null}
    {preview?.rows.length ? <><div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Product preview"><table><caption>Review {preview.rows.length} products before importing</caption>
      <thead><tr>{['Product ID', 'Name', 'Barcode', 'Price (AED)', 'Sale price (AED)', 'Category', 'VAT', 'Featured', 'Description', 'Images'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{preview.rows.map(row => <tr key={row.product_id}><td>{row.product_id}</td><td>{row.name}</td><td>{row.barcode}</td><td>{row.price}</td><td>{row.salePrice ?? 'None'}</td><td>{row.category}</td><td>{String(row.vat)}</td><td>{String(row.featured)}</td><td>{row.description || 'None'}</td><td>{row.cloudinaryImages.length ? <ul className="admin-list-disc admin-break">{row.cloudinaryImages.map(url => <li key={url} className="admin-cell-clamp">{url}</li>)}</ul> : 'None'}</td></tr>)}</tbody></table></div>
      <div className="admin-actions"><button disabled={pending || !preview.hash || !preview.previewId || !!preview.errors.length} onClick={() => { void commit(); }}>Import reviewed drafts</button></div></> : null}
    <div className="admin-actions">
      <button className="admin-btn--secondary" disabled={pending} onClick={() => { void commit(true); }}>Retry interrupted import</button>
      <button className="admin-btn--secondary" disabled={pending} onClick={() => { sessionStorage.removeItem(retryKey); setPreview(null); setFailure(''); setMessage('Local review cleared. Check the catalog before preparing a replacement file. Saved products and server receipts remain intact.'); }}>Clear local review</button>
    </div>
    <p className="admin-card__hint">Use decimal prices with at most two places. VAT and featured values use true or false. Separate image URLs with |. Use raster upload URLs from the configured Cloudinary account. No existing products, stock, orders or customers are overwritten.</p>
  </section>;
}
