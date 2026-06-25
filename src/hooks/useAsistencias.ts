"use client"

import { useState, useEffect } from "react"
import { Asistencia } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, and, or } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useAsistencias(fechaInicio?: Date, fechaFin?: Date, usuarioId?: string) {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }
    setLoading(true)

    const constraints: any[] = []

    if (fechaInicio && fechaFin) {
      constraints.push(and(where("fecha", ">=", fechaInicio), where("fecha", "<=", fechaFin)))
    } else if (fechaInicio) {
      constraints.push(where("fecha", ">=", fechaInicio))
    } else if (fechaFin) {
      constraints.push(where("fecha", "<=", fechaFin))
    }

    if (usuarioId) {
      constraints.push(where("usuarioId", "==", usuarioId))
    }

    const q = query(collection(db, "asistencias"), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAsistencias(snap.docs.map((doc) => mapDoc<Asistencia>(doc)))
        setLoading(false)
      },
      () => setLoading(false)
    )

    return unsub
  }, [fechaInicio, fechaFin, usuarioId])

  return { asistencias, loading, setAsistencias }
}
