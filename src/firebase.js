import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAR9FzNinJRgdM7DWBKwN12pz9_MBzEoLc",
  authDomain: "amsync-2bb45.firebaseapp.com",
  projectId: "amsync-2bb45",
  storageBucket: "amsync-2bb45.firebasestorage.app",
  messagingSenderId: "799866817454",
  appId: "1:799866817454:web:12b82905b72c10b748163f",
  measurementId: "G-TLYJWS4JFP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app; 