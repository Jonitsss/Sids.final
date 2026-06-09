"use client"

import { useState, useEffect } from "react"
import { Consulta } from "@/types"
import { escucharDocumentos, where, orderBy } from "@/lib/firestore"

export function useConsultas(usuarioId?: string, rol?: string) {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)

  const esPastorOAdmin = rol === "pastor" || rol === "administrador"

  useEffect(() => {
    if (!usuarioId) {
      setLoading(false)
      return
    }
    setLoading(true)

    if (esPastorOAdmin) {
      const unsub = escucharDocumentos<Consulta>(
        "consultas",
        [orderBy("createdAt", "desc")],
        (data) => {
          setConsultas(data)
          setLoading(false)
        }
      )
      return () => unsub()
    }

    let mounted = true
    let unsubs: (() => void)[] = []

    const sentUnsub = escucharDocumentos<Consulta>(
      "consultas",
      [where("de", "==", usuarioId)],
      (sent) => {
        if (!mounted) return
        const received = consultas.filter((t) => t.a === usuarioId)
        const combined = [...sent, ...received].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        setConsultas(combined)
        setLoading(false)
      }
    )

    const receivedUnsub = escucharDocumentos<Consulta>(
      "consultas",
      [where("a", "==", usuarioId)],
      (received) => {
        if (!mounted) return
        const sent = consultas.filter((t) => t.de === usuarioId)
        const combined = [...sent, ...received].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        setConsultas(combined)
        setLoading(false)
      }
    )

    unsubs = [sentUnsub, receivedUnsub]

    return () => {
      mounted = false
      unsubs.forEach((u) => u())
    }
  }, [usuarioId, rol])

  const consultasEntrantes = consultas.filter((t) => t.a === usuarioId)
  const consultasSalientes = consultas.filter((t) => t.de === usuarioId)
  const noLeidas = consultasEntrantes.filter((t) => !t.leidoPorDestinatario).length

  return { consultas, loading, consultasEntrantes, consultasSalientes, noLeidas, setConsultas }
}
