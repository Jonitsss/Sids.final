"use client"

import { useState, useEffect } from "react"
import { RamaCelular } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"
import { logger } from "@/lib/logger"

export function useRamasCelular() {
  const [ramas, setRamas] = useState<RamaCelular[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const q = query(collection(db, "ramas_celular"), where("activo", "==", true))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => {
          try {
            return mapDoc<RamaCelular>(doc)
          } catch (err) {
            logger.error(`Error mapping rama doc ${doc.id}`, err instanceof Error ? err : undefined)
            return null
          }
        }).filter(Boolean) as RamaCelular[]
        setRamas(data)
        setLoading(false)
      },
      (err) => {
        logger.error("useRamasCelular onSnapshot error", err)
        setError(err.message)
        setLoading(false)
      },
    )

    return unsub
  }, [])

  return { ramas, loading, error, setRamas }
}
