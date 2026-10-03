export function CatalogLoading({ title = 'Al Mina Pharmacy' }: { title?: string }) {
  return <><div className="page-heading"><h1>{title}</h1><p role="status">Loading the pharmacy…</p></div><div className="product-grid" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div className="skeleton-card" key={i}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>)}</div></>;
}
