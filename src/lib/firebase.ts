import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage, FirebaseStorage, connectStorageEmulator } from "firebase/storage"
import { getFunctions, Functions, connectFunctionsEmulator } from "firebase/functions"
import { getMessaging, Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const FUNCTIONS_REGION = "southamerica-east1"

function createFirebaseApp() {
  if (typeof window === "undefined") return null
  if (!firebaseConfig.apiKey) return null
  if (getApps().length) return getApps()[0]
  return initializeApp(firebaseConfig)
}

const app = createFirebaseApp()
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null
const storage = app ? getStorage(app) : null
const functions: Functions | null = app
  ? getFunctions(app, FUNCTIONS_REGION)
  : null
const messaging: Messaging | null = app ? getMessaging(app) : null

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
) {
  if (auth) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
  if (db) connectFirestoreEmulator(db, "127.0.0.1", 8080)
  if (storage) connectStorageEmulator(storage, "127.0.0.1", 9199)
  if (functions) connectFunctionsEmulator(functions, "127.0.0.1", 5001)
}

export { app, auth, db, storage, functions, messaging, FUNCTIONS_REGION }
