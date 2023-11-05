// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/10.5.2/firebase-messaging.js");
    
    const firebaseConfig = {
        apiKey: "AIzaSyCAoeyr-tAvfLBcULu3uK_1yAtJ_YNjNv8",
        authDomain: "alminaecommerce.firebaseapp.com",
        projectId: "alminaecommerce",
        storageBucket: "alminaecommerce.appspot.com",
        messagingSenderId: "203555401885",
        appId: "1:203555401885:web:30719addb82f375e672474",
        measurementId: "G-ZJC6EFBR6V"
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