import Link from 'next/link';
import { PageContent } from '@almina/ui';

export default function HomePage() {
  return <PageContent>
    <h1>Al Mina Pharmacy</h1>
    <p>The new application foundation is ready for verification.</p>
    <Link href="/foundation/status">Service status</Link>
  </PageContent>;
}
