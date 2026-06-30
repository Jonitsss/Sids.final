"use client"

import { useState, useEffect } from "react"
import { GrupoEscuelaBiblica } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useEscuelaBiblica() {
  const [grupos, setGrupos] = useState<GrupoEscuelaBiblica[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)

    const q = query(collection(db, "grupos_escuela_biblica"), where("activo", "==", true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setGrupos(snap.docs.map((doc) => mapDoc<GrupoEscuelaBiblica>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  return { grupos, loading, setGrupos }
}
