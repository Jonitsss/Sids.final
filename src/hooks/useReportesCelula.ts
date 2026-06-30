"use client"

import { useState, useEffect } from "react"
import { ReporteCelula } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useReportesCelula(celulaId: string | null, ultimas: number = 8) {
  const [reportes, setReportes] = useState<ReporteCelula[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !celulaId) { setLoading(false); return }
    setLoading(true)

    const q = query(
      collection(db, "reporte_celulas"),
      where("celulaId", "==", celulaId),
      where("activo", "==", true),
      orderBy("semana", "desc"),
      limit(ultimas)
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReportes(snap.docs.map((doc) => mapDoc<ReporteCelula>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [celulaId, ultimas])

  return { reportes, loading, setReportes }
}
