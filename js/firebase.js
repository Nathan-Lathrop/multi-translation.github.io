import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { getAnalytics } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";

// Your web app's Firebase configuration.
const firebaseConfig = {
    apiKey: "AIzaSyBakZ-IjROlIRiudvEQtvieyCd0lSXi3Wg",
    authDomain: "multi-translation.firebaseapp.com",
    projectId: "multi-translation",
    storageBucket: "multi-translation.firebasestorage.app",
    messagingSenderId: "491306701268",
    appId: "1:491306701268:web:4bd6e97a966aafe0904641",
    measurementId: "G-XBZBH4KLT6"
};

// Initialize Firebase.
const app = initializeApp(firebaseConfig);

// Initialize Google Analytics.
export const analytics = getAnalytics(app);

// Initialize Firebase Authentication.
export const auth = getAuth(app);

// Initialize Cloud Firestore for saving translation history.
export const db = getFirestore(app);
