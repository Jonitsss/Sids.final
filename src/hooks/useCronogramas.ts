"use client"

import { useState, useEffect } from "react"
import { GrillaServicio } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useCronogramas() {
  const [cronogramas, setCronogramas] = useState<GrillaServicio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }

    const q = query(collection(db, "cronogramas"), orderBy("fecha", "asc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCronogramas(snap.docs.map((doc) => mapDoc<GrillaServicio>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  return { cronogramas, loading, setCronogramas }
}
