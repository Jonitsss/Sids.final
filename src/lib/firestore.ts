import {
  collection,
  doc as fbDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from "firebase/firestore"
import { db } from "./firebase"

function getDb() {
  if (!db) throw new Error("Firestore no está inicializado. Verifica las variables de entorno de Firebase.")
  return db
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
  const firestore = getDb()
  await deleteDoc(fbDoc(firestore, coleccion, id))
}

export { where, orderBy, limit, query, Timestamp }
