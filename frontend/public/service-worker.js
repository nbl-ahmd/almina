// service-worker.js

self.addEventListener('push', function(event) {
    const options = {
      body: event.data.body,
      icon: 'https://cdn-icons-png.flaticon.com/128/1008/1008010.png', // Replace with your icon path
    };
  
    event.waitUntil(
      self.registration.showNotification('New Order Placed', options)
    );
  });
  self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
      clients.openWindow('https://alminapharmacy.com/admin')
    );
  });
  

  importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

 //the Firebase config object 
 const firebaseConfig = {
  apiKey: "AIzaSyDhlVBTL5vkRCjowYXXf8WJRMMi17LNaR8",
  authDomain: "al-mina-ba5a8.firebaseapp.com",
  projectId: "al-mina-ba5a8",
  storageBucket: "al-mina-ba5a8.appspot.com",
  messagingSenderId: "181730454094",
  appId: "1:181730454094:web:fee86cd06a91d37cb4311f",
  measurementId: "G-Z482GSGXYM"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});
