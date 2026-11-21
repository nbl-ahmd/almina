'use client';
import {SearchUsagePreferences} from './search-usage-preferences';
import { Button } from './ui/button';
import boundary from './storefront-system/boundary.module.css';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { chooseUsage, consentKey, enableUsageReports, privacyBlocked, recordCommerceEvent, usageChoice } from '../lib/telemetry/browser';
import type { Choice } from '../lib/telemetry/reporter';

/** Optional usage reporting controls, shown inside the storefront footer panel. */
export function UsagePreferences({locale='en'}:{locale?:'en'|'ar'}) {
  const pathname=usePathname();
  const ar = locale === 'ar';
  const heading = ar ? 'تقارير الاستخدام الاختيارية' : 'Optional usage reports';
  const saveError = ar ? 'تعذر حفظ تفضيلك. ستظل التقارير الاختيارية متوقفة.' : 'Your preference could not be saved. Optional reports remain disabled.';
  useEffect(()=>{const timer=setTimeout(()=>recordCommerceEvent('page_viewed'),0);return()=>clearTimeout(timer);},[pathname]);
  const [choice, setChoice] = useState<Choice>('unset');
  const [blocked, setBlocked] = useState(true);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    const synchronize = () => {
      const value = usageChoice(), privacy = privacyBlocked();
      enableUsageReports(value === 'allowed' && !privacy);
      setChoice(value); setBlocked(privacy); setReady(true);
    };
    void Promise.resolve().then(() => { if (mounted) synchronize(); });
    const storage = (event: StorageEvent) => { if (event.key === consentKey || event.key === null) synchronize(); };
    const failure = () => recordCommerceEvent('client_error');
    window.addEventListener('storage', storage); window.addEventListener('error', failure); window.addEventListener('unhandledrejection', failure);
    return () => {
      mounted = false; enableUsageReports(false); window.removeEventListener('storage', storage);
      window.removeEventListener('error', failure); window.removeEventListener('unhandledrejection', failure);
    };
  }, []);
  function select(value: 'allowed' | 'declined') {
    if (value === 'allowed' && privacyBlocked()) return;
    if (!chooseUsage(value)) { setError(saveError); return; }
    setChoice(value); setEditing(false); setError('');
  }
  return <section className={`${boundary.boundary} border-t border-border py-6 text-sm text-ink`} aria-label={heading}>
    {!ready ? <p role="status" className="text-muted">{ar ? 'جارٍ تحميل تفضيلات الاستخدام…' : 'Loading usage preferences…'}</p> : choice === 'unset' || editing ? <>
      <h2 className="mb-2 text-base font-semibold text-ink">{heading}</h2>
      <p className="max-w-[70ch] leading-6 text-muted">{ar
        ? 'ساعدنا في تحسين التسوق وإتمام الطلب باستخدام تقارير الاستخدام الاختيارية. تحصي التقارير نشاط التصفح والبحث وإتمام الطلب دون تحديد المنتجات أو تسجيل عبارات البحث أو بيانات الاتصال أو تفاصيل الطلب. قد تتضمن أسماء الحملات المنشورة. يمكنك إيقاف التقارير المستقبلية بتغيير تفضيلك.'
        : 'Help improve shopping and checkout with optional usage reports. Reports count browsing, searches and checkout activity without product identities, search text, contact details or order details. Published campaign names may be included. Changing your preference stops future reports.'}</p>
      {blocked ? <p role="status" className="text-muted">{ar ? 'تمنع إعدادات الخصوصية في متصفحك إرسال التقارير الاختيارية.' : 'Your browser’s privacy preference disables optional reports.'}</p> : null}
      <div className="flex flex-wrap gap-3"><Button type="button" size="sm" disabled={blocked} onClick={() => select('allowed')}>{ar ? 'السماح بالتقارير الاختيارية' : 'Allow optional reports'}</Button><Button type="button" size="sm" variant="outline" onClick={() => select('declined')}>{ar ? 'رفض التقارير الاختيارية' : 'Decline optional reports'}</Button></div>
    </> : <div className="flex flex-wrap items-center gap-3"><span>{ar
      ? (blocked || choice !== 'allowed' ? 'تقارير الاستخدام الاختيارية متوقفة.' : 'تقارير الاستخدام الاختيارية مفعّلة.')
      : `Optional usage reports: ${blocked || choice !== 'allowed' ? 'off' : 'on'}.`}</span><Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>{ar ? 'تفضيلات الاستخدام' : 'Usage preferences'}</Button></div>}
    <SearchUsagePreferences locale={locale} enabled={ready&&!blocked&&choice==='allowed'}/>
    {error ? <p role="alert" className="mt-3 text-sale">{error}</p> : null}
  </section>;
}
