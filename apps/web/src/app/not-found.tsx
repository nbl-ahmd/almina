import Link from 'next/link';
import { PageContent } from '@almina/ui';

export default function NotFound() {
  return <PageContent><h1>Page not found</h1><Link href="/">Return home</Link></PageContent>;
}
