import type { PostHog, PostHogConfig } from 'posthog-js/dist/module.slim.no-external';
import { sanitizeCapture, type AnalyticsConfig, type AnalyticsMode } from './policy';

/** The only module that touches the analytics SDK. It is downloaded after the page is idle, and only when something may be sent.
 *  Every failure is swallowed: measurement can never affect shopping or checkout. */
type Active = Exclude<AnalyticsMode, 'off'>;
type Properties = Record<string, unknown>;

let config: AnalyticsConfig | undefined;
let mode: AnalyticsMode | undefined;
const clients: Partial<Record<Active, Promise<PostHog>>> = {};
// Page components report before the layout has read the shopper's choice.
let waiting: [string, Properties][] = [];

const privacySignal = () => navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

export function analyticsOptions(settings: AnalyticsConfig, kind: Active): Partial<PostHogConfig> {
  return {
    api_host: settings.host, ui_host: 'https://eu.posthog.com',
    // Nothing is collected automatically: screens contain medicine names, addresses and contact details.
    autocapture: false, capture_pageview: false, capture_pageleave: true, capture_heatmaps: false, capture_dead_clicks: false,
    rageclick: false, capture_performance: false, capture_exceptions: false, disable_session_recording: true, disable_surveys: true,
    advanced_disable_flags: true, disable_external_dependency_loading: true, person_profiles: 'never', cross_subdomain_cookie: false,
    // Each event leaves at once, so withdrawing permission leaves nothing queued.
    request_batching: false, disable_compression: true,
    ...(kind === 'anonymous' ? { cookieless_mode: 'always' as const, persistence: 'memory' as const } : { persistence: 'localStorage' as const }),
    before_send: capture => mode === kind && !privacySignal() ? sanitizeCapture(capture, window.location.origin) : null,
  };
}

const idle = () => new Promise<void>(resolve => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 2000 });
  else setTimeout(resolve, 200);
});

function load(kind: Active, settings: AnalyticsConfig) {
  return clients[kind] ??= idle().then(() => import('posthog-js/dist/module.slim.no-external')).then(({ default: posthog }) =>
    posthog.init(settings.key, analyticsOptions(settings, kind), `almina_${kind}`) as PostHog)
    .catch(error => { delete clients[kind]; throw error; });
}

function send(event: string, properties: Properties) {
  const kind = mode, settings = config;
  if (!settings || !kind || kind === 'off') return;
  void load(kind, settings).then(client => { if (mode === kind) client.capture(event, properties); }).catch(() => undefined);
}

export function track(event: string, properties: Properties = {}) {
  try {
    if (typeof window === 'undefined') return;
    // The address is taken now: the SDK may only be ready after the shopper has moved on.
    const entry: [string, Properties] = [event, { ...properties, $current_url: window.location.href, $pathname: window.location.pathname }];
    if (mode === undefined) { if (waiting.length < 20) waiting.push(entry); return; }
    send(...entry);
  } catch { /* Measurement is optional. */ }
}

function forgetDevice() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) if (/^(ph_|__ph)/.test(key)) storage.removeItem(key);
  }
}

export function configureAnalytics(settings: AnalyticsConfig, next: AnalyticsMode) {
  const previous = mode;
  config = settings; mode = next;
  try {
    if (previous === 'full' && next !== 'full') {
      void clients.full?.then(client => { client.opt_out_capturing(); client.reset(); forgetDevice(); }).catch(() => undefined);
    } else if (next === 'full') {
      void clients.full?.then(client => client.opt_in_capturing()).catch(() => undefined);
    }
    // A visitor who declined earlier must not keep identifiers from an earlier permission.
    if (next !== 'full' && !clients.full) forgetDevice();
  } catch { /* Storage may be unavailable. */ }
  const queued = waiting; waiting = [];
  for (const entry of queued) send(...entry);
  // Permission given on a page that was not being measured: count that page.
  if (previous === 'off' && next === 'full') track('$pageview');
}
