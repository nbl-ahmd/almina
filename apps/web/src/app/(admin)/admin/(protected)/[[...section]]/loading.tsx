export default function Loading() {
  // Rendered inside the administration shell, which already provides the page
  // landmark. A nested <main> would duplicate the landmark while the route streams.
  return (
    <div className="admin-skeleton" aria-busy="true" role="status">
      <p className="sr-only">Loading administration…</p>
      <span className="admin-skeleton__bar" style={{ width: '28%', height: 22 }} />
      <span className="admin-skeleton__bar" style={{ width: '52%' }} />
      <div className="admin-grid admin-grid--2" aria-hidden="true">
        <span className="admin-skeleton__bar" style={{ height: 92 }} />
        <span className="admin-skeleton__bar" style={{ height: 92 }} />
      </div>
      <span className="admin-skeleton__bar" style={{ height: 220 }} />
    </div>
  );
}
