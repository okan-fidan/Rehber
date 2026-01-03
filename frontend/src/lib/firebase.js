import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8oDLSHBIFvMsadfzFSAZPv6Cb6csTiVs",
  authDomain: "networksolution-a9480.firebaseapp.com",
  projectId: "networksolution-a9480",
  storageBucket: "networksolution-a9480.firebasestorage.app",
  messagingSenderId: "354620308224",
  appId: "1:354620308224:web:0502ece183e2a9265951e5",
  measurementId: "G-92Q8JQZZ5J"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const storage = getStorage(app);
const firestore = getFirestore(app);

export { auth, storage, firestore, app };
