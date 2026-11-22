export default function Loading() {
  // Rendered inside the administration shell, which already provides the page
  // landmark. A nested <main> would duplicate the landmark while the route streams.
  return (
    <div className="grid gap-4" aria-busy="true" role="status">
      <p className="sr-only">Loading administration…</p>
      <span className="block animate-pulse rounded-lg bg-line motion-reduce:animate-none" style={{ width: '28%', height: 22 }} />
      <span className="block animate-pulse rounded-lg bg-line motion-reduce:animate-none" style={{ width: '52%', height: 14 }} />
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        <span className="block animate-pulse rounded-lg bg-line motion-reduce:animate-none" style={{ height: 92 }} />
        <span className="block animate-pulse rounded-lg bg-line motion-reduce:animate-none" style={{ height: 92 }} />
      </div>
      <span className="block animate-pulse rounded-lg bg-line motion-reduce:animate-none" style={{ height: 220 }} />
    </div>
  );
}
