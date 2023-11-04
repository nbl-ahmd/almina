// service-worker.js

self.addEventListener('push', function(event) {
    const options = {
      body: event.data.text(),
      icon: 'path-to-icon.png', // Replace with your icon path
    };
  
    event.waitUntil(
      self.registration.showNotification('New Order Placed', options)
    );
  });
  self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
      clients.openWindow('https://alminapharmacy.com/admin/orders')
    );
  });
  