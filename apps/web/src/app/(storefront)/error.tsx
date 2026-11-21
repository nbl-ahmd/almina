'use client';

import { useContext } from 'react';
import { StorefrontLocale } from '../../components/storefront-interactions';

export default function ErrorPage({ retry }: { retry: () => void }) {
  const ar = useContext(StorefrontLocale) === 'ar';
  return (
    <section className="empty-state">
      <h1>{ar ? 'تعذّر تحميل هذه الصفحة' : 'Unable to load this page'}</h1>
      <p>{ar ? 'تعذّر تحميل الصيدلية الآن. يرجى المحاولة مرة أخرى.' : 'We could not load the pharmacy right now. Please try again.'}</p>
      <button type="button" className="button" onClick={retry}>{ar ? 'حاول مرة أخرى' : 'Try again'}</button>
    </section>
  );
}
