"use client"

import { useState, useEffect } from "react"
import { Ministerio } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

function parseDoc(doc: any): Ministerio {
  const data = doc.data()
  return {
    ...data,
    id: doc.id,
    fecha: data.fecha?.toDate?.() || data.fecha,
    fechaLimite: data.fechaLimite?.toDate?.() || data.fechaLimite,
    fechaIngreso: data.fechaIngreso?.toDate?.() || data.fechaIngreso,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
  } as Ministerio
}

export function useMinisterios() {
  const [ministerios, setMinisterios] = useState<Ministerio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }

    const q = query(collection(db, "ministerios"), where("activo", "==", true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMinisterios(snap.docs.map(parseDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  return { ministerios, loading, setMinisterios }
}
