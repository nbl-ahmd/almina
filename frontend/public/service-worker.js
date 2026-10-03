// Standard Web Push supports both plain notifications and FCM-shaped notification envelopes.
// Browser registration/encryption stays native; no remote code runs inside the privileged worker.
self.addEventListener('push', function (event) {
  let payload = {};
  try { const decoded = event.data ? event.data.json() : {}; payload = decoded && typeof decoded === 'object' ? decoded : {}; } catch { /* Use a generic notification. */ }
  const notification = payload.notification || payload;
  const title = typeof notification.title === 'string' ? notification.title.slice(0, 100) : 'Al Mina Pharmacy';
  const body = typeof notification.body === 'string' ? notification.body.slice(0, 500) : 'A new order notification is available.';
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/android-chrome-192x192.png' }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(new URL('/admin', self.location.origin).href));
});
