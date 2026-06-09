"use client"

import { useState, useEffect, useCallback } from "react"
import { Ticket } from "@/types"
import { escucharDocumentos, where, orderBy } from "@/lib/firestore"

export function useTickets(usuarioId?: string, rol?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const esPastorOAdmin = rol === "pastor" || rol === "administrador"

  useEffect(() => {
    if (!usuarioId) {
      setLoading(false)
      return
    }
    setLoading(true)

    if (esPastorOAdmin) {
      const unsub = escucharDocumentos<Ticket>(
        "tickets",
        [orderBy("createdAt", "desc")],
        (data) => {
          setTickets(data)
          setLoading(false)
        }
      )
      return () => unsub()
    }

    let mounted = true
    let unsubs: (() => void)[] = []

    const sentUnsub = escucharDocumentos<Ticket>(
      "tickets",
      [where("de", "==", usuarioId)],
      (sent) => {
        if (!mounted) return
        const received = tickets.filter((t) => t.a === usuarioId)
        const combined = [...sent, ...received].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        setTickets(combined)
        setLoading(false)
      }
    )

    const receivedUnsub = escucharDocumentos<Ticket>(
      "tickets",
      [where("a", "==", usuarioId)],
      (received) => {
        if (!mounted) return
        const sent = tickets.filter((t) => t.de === usuarioId)
        const combined = [...sent, ...received].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        setTickets(combined)
        setLoading(false)
      }
    )

    unsubs = [sentUnsub, receivedUnsub]

    return () => {
      mounted = false
      unsubs.forEach((u) => u())
    }
  }, [usuarioId, rol])

  const ticketsEntrantes = tickets.filter((t) => t.a === usuarioId)
  const ticketsSalientes = tickets.filter((t) => t.de === usuarioId)
  const noLeidos = ticketsEntrantes.filter((t) => !t.leidoPorDestinatario).length

  return { tickets, loading, ticketsEntrantes, ticketsSalientes, noLeidos, setTickets }
}
