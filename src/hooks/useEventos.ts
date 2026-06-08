"use client"

import { useState, useEffect, useCallback } from "react"
import { Evento } from "@/types"
import { obtenerDocumentos, where, orderBy } from "@/lib/firestore"

export function useEventos(fechaInicio?: Date, fechaFin?: Date) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const c: any[] = [orderBy("fecha", "asc")]
        if (fechaInicio) {
          c.push(where("fecha", ">=", fechaInicio))
        }
        if (fechaFin) {
          c.push(where("fecha", "<=", fechaFin))
        }
        const data = await obtenerDocumentos<Evento>("eventos", c)
        if (mounted) setEventos(data)
      } catch (error) {
        if (mounted) console.error("Error fetching eventos:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [fechaInicio, fechaFin, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { eventos, loading, refetch, setEventos }
}
