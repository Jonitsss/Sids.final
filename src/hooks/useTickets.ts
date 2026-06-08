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
        let constraints: any[] = [orderBy("createdAt", "desc")]
        if (!esPastorOAdmin) {
          constraints.push(where("de", "==", usuarioId))
        }
        const data = await obtenerDocumentos<Ticket>("tickets", constraints)
        if (mounted) setTickets(data)
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
