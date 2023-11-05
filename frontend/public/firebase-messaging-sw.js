// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/10.5.2/firebase-messaging.js");
    
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
    
    // Retrieve firebase messaging
   const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage( (payload) => {
        console.log("Received background message ", payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.image,
        };
    
        self.registration.showNotification(notificationTitle, notificationOptions);
    });