import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// Replace these values with your Firebase Web App configuration.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase.
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication.
export const auth = getAuth(app);
