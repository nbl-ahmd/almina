'use client';
import {SearchUsagePreferences} from './search-usage-preferences';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { chooseUsage, consentKey, enableUsageReports, privacyBlocked, recordCommerceEvent, usageChoice } from '../lib/telemetry/browser';
import type { Choice } from '../lib/telemetry/reporter';

/** Optional usage reporting controls, shown inside the storefront footer panel. */
export function UsagePreferences({locale='en'}:{locale?:'en'|'ar'}) {
  const pathname=usePathname();
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
    if (!chooseUsage(value)) { setError('Your preference could not be saved. Optional reports remain disabled.'); return; }
    setChoice(value); setEditing(false); setError('');
  }
  return <section className="border-t py-6 text-sm" aria-label="Optional usage reports">
    {!ready ? <p role="status">Loading usage preferences…</p> : choice === 'unset' || editing ? <>
      <h2 className="mb-2 text-base font-semibold">Optional usage reports</h2>
      <p className="max-w-[70ch] leading-6">Help improve shopping and checkout with optional usage reports. Reports count browsing, searches and checkout activity without product identities, search text, contact details or order details. Published campaign names may be included. Changing your preference stops future reports.</p>
      {blocked ? <p role="status">Your browser’s privacy preference disables optional reports.</p> : null}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={blocked} onClick={() => select('allowed')}>Allow optional reports</button><button type="button" className="button-secondary" onClick={() => select('declined')}>Decline optional reports</button></div>
    </> : <div className="flex flex-wrap items-center gap-3"><span>Optional usage reports: {blocked || choice !== 'allowed' ? 'off' : 'on'}.</span><button type="button" className="button-secondary" onClick={() => setEditing(true)}>Usage preferences</button></div>}
    <SearchUsagePreferences locale={locale} enabled={ready&&!blocked&&choice==='allowed'}/>
    {error ? <p role="alert" className="mt-3">{error}</p> : null}
  </section>;
}
