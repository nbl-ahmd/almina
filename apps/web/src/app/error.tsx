'use client';

import { PageContent } from '@almina/ui';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <PageContent>
    <h1>Unable to load this page</h1>
    <p>Please try again.</p>
    <button type="button" onClick={retry}>Try again</button>
  </PageContent>;
}
