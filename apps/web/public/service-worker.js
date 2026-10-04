// Generic notification text avoids exposing customer/order details on lock screens.
self.addEventListener('push', event => { event.waitUntil(self.registration.showNotification('Al Mina Pharmacy', { body: 'Order updates are available. Sign in to review them.' })); });
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(self.clients.openWindow('/admin/orders')); });
