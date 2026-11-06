import Link from 'next/link';
import type { ComponentProps } from 'react';

/** Dynamic application routes render on navigation, not for every visible card. */
export default function AppLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={false} />;
}
