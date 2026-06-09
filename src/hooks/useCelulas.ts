"use client"

import { useState, useEffect } from "react"
import { Celula, Rol } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, or } from "firebase/firestore"

function parseDoc(doc: any): Celula {
  const data = doc.data()
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
  } as Celula
}

export function useCelulas(usuarioId?: string, rol?: Rol) {
  const [celulas, setCelulas] = useState<Celula[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)

    const constraints: any[] = [where("activo", "==", true)]

    if (rol !== "pastor" && rol !== "administrador" && usuarioId) {
      constraints.push(
        or(
          where("liderId", "==", usuarioId),
          where("coliderId", "==", usuarioId),
          where("anfitrionId", "==", usuarioId)
        )
      )
    }

    const q = query(collection(db, "celulas"), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCelulas(snap.docs.map(parseDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [usuarioId, rol])

  return { celulas, loading, setCelulas }
}
