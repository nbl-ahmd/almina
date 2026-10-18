export default function Loading() {
  // Rendered inside the administration shell, which already provides the page
  // landmark. A nested <main> would duplicate the landmark while the route streams.
  return (
    <div className="admin-panel" aria-busy="true">
      <h1>Loading administration…</h1>
      <p role="status" className="admin-card__hint">
        Preparing the requested records.
      </p>
    </div>
  );
}
