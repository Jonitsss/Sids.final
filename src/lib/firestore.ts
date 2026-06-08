import {
  collection,
  doc as fbDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from "firebase/firestore"
import { db, auth, FUNCTIONS_REGION } from "./firebase"

function getDb() {
  if (!db) throw new Error("Firestore no está inicializado. Verifica las variables de entorno de Firebase.")
  return db
}

const FUNCTION_URL = `https://${FUNCTIONS_REGION}-sids-eb607.cloudfunctions.net`

async function callFunction(name: string, body: Record<string, unknown>): Promise<any> {
  if (!auth?.currentUser) throw new Error("No hay usuario autenticado.")
  const token = await auth.currentUser.getIdToken()
  const res = await fetch(`${FUNCTION_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Error en la función.")
  return data
}

export async function obtenerDocumentos<T>(
  coleccion: string,
  constraints: any[] = []
): Promise<T[]> {
  const firestore = getDb()
  const q = query(collection(firestore, coleccion), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data() as DocumentData
    return {
      ...data,
      id: doc.id,
      fecha: data.fecha?.toDate?.() || data.fecha,
      fechaLimite: data.fechaLimite?.toDate?.() || data.fechaLimite,
      fechaIngreso: data.fechaIngreso?.toDate?.() || data.fechaIngreso,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as T
  })
}

export async function obtenerDocumento<T>(
  coleccion: string,
  id: string
): Promise<T | null> {
  const firestore = getDb()
  const docRef = fbDoc(firestore, coleccion, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  const data = docSnap.data() as DocumentData
  return {
    ...data,
    id: docSnap.id,
    fecha: data.fecha?.toDate?.() || data.fecha,
    fechaLimite: data.fechaLimite?.toDate?.() || data.fechaLimite,
    fechaIngreso: data.fechaIngreso?.toDate?.() || data.fechaIngreso,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
  } as T
}

export async function crearDocumento<T>(
  coleccion: string,
  data: Partial<T>
): Promise<string> {
  const firestore = getDb()
  const docRef = await addDoc(collection(firestore, coleccion), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function actualizarDocumento<T>(
  coleccion: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  const firestore = getDb()
  const docRef = fbDoc(firestore, coleccion, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function eliminarDocumento(
  coleccion: string,
  id: string
): Promise<void> {
  await callFunction("borrarDocumento", { coleccion, id })
}

export { where, orderBy, limit, query, Timestamp }
