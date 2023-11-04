import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyDhlVBTL5vkRCjowYXXf8WJRMMi17LNaR8",
  authDomain: "al-mina-ba5a8.firebaseapp.com",
  projectId: "al-mina-ba5a8",
  storageBucket: "al-mina-ba5a8.appspot.com",
  messagingSenderId: "181730454094",
  appId: "1:181730454094:web:fee86cd06a91d37cb4311f",
  measurementId: "G-Z482GSGXYM"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let messaging = null;

if (isSupported()) {
  messaging = getMessaging(app);
  // You can set up other messaging handlers here
} else {
  console.log('Firebase Messaging is not supported in this browser.');
}

const onMessageListener = () => {
  return new Promise((resolve) => {
    if (messaging) {
      // Set up your messaging listener here
    } else {
      console.log('Messaging listener is not available due to unsupported browser.');
    }
  });
};

export { app, messaging, onMessageListener };