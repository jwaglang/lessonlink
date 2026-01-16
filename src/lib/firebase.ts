import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAezFlXn0AhXCPqjjQ9sbpvrP-Tm-kBfTo",
  authDomain: "studio-3824588486-46768.firebaseapp.com",
  projectId: "studio-3824588486-46768",
  storageBucket: "studio-3824588486-46768.firebasestorage.app",
  messagingSenderId: "971996571230",
  appId: "1:971996571230:web:055dad1036ec10263a36cf"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);

export default app;
