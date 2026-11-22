import type { ReactNode } from 'react';

export function StorefrontIntro({ title, description, children }: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return <header className="storefront-intro"><h1>{title}</h1><p>{description}</p>{children}</header>;
}
