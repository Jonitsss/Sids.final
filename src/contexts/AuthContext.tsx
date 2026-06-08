"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Usuario, Rol } from "@/types"

interface AuthContextType {
  user: User | null
  userData: Usuario | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, data: Partial<Usuario>) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserData: (data: Partial<Usuario>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = async (firebaseUser: User) => {
    if (!db) return null
    try {
      const docRef = doc(db, "usuarios", firebaseUser.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) return { ...docSnap.data(), id: docSnap.id } as Usuario

      const q = query(collection(db, "usuarios"), where("authUid", "==", firebaseUser.uid))
      const snap = await getDocs(q)
      if (!snap.empty) return { ...snap.docs[0].data(), id: snap.docs[0].id } as Usuario

      const emailQ = query(collection(db, "usuarios"), where("email", "==", firebaseUser.email?.toLowerCase()))
      const emailSnap = await getDocs(emailQ)
      if (!emailSnap.empty) {
        const d = emailSnap.docs[0]
        await setDoc(doc(db, "usuarios", d.id), { authUid: firebaseUser.uid }, { merge: true })
        return { ...d.data(), authUid: firebaseUser.uid, id: d.id } as Usuario
      }

      return null
    } catch (error) {
      console.error("Error fetching user data:", error)
      return null
    }
  }

  useEffect(() => {
    if (!auth) return
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser && db) {
        try {
          const data = await fetchUserData(firebaseUser)
          setUserData(data)
        } catch (error) {
          console.error("Error in auth state change:", error)
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase no inicializado")
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string, data: Partial<Usuario>) => {
    if (!auth || !db) throw new Error("Firebase no inicializado")
    const emailLower = email.toLowerCase().trim()
    const credencial = await createUserWithEmailAndPassword(auth, emailLower, password)
    const uid = credencial.user.uid

    const snap = await getDocs(collection(db, "usuarios"))
    const preProfile = snap.docs.find(
      (d) => !d.data().authUid && d.data().email?.toLowerCase() === emailLower
    )

    if (preProfile) {
      await setDoc(doc(db, "usuarios", preProfile.id), {
        authUid: uid,
        nombre: data.nombre || preProfile.data().nombre || "",
        apellido: data.apellido || preProfile.data().apellido || "",
        telefono: data.telefono || preProfile.data().telefono || "",
        notificaciones: preProfile.data().notificaciones ?? true,
        email: emailLower,
        activo: true,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } else {
      await setDoc(doc(db, "usuarios", uid), {
        id: uid,
        email: emailLower,
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        telefono: data.telefono || "",
        rol: (data.rol as Rol) || "colaborador",
        ministerioIds: data.ministerioIds || [],
        fotoURL: data.fotoURL || "",
        authUid: uid,
        notificaciones: true,
        activo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  const logout = async () => {
    if (!auth) return
    await signOut(auth)
    setUserData(null)
  }

  const resetPassword = async (email: string) => {
    if (!auth) return
    await sendPasswordResetEmail(auth, email)
  }

  const updateUserData = async (data: Partial<Usuario>) => {
    if (!user || !db) return
    setUserData((prev) => prev ? { ...prev, ...data } : prev)
    let ref = doc(db, "usuarios", user.uid)
    let snap = await getDoc(ref)
    if (!snap.exists()) {
      const q = query(collection(db, "usuarios"), where("authUid", "==", user.uid))
      const snap2 = await getDocs(q)
      if (!snap2.empty) ref = snap2.docs[0].ref
    }
    await setDoc(ref, { ...data, authUid: user.uid, updatedAt: serverTimestamp() }, { merge: true })
  }

  return (
    <AuthContext.Provider
      value={{ user, userData, loading, login, register, logout, resetPassword, updateUserData }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return context
}
