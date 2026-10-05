import { createCommerceReporter, consentKey, type Choice } from './reporter';
export { consentKey } from './reporter';
export function privacyBlocked() {
  if (typeof navigator === 'undefined') return true;
  return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}
export function usageChoice(): Choice {
  try { const value = localStorage.getItem(consentKey); return value === 'allowed' || value === 'declined' ? value : 'unset'; }
  catch { return 'unset'; }
}
const reporter = createCommerceReporter({ allowed: () => typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')
  && !privacyBlocked() && usageChoice() === 'allowed',
  send: (body, signal) => fetch('/api/commerce-events', { method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
    referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify(body), signal }),
});
export const recordCommerceEvent = reporter.record;
export const enableUsageReports = reporter.enable;
export function chooseUsage(value: 'allowed' | 'declined') {
  try { localStorage.setItem(consentKey, value); } catch { reporter.enable(false); return false; }
  reporter.enable(value === 'allowed'); return true;
}
