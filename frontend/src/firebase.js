import { initializeApp } from "firebase/app";

 import { getAnalytics } from "firebase/analytics";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
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



