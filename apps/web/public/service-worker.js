// No caching of authenticated pages, customer data, or offline writes.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>event.waitUntil((async()=>{
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 const admin=clients.filter(client=>new URL(client.url).pathname.startsWith('/admin/'));
 for(const client of admin)client.postMessage({type:'almina-alerts-updated'});
 // Always show a visible notification (required by iOS Web Push). Keep lock-screen content generic.
 await self.registration.showNotification('Al Mina Pharmacy',{body:'New activity is available. Sign in to review your notifications.',tag:'almina-activity',renotify:true,silent:admin.some(client=>client.visibilityState==='visible'),icon:'/android-chrome-192x192.png',data:{url:'/admin/notifications'}});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 const existing=clients.find(client=>new URL(client.url).pathname.startsWith('/admin/'));
 if(existing){await existing.navigate('/admin/notifications');await existing.focus();}else await self.clients.openWindow('/admin/notifications');
})());});
