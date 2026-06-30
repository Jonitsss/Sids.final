"use client"

import { useState, useEffect } from "react"
import { RamaCelular } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useRamasCelular() {
  const [ramas, setRamas] = useState<RamaCelular[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)

    const q = query(collection(db, "ramas_celular"), where("activo", "==", true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRamas(snap.docs.map((doc) => mapDoc<RamaCelular>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  return { ramas, loading, setRamas }
}
