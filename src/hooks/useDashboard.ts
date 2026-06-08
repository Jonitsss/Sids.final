"use client"

import { useState, useEffect } from "react"
import { Evento, Tarea, Usuario, Ministerio, Asignacion } from "@/types"
import { obtenerDocumentos, where, orderBy } from "@/lib/firestore"

export interface DashboardData {
  stats: {
    proximasReuniones: number
    tareasPendientes: number
    colaboradores: number
    confirmacionesPendientes: number
  }
  proximosEventos: Evento[]
  tareasRecientes: Tarea[]
  estadoMinisterios: {
    ministerio: Ministerio
    miembros: number
  }[]
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [eventos, tareas, usuarios, ministerios] = await Promise.all([
          obtenerDocumentos<Evento>("eventos", [orderBy("fecha", "asc")]),
          obtenerDocumentos<Tarea>("tareas", []),
          obtenerDocumentos<Usuario>("usuarios", [where("activo", "==", true)]),
          obtenerDocumentos<Ministerio>("ministerios", [where("activo", "==", true)]),
        ])

        const ahora = new Date()

        const proximosEventos = eventos
          .filter((e) => e.fecha >= ahora)
          .slice(0, 5)

        const tareasRecientes = tareas
          .filter((t) => t.estado !== "completada")
          .sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
          .slice(0, 5)

        const miembroCount: Record<string, number> = {}
        for (const u of usuarios) {
          for (const mid of u.ministerioIds || []) {
            miembroCount[mid] = (miembroCount[mid] || 0) + 1
          }
        }

        const estadoMinisterios = ministerios.map((m) => ({
          ministerio: m,
          miembros: miembroCount[m.id] || 0,
        }))

        if (mounted) {
          setData({
            stats: {
              proximasReuniones: proximosEventos.length,
              tareasPendientes: tareas.filter((t) => t.estado !== "completada").length,
              colaboradores: usuarios.length,
              confirmacionesPendientes: 0,
            },
            proximosEventos,
            tareasRecientes,
            estadoMinisterios,
          })
        }
      } catch (error) {
        if (mounted) console.error("Error fetching dashboard:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { data, loading }
}
