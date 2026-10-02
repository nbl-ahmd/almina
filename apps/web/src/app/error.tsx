'use client';


export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section>
    <h1>Unable to load this page</h1>
    <p>Please try again.</p>
    <button type="button" onClick={retry}>Try again</button>
  </section>;
}
