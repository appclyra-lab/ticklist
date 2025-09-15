// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJprF6stMaGggrl_8470mHTno3w4V63T8",
  authDomain: "ticklist-e35cd.firebaseapp.com",
  projectId: "ticklist-e35cd",
  storageBucket: "ticklist-e35cd.firebasestorage.app",  // <<< BURASI ÖNEMLİ
  messagingSenderId: "484436218985",
  appId: "1:484436218985:web:6bdd1a177ab1ae9db3fef8",
  measurementId: "G-KZS4HWWG0K",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// İstersen ikinci argümanla gs:// ismi vererek tamamen sabitle:
export const storage = getStorage(app, "gs://ticklist-e35cd.firebasestorage.app");

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
