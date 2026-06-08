"use client"

import { useState, useEffect, useCallback } from "react"
import { Ticket } from "@/types"
import { obtenerDocumentos, where, orderBy } from "@/lib/firestore"

export function useTickets(usuarioId?: string, rol?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const esPastorOAdmin = rol === "pastor" || rol === "administrador"

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!usuarioId) {
        if (mounted) setLoading(false)
        return
      }
      try {
        if (esPastorOAdmin) {
          const data = await obtenerDocumentos<Ticket>("tickets", [orderBy("createdAt", "desc")])
          if (mounted) setTickets(data)
        } else {
          const [sent, received] = await Promise.all([
            obtenerDocumentos<Ticket>("tickets", [where("de", "==", usuarioId)]),
            obtenerDocumentos<Ticket>("tickets", [where("a", "==", usuarioId)]),
          ])
          const combined = [...sent, ...received].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )
          if (mounted) setTickets(combined)
        }
      } catch (error) {
        if (mounted) console.error("Error fetching tickets:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [usuarioId, rol, refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  const ticketsEntrantes = tickets.filter((t) => t.a === usuarioId)
  const ticketsSalientes = tickets.filter((t) => t.de === usuarioId)
  const noLeidos = ticketsEntrantes.filter((t) => !t.leidoPorDestinatario).length

  return { tickets, loading, refetch, setTickets, ticketsEntrantes, ticketsSalientes, noLeidos }
}
