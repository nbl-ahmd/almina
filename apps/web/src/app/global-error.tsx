'use client';

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body><main>
    <h1>Unable to load this page</h1>
    <button type="button" onClick={retry}>Try again</button>
  </main></body></html>;
}
