import { messaging, db } from "@/lib/firebase"
import { getToken, onMessage, MessagePayload } from "firebase/messaging"
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore"

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ""

export async function requestPermission(uid: string): Promise<string | null> {
  if (!messaging || !db) return null
  if (typeof window === "undefined") return null

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (!token) return null

    const userRef = doc(db, "usuarios", uid)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      await setDoc(userRef, { fcmTokens: arrayUnion(token) }, { merge: true })
    }
    return token
  } catch {
    return null
  }
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
