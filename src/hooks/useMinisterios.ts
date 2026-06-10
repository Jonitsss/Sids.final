"use client"

import { useState, useEffect } from "react"
import { Ministerio } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useMinisterios() {
  const [ministerios, setMinisterios] = useState<Ministerio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }

    const q = query(collection(db, "ministerios"), where("activo", "==", true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMinisterios(snap.docs.map((doc) => mapDoc<Ministerio>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  return { ministerios, loading, setMinisterios }
}
