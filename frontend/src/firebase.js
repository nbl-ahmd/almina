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

export const requestPermission = () => {

  console.log("Requesting User Permission......");
  Notification.requestPermission().then((permission) => {

    if (permission === "granted") {

      console.log("Notification User Permission Granted."); 
      return getToken(messaging, { vapidKey: `BGLR_kRqa5U4O4QeuBuT0l9ZWWxkont3ETXVbdRSyhP0-0CJe9fCzu_ypogjtGG2_GzqZDwhiJ8WbpxAlH793ig` })
        .then((currentToken) => {

          if (currentToken) {

            console.log('Client Token: ', currentToken);
          } else {
            
            console.log('Failed to generate the app registration token.');
          }
        })
        .catch((err) => {

          console.log('An error occurred when requesting to receive the token.', err);
        });
    } else {

      console.log("User Permission Denied.");
    }
  });

}

requestPermission();

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