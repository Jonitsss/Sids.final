"use client"

import { useState, useEffect } from "react"
import { Celula, Rol } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, or, and } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useCelulas(usuarioId?: string, rol?: Rol) {
  const [celulas, setCelulas] = useState<Celula[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)

    const constraints: any[] = []

    if (rol !== "pastor" && rol !== "administrador" && usuarioId) {
      constraints.push(
        and(
          where("activo", "==", true),
          or(
            where("liderId", "==", usuarioId),
            where("coliderId", "==", usuarioId),
            where("anfitrionId", "==", usuarioId)
          )
        )
      )
    } else {
      constraints.push(where("activo", "==", true))
    }

    const q = query(collection(db, "celulas"), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCelulas(snap.docs.map((doc) => mapDoc<Celula>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [usuarioId, rol])

  return { celulas, loading, setCelulas }
}
