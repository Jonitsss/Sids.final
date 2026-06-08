"use client"

import { useState, useEffect, useCallback } from "react"
import { Tarea } from "@/types"
import { obtenerDocumentos, where } from "@/lib/firestore"

export function useTareas(usuarioId?: string, ministerioId?: string) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const c: any[] = []
        if (usuarioId) {
          c.push(where("responsableId", "==", usuarioId))
        }
        if (ministerioId) {
          c.push(where("ministerioId", "==", ministerioId))
        }
        const data = await obtenerDocumentos<Tarea>("tareas", c)
        data.sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
        if (mounted) setTareas(data)
      } catch (error) {
        if (mounted) console.error("Error fetching tareas:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [usuarioId, ministerioId, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { tareas, loading, refetch, setTareas }
}
