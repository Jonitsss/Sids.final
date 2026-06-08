import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getFirestore, Firestore } from "firebase/firestore"
import { getStorage, FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

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

export { app, auth, db, storage }
