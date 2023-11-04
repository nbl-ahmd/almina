// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhlVBTL5vkRCjowYXXf8WJRMMi17LNaR8",
  authDomain: "al-mina-ba5a8.firebaseapp.com",
  projectId: "al-mina-ba5a8",
  storageBucket: "al-mina-ba5a8.appspot.com",
  messagingSenderId: "181730454094",
  appId: "1:181730454094:web:fee86cd06a91d37cb4311f",
  measurementId: "G-Z482GSGXYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);