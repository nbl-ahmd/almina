'use client';


export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section className="empty-state">
    <h1>Unable to load this page</h1>
    <p>We could not load the pharmacy right now. Please try again.</p>
    <button type="button" onClick={retry}>Try again</button>
  </section>;
}
