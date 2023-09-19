// Scripts for firebase and firebase messaging
importScripts(
        "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
    );
    importScripts(
        "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
    );
    
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
    
    messaging.onBackgroundMessage(function (payload) {
        console.log("Received background message ", payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
        };
    
        self.registration.showNotification(notificationTitle, notificationOptions);
    });