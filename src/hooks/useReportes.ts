"use client"

import { useState, useEffect } from "react"
import { Evento, Usuario, Asistencia, Ministerio } from "@/types"
import { obtenerDocumentos, where, orderBy } from "@/lib/firestore"

export interface ReportesData {
  stats: {
    asistenciaPromedio: number
    totalColaboradores: number
    eventosDelMes: number
    bajaAsistencia: number
  }
  asistenciaMensual: {
    mes: string
    presente: number
    ausente: number
    justificado: number
  }[]
  porMinisterio: {
    ministerioId: string
    ministerioNombre: string
    ministerioColor: string
    miembros: number
    presente: number
    ausente: number
    total: number
  }[]
  ranking: {
    usuarioId: string
    nombre: string
    apellido: string
    fotoURL: string
    total: number
    presente: number
    porcentaje: number
  }[]
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function formatMes(d: Date): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

export function useReportes() {
  const [data, setData] = useState<ReportesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [usuarios, eventos, asistencias, ministerios] = await Promise.all([
          obtenerDocumentos<Usuario>("usuarios", [where("activo", "==", true)]),
          obtenerDocumentos<Evento>("eventos", []),
          obtenerDocumentos<Asistencia>("asistencias", []),
          obtenerDocumentos<Ministerio>("ministerios", [where("activo", "==", true)]),
        ])

        const ahora = new Date()
        const inicioMes = startOfMonth(ahora)
        const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)

        const eventosDelMes = eventos.filter((e) => {
          const f = new Date(e.fecha)
          return f >= inicioMes && f <= finMes
        })

        const asistenciasDelMes = asistencias.filter((a) => {
          const f = new Date(a.fecha)
          return f >= inicioMes && f <= finMes
        })

        const totalAsistencias = asistenciasDelMes.length
        const presentes = asistenciasDelMes.filter((a) => a.estado === "presente").length
        const asistenciaPromedio = totalAsistencias > 0 ? Math.round((presentes / totalAsistencias) * 100) : 0

        const usuarioAsistenciaMap: Record<string, { total: number; presente: number }> = {}
        for (const a of asistenciasDelMes) {
          if (!usuarioAsistenciaMap[a.usuarioId]) usuarioAsistenciaMap[a.usuarioId] = { total: 0, presente: 0 }
          usuarioAsistenciaMap[a.usuarioId].total++
          if (a.estado === "presente") usuarioAsistenciaMap[a.usuarioId].presente++
        }

        const bajaAsistencia = Object.values(usuarioAsistenciaMap).filter(
          (u) => u.total > 0 && (u.presente / u.total) < 0.5
        ).length

        const ultimos6Meses: Date[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
          ultimos6Meses.push(d)
        }

        const asistenciaMensual = ultimos6Meses.map((inicio) => {
          const fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0)
          const mesAsistencias = asistencias.filter((a) => {
            const f = new Date(a.fecha)
            return f >= inicio && f <= fin
          })
          return {
            mes: formatMes(inicio),
            presente: mesAsistencias.filter((a) => a.estado === "presente").length,
            ausente: mesAsistencias.filter((a) => a.estado === "ausente").length,
            justificado: mesAsistencias.filter((a) => a.estado === "justificado").length,
          }
        })

        const usuarioMap: Record<string, Usuario> = {}
        for (const u of usuarios) usuarioMap[u.id] = u

        const ministerioMap: Record<string, Ministerio> = {}
        for (const m of ministerios) ministerioMap[m.id] = m

        const porMinisterio = ministerios.map((m) => {
          const miembrosIds = usuarios
            .filter((u) => (u.ministerioIds || []).includes(m.id))
            .map((u) => u.id)

          const presenteCount = asistenciasDelMes.filter(
            (a) => miembrosIds.includes(a.usuarioId) && a.estado === "presente"
          ).length

          const ausenteCount = asistenciasDelMes.filter(
            (a) => miembrosIds.includes(a.usuarioId) && a.estado === "ausente"
          ).length

          return {
            ministerioId: m.id,
            ministerioNombre: m.nombre,
            ministerioColor: m.color,
            miembros: miembrosIds.length,
            presente: presenteCount,
            ausente: ausenteCount,
            total: presenteCount + ausenteCount,
          }
        })

        const ranking = Object.entries(usuarioAsistenciaMap)
          .map(([usuarioId, stats]) => {
            const u = usuarioMap[usuarioId]
            return {
              usuarioId,
              nombre: u?.nombre || "Desconocido",
              apellido: u?.apellido || "",
              fotoURL: u?.fotoURL || "",
              total: stats.total,
              presente: stats.presente,
              porcentaje: stats.total > 0 ? Math.round((stats.presente / stats.total) * 100) : 0,
            }
          })
          .sort((a, b) => b.porcentaje - a.porcentaje)
          .slice(0, 20)

        if (mounted) {
          setData({
            stats: {
              asistenciaPromedio,
              totalColaboradores: usuarios.length,
              eventosDelMes: eventosDelMes.length,
              bajaAsistencia,
            },
            asistenciaMensual,
            porMinisterio,
            ranking,
          })
        }
      } catch (error) {
        if (mounted) console.error("Error fetching reportes:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { data, loading }
}
