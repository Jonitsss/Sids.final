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
import { logger } from "@/lib/logger"
import { Usuario, Rol, Administer } from "@/types"
import { asignarRolUsuario } from "@/lib/roles"
import { enviarNotificacion } from "@/lib/firestore"

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

  function deriveAdminister(data: Record<string, unknown>): Administer | undefined {
    if (data.administer) return undefined
    const ministerios = (data.ministerioIds as string[])?.filter(Boolean) ?? []
    const celulas = (data.celulaIds as string[])?.filter(Boolean) ?? []
    const escuelas = (data.escuelaMinisteriosIds as string[])?.filter(Boolean) ?? []
    if (ministerios.length === 0 && celulas.length === 0 && escuelas.length === 0) return undefined
    return { ministerios, celulas, escuelas }
  }

  const fetchUserData = async (firebaseUser: User) => {
    if (!db) return null
    try {
      let docRef = doc(db, "usuarios", firebaseUser.uid)
      let docSnap = await getDoc(docRef)
      let userRef = docSnap.exists() ? docRef : null

      if (!docSnap.exists()) {
        const q = query(collection(db, "usuarios"), where("authUid", "==", firebaseUser.uid))
        const snap = await getDocs(q)
        if (!snap.empty) {
          userRef = snap.docs[0].ref
          docSnap = await getDoc(userRef)
        }
      }

      if (!docSnap.exists()) {
        const emailQ = query(collection(db, "usuarios"), where("email", "==", firebaseUser.email?.toLowerCase()))
        const emailSnap = await getDocs(emailQ)
        if (!emailSnap.empty) {
          const d = emailSnap.docs[0]
          userRef = d.ref
          docSnap = await getDoc(userRef)
          setDoc(userRef, { authUid: firebaseUser.uid }, { merge: true }).catch(() => {})
        }
      }

      if (!docSnap.exists()) return null

      const data = docSnap.data()
      if (!data.email && !data.nombre) return null

      const administer = deriveAdminister(data)
      if (administer && userRef) {
        setDoc(userRef, { administer }, { merge: true }).catch(() => {})
      }

      return {
        ...data,
        id: docSnap.id,
        ...(administer ? { administer } : {}),
      } as Usuario
    } catch (error) {
      logger.error("Error fetching user data", error instanceof Error ? error : undefined)
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
          logger.error("Error in auth state change", error instanceof Error ? error : undefined)
          setUserData(null)
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    let lastVisible = true
    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") {
        lastVisible = false
        return
      }
      if (lastVisible) return
      lastVisible = true
      if (!auth || !db) return
      const current = auth.currentUser
      if (!current) return
      try {
        await current.getIdToken(true)
        const data = await fetchUserData(current)
        setUserData((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev
          return data
        })
      } catch (error) {
        logger.error("Error refreshing user data on visibility change", error instanceof Error ? error : undefined)
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth || !db) throw new Error("Firebase no inicializado")
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const uid = cred.user.uid

    const data = await fetchUserData(cred.user)
    if (data?.rol) {
      try { await asignarRolUsuario(uid, data.rol === "pastor" || data.rol === "administrador" ? data.rol : undefined) } catch {}
    }
    await cred.user.getIdToken(true)
  }

  const notifyAdminsOfNewUser = async (userName: string, userEmail: string) => {
    if (!db) return
    try {
      const q = query(collection(db, "usuarios"), where("rol", "in", ["pastor", "administrador"]))
      const snap = await getDocs(q)
      for (const d of snap.docs) {
        const admin = d.data()
        const adminId = admin.authUid || d.id
        await enviarNotificacion({
          usuarioId: adminId,
          titulo: "Nuevo usuario registrado",
          mensaje: `${userName} (${userEmail}) se ha registrado y está pendiente de aprobación.`,
          tipo: "registro",
          referenciaId: d.id,
        })
      }
    } catch (error) {
      logger.error("Error notifying admins of new user", error instanceof Error ? error : undefined)
    }
  }

  const register = async (email: string, password: string, data: Partial<Usuario>) => {
    if (!auth || !db) throw new Error("Firebase no inicializado")
    const emailLower = email.toLowerCase().trim()
    const credencial = await createUserWithEmailAndPassword(auth, emailLower, password)
    const uid = credencial.user.uid

    const q = query(collection(db, "usuarios"), where("email", "==", emailLower))
    const snap = await getDocs(q)
    const preProfile = snap.docs.find((d) => !d.data().authUid)

    const userName = `${data.nombre || ""} ${data.apellido || ""}`.trim() || emailLower

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
      const preRol = preProfile.data()?.rol
      if (preRol) {
        try { await asignarRolUsuario(uid, preRol === "pastor" || preRol === "administrador" ? preRol : undefined) } catch {}
      }
    } else {
      await setDoc(doc(db, "usuarios", uid), {
        id: uid,
        email: emailLower,
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        telefono: data.telefono || "",
        rol: (data.rol as Rol) || "colaborador",
        ministerioIds: data.ministerioIds || [],
        administer: { ministerios: [], celulas: [], escuelas: [] },
        fotoURL: data.fotoURL || "",
        authUid: uid,
        notificaciones: true,
        activo: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    await notifyAdminsOfNewUser(userName, emailLower)
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
