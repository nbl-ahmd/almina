// The fallback ships in the server HTML beside the resolved page, so its title looks like a heading but is not one:
// the resolved page owns the only H1.
export function CatalogLoading({ title = 'Al Mina Pharmacy', showHeading = true }: { title?: string; showHeading?: boolean }) {
  return <>{showHeading ? <div className="mb-6 rounded-2xl p-5"><p className="loading-title">{title}</p><p role="status">Loading the pharmacy…</p></div> : <p role="status" className="sr-only">Loading products…</p>}<div className="product-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div className="skeleton-card rounded-2xl border bg-white p-3" key={i}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>)}</div></>;
}
