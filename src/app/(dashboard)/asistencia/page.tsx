"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarDays, CheckCircle2, XCircle, Clock, Users } from "lucide-react"
import { AsistenciaSkeleton } from "@/components/skeletons"
import { useCronogramas } from "@/hooks/useCronogramas"
import { useEventos } from "@/hooks/useEventos"
import { useMinisterios } from "@/hooks/useMinisterios"
import { useAuth } from "@/contexts/AuthContext"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { isFuture } from "date-fns"
import { useEffect, useState } from "react"
import { obtenerDocumentos } from "@/lib/firestore"
import { Usuario } from "@/types"

const ESTADO_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  rechazado: "Rechazado",
  pendiente: "Pendiente",
}

export default function AsistenciaPage() {
  const { userData } = useAuth()
  const { cronogramas, loading: loadingCrono } = useCronogramas()
  const { eventos, loading: loadingEv } = useEventos()
  const { ministerios } = useMinisterios()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingU, setLoadingU] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await obtenerDocumentos<Usuario>("usuarios")
        if (mounted) setUsuarios(data)
      } catch {
        // ignore
      } finally {
        if (mounted) setLoadingU(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const upcoming = cronogramas
    .filter((g) => isFuture(g.fecha) || g.asignaciones.length > 0)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  if (loadingCrono || loadingEv || loadingU) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asistencia</h1>
            <p className="text-muted-foreground">Panel de confirmaciones del Pastor</p>
          </div>
        </div>
        <AsistenciaSkeleton />
      </div>
    )
  }

  if (cronogramas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asistencia</h1>
            <p className="text-muted-foreground">Panel de confirmaciones del Pastor</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay grillas de servicio</p>
            <p className="text-sm">Creá cronogramas con asignaciones para ver las confirmaciones acá.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground">Panel de confirmaciones del Pastor</p>
        </div>
      </div>

      <div className="space-y-6">
        {upcoming.map((g) => {
          const evento = eventos.find((e) => e.id === g.eventoId)
          const confirmados = g.asignaciones.filter((a) => a.estado === "confirmado").length
          const pendientes = g.asignaciones.filter((a) => a.estado === "pendiente").length
          const rechazados = g.asignaciones.filter((a) => a.estado === "rechazado").length

          return (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{evento ? evento.titulo : <span className="text-muted-foreground/50">Evento eliminado</span>}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(g.fecha, "EEEE d MMMM yyyy", { locale: es })}
                      {evento?.horaInicio && <span>— {evento.horaInicio}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-600/20 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {confirmados}
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 border-0">
                      <Clock className="h-3 w-3 mr-1" />
                      {pendientes}
                    </Badge>
                    <Badge variant="destructive" className="bg-red-600/20 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-0">
                      <XCircle className="h-3 w-3 mr-1" />
                      {rechazados}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {g.asignaciones.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin asignaciones</p>
                  ) : (
                    g.asignaciones.map((a, i) => {
                      const min = ministerios.find((m) => m.id === a.ministerioId)
                      const user = a.usuarioId ? usuarios.find((u) => u.id === a.usuarioId) : null
                      const estadoColor = a.estado === "confirmado"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                        : a.estado === "rechazado"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"

                      return (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                          <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: min?.color || "#888" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {min?.nombre || "Ministerio"} — {a.rol}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {user ? (
                                <>
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[9px]">
                                      {user.nombre?.[0]}{user.apellido?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">
                                    {user.nombre} {user.apellido}
                                  </span>
                                </>
                              ) : a.esExterno ? (
                                <span className="text-sm text-muted-foreground italic">
                                  {a.nombreExterno || "Externo"}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Sin asignar</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs shrink-0 ${estadoColor}`}>
                            {ESTADO_LABEL[a.estado]}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
