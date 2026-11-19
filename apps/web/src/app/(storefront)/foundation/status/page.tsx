import { getLocale } from '../../../../lib/server/i18n';
import { StorefrontInformation } from '../../../../components/storefront-information';
import styles from '../../../../components/storefront-information.module.css';
import Link from '../../../../components/app-link';
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
  const locale = await getLocale();
  const ar = locale === 'ar';
  return <StorefrontInformation locale={locale}>
    <section className={`${styles.panel} ${styles.state}`}>
      <h1>{ar ? 'حالة الخدمة' : 'Service status'}</h1>
      <p role="status">{status
        ? ar ? 'واجهة الخدمة متاحة.' : 'API is available.'
        : ar ? 'واجهة الخدمة غير متاحة مؤقتاً.' : 'API is temporarily unavailable.'}</p>
      {status ? <p>{ar ? 'قاعدة البيانات' : 'Database'} · <bdi>{status.database}</bdi></p> : null}
      <Link className="inline-flex min-h-11 items-center text-sm underline" href="/">{ar ? 'العودة إلى الرئيسية' : 'Return home'}</Link>
    </section>
  </StorefrontInformation>;
}
