import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBri5mt5GLZiu0KQkuq0VU3QVPqAIFPf-s",
  authDomain: "resumeforge-5b846.firebaseapp.com",
  projectId: "resumeforge-5b846",
  storageBucket: "resumeforge-5b846.appspot.com",
  messagingSenderId: "13782981121",
  appId: "1:13782981121:web:362f3d6b27d70528433e00",
  measurementId: "G-SDPBEBH474"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
