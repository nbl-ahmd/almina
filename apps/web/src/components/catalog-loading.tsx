export function CatalogLoading({ title = 'Al Mina Pharmacy' }: { title?: string }) {
  return <><div className="mb-6 rounded-2xl bg-subtle p-5"><h1>{title}</h1><p role="status">Loading the pharmacy…</p></div><div className="product-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div className="skeleton-card rounded-2xl border border-border bg-white p-3" key={i}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>)}</div></>;
}
