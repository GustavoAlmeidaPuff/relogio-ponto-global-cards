import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasValidConfig =
  typeof firebaseConfig.apiKey === "string" && firebaseConfig.apiKey.length > 0;

// Inicializados apenas no cliente; no SSR ficam null para evitar token inválido no chunk.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

if (typeof window !== "undefined" && hasValidConfig) {
  const firebaseApp =
    getApps().length === 0 ? initializeApp(firebaseConfig) : (getApps()[0] as FirebaseApp);
  app = firebaseApp;
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  analytics = getAnalytics(firebaseApp);
}

export { app, auth, db, analytics };

export function getDb(): Firestore {
  if (db === null) throw new Error("Firebase não está disponível.");
  return db;
}

export function isFirebaseConfigured(): boolean {
  return hasValidConfig && typeof window !== "undefined";
}
