"use client"

import { useState, useEffect, useCallback } from "react"
import { Notificacion } from "@/types"
import { escucharDocumentos, where } from "@/lib/firestore"

export function useNotificaciones(usuarioId?: string) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!usuarioId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = escucharDocumentos<Notificacion>(
      "notificaciones",
      [where("usuarioId", "==", usuarioId)],
      (data) => {
        data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        setNotificaciones(data)
        setNoLeidas(data.filter((n) => !n.leido).length)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [usuarioId])

  return { notificaciones, noLeidas, loading, setNotificaciones }
}
