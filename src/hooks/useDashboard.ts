"use client"

import { useState, useEffect } from "react"
import { Evento, Tarea, Usuario, Ministerio, Asignacion, GrillaServicio, MiembroIglesia, EscuelaMinisterios } from "@/types"
import { obtenerDocumentos, where, orderBy, limit } from "@/lib/firestore"
import { logger } from "@/lib/logger"
import { useAuth } from "@/contexts/AuthContext"

export interface DashboardData {
  stats: {
    proximasReuniones: number
    tareasPendientes: number
    colaboradores: number
    confirmacionesPendientes: number
    miembrosIglesia: number
    personas: number
    cursosEM: number
    celulares: number
  }
  proximosEventos: Evento[]
  tareasRecientes: Tarea[]
  estadoMinisterios: {
    ministerio: Ministerio
    miembros: number
  }[]
}

export function useDashboard() {
  const { userData } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const ahora = new Date()
        const uid = userData?.authUid || userData?.id

        const [eventos, tareas, usuarios, ministerios, grillas, miembrosIglesia, personas, cursosEM, celulares] = await Promise.all([
          obtenerDocumentos<Evento>("eventos", [
            where("fecha", ">=", ahora),
            orderBy("fecha", "asc"),
            limit(5),
          ]),
          obtenerDocumentos<Tarea>("tareas", [
            orderBy("fechaLimite", "asc"),
            limit(5),
          ]),
          obtenerDocumentos<Usuario>("usuarios", [where("activo", "==", true)]),
          obtenerDocumentos<Ministerio>("ministerios", [where("activo", "==", true)]),
          uid ? obtenerDocumentos<GrillaServicio>("cronogramas", [where("fecha", ">=", ahora)]) : Promise.resolve([] as GrillaServicio[]),
          obtenerDocumentos<MiembroIglesia>("miembros-iglesia").catch(() => []),
          obtenerDocumentos<any>("personas").catch(() => []),
          obtenerDocumentos<EscuelaMinisterios>("escuela-ministerios").catch(() => []),
          obtenerDocumentos<any>("celulares").catch(() => []),
        ])

        const proximosEventos = eventos
        const tareasRecientes = tareas.filter((t) => t.estado !== "completada").slice(0, 5)

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

        let totalAsignaciones = 0
        if (uid && grillas.length > 0) {
          for (const g of grillas) {
            totalAsignaciones += g.asignaciones?.filter((a) => a.usuarioId === uid).length || 0
          }
        }

        if (mounted) {
          setData({
            stats: {
              proximasReuniones: proximosEventos.length,
              tareasPendientes: tareasRecientes.length,
              colaboradores: usuarios.length,
              confirmacionesPendientes: totalAsignaciones,
              miembrosIglesia: miembrosIglesia.length,
              personas: personas.length,
              cursosEM: cursosEM.length,
              celulares: celulares.length,
            },
            proximosEventos,
            tareasRecientes,
            estadoMinisterios,
          })
        }
      } catch (error) {
        if (mounted) logger.error("Error fetching dashboard", error instanceof Error ? error : undefined)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [userData?.authUid, userData?.id])

  return { data, loading }
}
