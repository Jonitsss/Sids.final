"use client"

import { useState, useEffect, useCallback } from "react"
import { Notificacion } from "@/types"
import { obtenerDocumentos, where } from "@/lib/firestore"

export function useNotificaciones(usuarioId?: string) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!usuarioId) {
        if (mounted) setLoading(false)
        return
      }
      try {
        const data = await obtenerDocumentos<Notificacion>("notificaciones", [
          where("usuarioId", "==", usuarioId),
        ])
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        if (mounted) {
          setNotificaciones(data)
          setNoLeidas(data.filter((n) => !n.leido).length)
        }
      } catch (error) {
        if (mounted) console.error("Error fetching notificaciones:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [usuarioId, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  return { notificaciones, noLeidas, loading, refetch, setNotificaciones }
}
