import type { CommerceEvent } from '@almina/contracts/commerce-events';
import { track } from '../analytics/client';
import { createCommerceReporter, consentKey, type Choice } from './reporter';
export { consentKey } from './reporter';
export function privacyBlocked() {
  if (typeof navigator === 'undefined') return true;
  return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}
let storageFailure=false;
export function usageChoice(): Choice {
  if(storageFailure)return 'declined';
  try {
    const value = localStorage.getItem(consentKey);
    if (value === 'allowed' || value === 'declined') return value;
    // An earlier refusal still stands.
    return localStorage.getItem('almina.optional-usage.v1') === 'declined' ? 'declined' : 'unset';
  }
  catch { return 'unset'; }
}
const reporter = createCommerceReporter({ allowed: () => typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')
  && !privacyBlocked() && usageChoice() === 'allowed',
  send: (body, signal) => fetch('/api/commerce-events', { method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
    referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify(body), signal }),
});
/** First-party daily counters, plus analytics when configured. `details` goes to analytics only and is filtered there. */
export function recordCommerceEvent(event: CommerceEvent, campaign?: string, details: Record<string, unknown> = {}) {
  reporter.record(event, campaign);
  // Analytics counts page views itself, on every route change.
  if (event !== 'page_viewed') track(event, { ...details, ...(campaign ? { campaign } : {}) });
}
export const enableUsageReports = reporter.enable;
export function chooseUsage(value: 'allowed' | 'declined') {
  try { localStorage.setItem(consentKey, value); storageFailure=false; } catch { storageFailure=true;reporter.enable(false);window.dispatchEvent(new Event('almina-usage-change'));return false; }
  reporter.enable(value === 'allowed'); window.dispatchEvent(new Event('almina-usage-change')); return true;
}
