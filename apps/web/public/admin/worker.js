// No caching of authenticated pages, customer data, or offline writes.
// Push messages carry no payload (nothing about a customer travels through the push service). When one arrives the worker
// asks the console for the order counts with the staff session cookie, so the notification can say what is waiting.
// Counts are not personal data; if the session is gone the notification stays generic.
const ORDERS = '/admin/orders?status=pending';
const FALLBACK = '/admin/notifications';
// Whether an open console page has its loud alarm armed. The page tells us; when we do not know, the system notification keeps its sound.
let alarmArmed = false;
const ICON = '/android-chrome-192x192.png';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const adminClients = async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
  .filter(client => new URL(client.url).pathname.startsWith('/admin'));

async function pendingSummary() {
  try {
    const response = await fetch('/api/admin/orders/receiving', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const value = await response.json();
    return Number.isInteger(value.pendingCount) && value.pendingCount >= 0 ? value.pendingCount : null;
  } catch { return null; }
}

async function setBadge(count) {
  try {
    if (!self.navigator.setAppBadge) return;
    if (count > 0) await self.navigator.setAppBadge(count); else await self.navigator.clearAppBadge();
  } catch { /* Badges are optional. */ }
}

self.addEventListener('push', event => event.waitUntil((async () => {
  const windows = await adminClients();
  for (const client of windows) client.postMessage({ type: 'almina-alerts-updated' });
  const visible = windows.some(client => client.visibilityState === 'visible');
  const pending = await pendingSummary();
  await setBadge(pending ?? 0);
  // Always show a visible notification (required by iOS Web Push). Keep lock-screen content to counts.
  const orders = pending !== null && pending > 0;
  await self.registration.showNotification(orders ? (pending === 1 ? 'New order to confirm' : `${pending} orders to confirm`) : 'Al Mina Pharmacy', {
    body: orders ? 'Open the inbox to review and confirm.' : 'New activity is available. Sign in to review your notifications.',
    tag: orders ? 'almina-orders' : 'almina-activity', renotify: true,
    // A visible page with an armed alarm rings by itself; every other case gets the normal notification and its system sound.
    silent: visible && alarmArmed,
    // Order alerts stay on desktop until handled; they are the thing this channel exists for.
    requireInteraction: orders, vibrate: orders ? [200, 100, 200] : undefined, timestamp: Date.now(),
    icon: ICON, badge: ICON, actions: orders ? [{ action: 'orders', title: 'Open orders' }] : [],
    data: { url: orders ? ORDERS : FALLBACK },
  });
})()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data && typeof event.notification.data.url === 'string' && event.notification.data.url.startsWith('/admin/')
    ? event.notification.data.url : FALLBACK;
  event.waitUntil((async () => {
    const existing = (await adminClients())[0];
    if (existing) {
      try { await existing.focus(); await existing.navigate(target); return; } catch { /* Fall through to a new window. */ }
    }
    await self.clients.openWindow(target);
  })());
});

// The console clears the badge as soon as staff look at the inbox.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'almina-alarm-state') alarmArmed = event.data.armed === true;
  if (event.data && event.data.type === 'almina-badge' && Number.isInteger(event.data.count) && event.data.count >= 0) event.waitUntil(setBadge(event.data.count));
});

// The browser replaced or expired this device's push subscription: register the new one so alerts keep arriving without anyone
// having to open the settings page. Needs the old subscription's key and a signed-in session; otherwise the settings page shows
// the device as disconnected and staff turn notifications on again.
self.addEventListener('pushsubscriptionchange', event => event.waitUntil((async () => {
  try {
    const key = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey;
    if (!key) return;
    const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await fetch('/api/admin/orders/subscribe', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-csrf-protection': '1' },
      body: JSON.stringify({ subscription: subscription.toJSON() }) });
  } catch { /* Staff can turn notifications on again from the settings page. */ }
})()));
