"use client"

import { useState, useEffect } from "react"
import { GrillaServicio } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"

function parseDoc(doc: any): GrillaServicio {
  const data = doc.data()
  return {
    ...data,
    id: doc.id,
    fecha: data.fecha?.toDate?.() || data.fecha,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
  } as GrillaServicio
}

export function useCronogramas() {
  const [cronogramas, setCronogramas] = useState<GrillaServicio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }

    const q = query(collection(db, "cronogramas"), orderBy("fecha", "asc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCronogramas(snap.docs.map(parseDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  return { cronogramas, loading, setCronogramas }
}
