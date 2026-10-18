export default function Loading() {
  return (
    <main className="admin-panel" aria-busy="true">
      <h1>Loading administration…</h1>
      <p role="status" className="admin-card__hint">
        Preparing the requested records.
      </p>
    </main>
  );
}
