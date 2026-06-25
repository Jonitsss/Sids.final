"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, CheckCircle2, XCircle, Clock, Users, MessageSquare, AlertCircle } from "lucide-react"
import { AsistenciaSkeleton } from "@/components/skeletons"
import { useCronogramas } from "@/hooks/useCronogramas"
import { useEventos } from "@/hooks/useEventos"
import { useAsistencias } from "@/hooks/useAsistencias"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { crearDocumento, actualizarDocumento, obtenerDocumentos, where } from "@/lib/firestore"
import { Asistencia } from "@/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

const ESTADO_LABEL: Record<string, string> = {
  confirmado: "Confirmado",
  rechazado: "Rechazado",
  pendiente: "Pendiente",
}

const ASISTENCIA_LABEL: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
  justificado: "Justificado",
}

export default function AsistenciaPage() {
  const { user, userData } = useAuth()
  const { cronogramas, loading: loadingCrono } = useCronogramas()
  const { eventos, loading: loadingEv } = useEventos()
  const { asistencias, loading: loadingAsist } = useAsistencias()
  const { ministerios, usuarios, usuariosLoading } = useDashboardStore()
  const [justificaciones, setJustificaciones] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})

  const upcoming = cronogramas
    .filter((g) => g.asignaciones.length > 0)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  const misAsignaciones = cronogramas
    .filter((g) => g.asignaciones.some((a) => a.usuarioId === user?.uid && a.estado === "confirmado"))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  const getAsistencia = (eventoId: string) => {
    return asistencias.find((a) => a.eventoId === eventoId && a.usuarioId === user?.uid)
  }

  const handleMarcarAsistencia = async (eventoId: string, estado: "presente" | "ausente" | "justificado") => {
    if (!user?.uid) return

    const evento = eventos.find((e) => e.id === eventoId)
    if (!evento) return

    const key = `${eventoId}-${estado}`
    setGuardando((prev) => ({ ...prev, [key]: true }))

    try {
      const existente = await obtenerDocumentos<Asistencia>("asistencias", [
        where("eventoId", "==", eventoId),
        where("usuarioId", "==", user.uid),
      ])

      const justificacion = justificaciones[eventoId] || ""

      if (existente.length > 0) {
        await actualizarDocumento("asistencias", existente[0].id, {
          estado,
          justificacion,
        })
        toast.success("Asistencia actualizada")
      } else {
        await crearDocumento<Asistencia>("asistencias", {
          eventoId,
          usuarioId: user.uid,
          estado,
          justificacion,
          fecha: evento.fecha,
          registradoPor: user.uid,
        })
        toast.success("Asistencia registrada")
      }
    } catch (error) {
      toast.error("Error al registrar asistencia")
    } finally {
      setGuardando((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loadingCrono || loadingEv || usuariosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Asistencia</h1>
            <p className="text-muted-foreground">Gestión de asistencia a eventos</p>
          </div>
        </div>
        <AsistenciaSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground">Gestión de asistencia a eventos</p>
        </div>
      </div>

      <Tabs defaultValue="mi-asistencia" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mi-asistencia">Mi Asistencia</TabsTrigger>
          <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="mi-asistencia" className="space-y-4">
          {misAsignaciones.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No tenés asignaciones confirmadas</p>
                <p className="text-sm">Cuando confirmes una asignación en un cronograma, podrás registrar tu asistencia acá.</p>
              </CardContent>
            </Card>
          ) : (
            misAsignaciones.map((g) => {
              const evento = eventos.find((e) => e.id === g.eventoId)
              const miAsignacion = g.asignaciones.find((a) => a.usuarioId === user?.uid && a.estado === "confirmado")
              const ministerio = miAsignacion ? ministerios.find((m) => m.id === miAsignacion.ministerioId) : null
              const asistenciaExistente = getAsistencia(g.eventoId)

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
                        {ministerio && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Asignado a: <span className="font-medium">{ministerio.nombre}</span> — {miAsignacion?.rol}
                          </p>
                        )}
                      </div>
                      {asistenciaExistente && (
                        <Badge
                          variant="outline"
                          className={
                            asistenciaExistente.estado === "presente"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                              : asistenciaExistente.estado === "ausente"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                          }
                        >
                          {ASISTENCIA_LABEL[asistenciaExistente.estado]}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={asistenciaExistente?.estado === "presente" ? "default" : "outline"}
                        onClick={() => handleMarcarAsistencia(g.eventoId, "presente")}
                        disabled={guardando[`${g.eventoId}-presente`]}
                        className={asistenciaExistente?.estado === "presente" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Presente
                      </Button>
                      <Button
                        size="sm"
                        variant={asistenciaExistente?.estado === "ausente" ? "destructive" : "outline"}
                        onClick={() => handleMarcarAsistencia(g.eventoId, "ausente")}
                        disabled={guardando[`${g.eventoId}-ausente`]}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Ausente
                      </Button>
                      <Button
                        size="sm"
                        variant={asistenciaExistente?.estado === "justificado" ? "secondary" : "outline"}
                        onClick={() => handleMarcarAsistencia(g.eventoId, "justificado")}
                        disabled={guardando[`${g.eventoId}-justificado`]}
                        className={asistenciaExistente?.estado === "justificado" ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Justificado
                      </Button>
                    </div>

                    {asistenciaExistente?.estado === "ausente" && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Justificación:</p>
                            <p className="text-sm">{asistenciaExistente.justificacion || "Sin justificación"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {asistenciaExistente?.estado === "justificado" && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Justificación:</p>
                            <p className="text-sm">{asistenciaExistente.justificacion || "Sin justificación"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(!asistenciaExistente || asistenciaExistente.estado === "ausente" || asistenciaExistente.estado === "justificado") && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder={asistenciaExistente?.estado === "ausente" ? "Motivo de ausencia..." : "Motivo de justificación..."}
                          value={justificaciones[g.eventoId] || asistenciaExistente?.justificacion || ""}
                          onChange={(e) => setJustificaciones((prev) => ({ ...prev, [g.eventoId]: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="asignaciones" className="space-y-4">
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No hay grillas de servicio</p>
                <p className="text-sm">Creá cronogramas con asignaciones para ver las confirmaciones acá.</p>
              </CardContent>
            </Card>
          ) : (
            upcoming.map((g) => {
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
                            <div key={i}>
                              <div className="flex items-center gap-3 p-2 rounded-lg border">
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
                              {a.estado === "rechazado" && a.justificacionRechazo && (
                                <div className="flex items-start gap-2 mt-1 ml-7">
                                  <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                                  <p className="text-xs text-muted-foreground italic">{a.justificacionRechazo}</p>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
