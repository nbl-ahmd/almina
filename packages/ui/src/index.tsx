import type { ReactNode } from 'react';

// A small server-compatible primitive; expand only as verified routes need shared UI.
export function PageContent({ children }: { children: ReactNode }) {
  return <main id="main-content">{children}</main>;
}
