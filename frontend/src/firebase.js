// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAoeyr-tAvfLBcULu3uK_1yAtJ_YNjNv8",
  authDomain: "alminaecommerce.firebaseapp.com",
  projectId: "alminaecommerce",
  storageBucket: "alminaecommerce.appspot.com",
  messagingSenderId: "203555401885",
  appId: "1:203555401885:web:30719addb82f375e672474",
  measurementId: "G-ZJC6EFBR6V"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(firebaseApp);
//Access Firebase cloud messaging
const messaging = getMessaging(firebaseApp);


/*
This function allows us to get your device token from Firebase 
which is required for sending Push notifications to your device.
*/
export const getTokenFromFirebase = () => {
        return getToken(messaging, {
            vapidKey: "<YOUR_WEB_PUSH_CERTIFICATE>",
        })
            .then((currentToken) => {
                if (currentToken) {
                    console.log("current token for client: ", currentToken);
                } else {
                    console.log(
                        "No registration token available. Request permission to generate one."
                    );
                }
            })
            .catch((err) => {
                console.log("An error occurred while retrieving token. ", err);
            });
    };
    
    //This function listens to push messages on the server
    export const onMessageListener = () =>
        new Promise((resolve) => {
            onMessage(messaging, (payload) => {
                console.log(payload);
                resolve(payload);
            });
        });

