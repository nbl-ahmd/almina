import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ApiClientError } from '@almina/contracts/client';
import { getApiClient } from '@/lib/server/api';
import { getWebLogger } from '@/lib/server/logger';

export const metadata: Metadata = { title: 'Service status', robots: { index: false, follow: true } };

export default async function StatusPage() {
  await connection(); // API origin and health are evaluated only for real requests.
  let status;
  try {
    status = await getApiClient().getReadiness();
  } catch (error) {
    getWebLogger().log('warn', 'web_error');
    if (!(error instanceof ApiClientError)) throw new Error('Service status could not be loaded.');
  }
  return <section>
    <h1>Service status</h1>
    <p role="status">{status ? 'API is available.' : 'API is temporarily unavailable.'}</p>
    {status ? <p>Database: {status.database}.</p> : null}
    <Link href="/">Return home</Link>
  </section>;
}
