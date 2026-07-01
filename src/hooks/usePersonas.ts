"use client"

import { useState, useEffect } from "react"
import { Persona } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"
import { logger } from "@/lib/logger"

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const q = query(collection(db, "personas"), orderBy("nombre", "asc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => {
          try {
            return mapDoc<Persona>(doc)
          } catch (err) {
            logger.error(`Error mapping persona doc ${doc.id}`, err instanceof Error ? err : undefined)
            return null
          }
        }).filter(Boolean) as Persona[]
        setPersonas(data)
        setLoading(false)
      },
      (err) => {
        logger.error("usePersonas onSnapshot error", err)
        setError(err.message)
        setLoading(false)
      },
    )

    return unsub
  }, [])

  return { personas, loading, error, setPersonas }
}
