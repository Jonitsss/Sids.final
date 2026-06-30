"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Check, X as XIcon, Calendar, Clock, Filter } from "lucide-react"
import { toast } from "sonner"
import { GrillaServicio, Evento, Ministerio, Asignacion } from "@/types"
import { actualizarDocumento, escucharDocumentos, obtenerDocumento, obtenerDocumentos, enviarNotificacion, where, documentId } from "@/lib/firestore"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { logger } from "@/lib/logger"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ListSkeleton } from "@/components/skeletons"

interface AsignacionConGrilla {
  grillaId: string
  fecha: Date
  evento?: Evento
  ministerio: Ministerio
  asignacion: Asignacion
}

export default function MisAsignacionesPage() {
  const { userData } = useAuth()
  const { ministerios } = useDashboardStore()
  const uid = userData?.authUid || userData?.id

  const [grillas, setGrillas] = useState<GrillaServicio[]>([])
  const [eventos, setEventos] = useState<Record<string, Evento>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "confirmadas" | "rechazadas">("todas")
  const [modalRechazo, setModalRechazo] = useState<{ grillaId: string; ministerioId: string; rol: string } | null>(null)
  const [justificacion, setJustificacion] = useState("")

  useEffect(() => {
    if (!uid) { setLoading(false); return }

    const unsub = escucharDocumentos<GrillaServicio>("cronogramas", [], (docs) => {
      const conAsignaciones = docs.filter((g) =>
        g.asignaciones?.some((a) => a.usuarioId === uid)
      )
      setGrillas(conAsignaciones)
      setLoading(false)
    })

    return () => unsub()
  }, [uid])

  useEffect(() => {
    const eventoIds = [...new Set(grillas.map((g) => g.eventoId).filter(Boolean))]
    if (eventoIds.length === 0) return

    const cargarEventos = async () => {
      try {
        const evs = await escucharDocumentos<Evento>("eventos", [where(documentId(), "in", eventoIds)], (docs) => {
          const map: Record<string, Evento> = {}
          docs.forEach((ev) => { map[ev.id] = ev })
          setEventos(map)
        })
      } catch (error) {
        logger.error("Error loading eventos", error instanceof Error ? error : undefined)
      }
    }
    cargarEventos()
  }, [grillas])

  const asignaciones = useMemo(() => {
    const result: AsignacionConGrilla[] = []
    for (const g of grillas) {
      const userAsignaciones = g.asignaciones?.filter((a) => a.usuarioId === uid) || []
      for (const asig of userAsignaciones) {
        const min = ministerios.find((m) => m.id === asig.ministerioId)
        if (min) {
          result.push({
            grillaId: g.id,
            fecha: g.fecha,
            evento: g.eventoId ? eventos[g.eventoId] : undefined,
            ministerio: min,
            asignacion: asig,
          })
        }
      }
    }
    return result.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [grillas, uid, ministerios, eventos])

  const asignacionesFiltradas = useMemo(() => {
    if (filtro === "todas") return asignaciones
    if (filtro === "pendientes") return asignaciones.filter((a) => a.asignacion.estado === "pendiente")
    if (filtro === "confirmadas") return asignaciones.filter((a) => a.asignacion.estado === "confirmado")
    if (filtro === "rechazadas") return asignaciones.filter((a) => a.asignacion.estado === "rechazado")
    return asignaciones
  }, [asignaciones, filtro])

  const stats = useMemo(() => ({
    total: asignaciones.length,
    pendientes: asignaciones.filter((a) => a.asignacion.estado === "pendiente").length,
    confirmadas: asignaciones.filter((a) => a.asignacion.estado === "confirmado").length,
    rechazadas: asignaciones.filter((a) => a.asignacion.estado === "rechazado").length,
  }), [asignaciones])

  const handleAceptar = async (grillaId: string, ministerioId: string, rol: string) => {
    if (!uid) return
    setSaving(true)
    try {
      const grilla = grillas.find((g) => g.id === grillaId)
      if (!grilla) return

      const nuevasAsignaciones = grilla.asignaciones.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol && a.usuarioId === uid
          ? { ...a, estado: "confirmado" as const }
          : a
      )

      await actualizarDocumento("cronogramas", grillaId, { asignaciones: nuevasAsignaciones })

      setGrillas((prev) =>
        prev.map((g) =>
          g.id === grillaId ? { ...g, asignaciones: nuevasAsignaciones } : g
        )
      )

      const referenciaId = `asignacion:${grillaId}:${ministerioId}:${rol}`
      const notifs = await obtenerDocumentos<any>("notificaciones", [
        where("usuarioId", "==", uid),
        where("tipo", "==", "asignacion"),
        where("referenciaId", "==", referenciaId),
      ])
      for (const n of notifs) {
        await actualizarDocumento("notificaciones", n.id, { leido: true, tipo: "confirmacion" })
      }

      const min = ministerios.find((m) => m.id === ministerioId)
      const evento = grilla.eventoId ? eventos[grilla.eventoId] : null
      const fechaStr = format(new Date(grilla.fecha), "dd/MM/yyyy", { locale: es })

      const destinatarios = await obtenerDestinatarios(ministerioId)
      for (const destId of destinatarios) {
        await enviarNotificacion({
          usuarioId: destId,
          titulo: "Asignación confirmada",
          mensaje: `${userData?.nombre} ${userData?.apellido} confirmó la función de "${rol}" en el ministerio ${min?.nombre || ""} para "${evento?.titulo || "evento"}" del ${fechaStr}.`,
          tipo: "confirmacion",
          referenciaId,
        })
      }

      toast.success("Asignación aceptada")
    } catch (error) {
      logger.error("Error al aceptar", error instanceof Error ? error : undefined)
      toast.error("Error al aceptar la asignación")
    } finally {
      setSaving(false)
    }
  }

  const handleRechazar = async () => {
    if (!modalRechazo || !uid || !justificacion.trim()) return
    setSaving(true)
    try {
      const { grillaId, ministerioId, rol } = modalRechazo
      const grilla = grillas.find((g) => g.id === grillaId)
      if (!grilla) return

      const nuevasAsignaciones = grilla.asignaciones.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol && a.usuarioId === uid
          ? { ...a, estado: "rechazado" as const, justificacionRechazo: justificacion.trim() }
          : a
      )

      await actualizarDocumento("cronogramas", grillaId, { asignaciones: nuevasAsignaciones })

      setGrillas((prev) =>
        prev.map((g) =>
          g.id === grillaId ? { ...g, asignaciones: nuevasAsignaciones } : g
        )
      )

      const referenciaId = `asignacion:${grillaId}:${ministerioId}:${rol}`
      const notifs = await obtenerDocumentos<any>("notificaciones", [
        where("usuarioId", "==", uid),
        where("tipo", "==", "asignacion"),
        where("referenciaId", "==", referenciaId),
      ])
      for (const n of notifs) {
        await actualizarDocumento("notificaciones", n.id, { leido: true, tipo: "confirmacion" })
      }

      const min = ministerios.find((m) => m.id === ministerioId)
      const evento = grilla.eventoId ? eventos[grilla.eventoId] : null
      const fechaStr = format(new Date(grilla.fecha), "dd/MM/yyyy", { locale: es })
      const horaStr = evento?.horaInicio ? ` a las ${evento.horaInicio} hs` : ""

      const destinatarios = await obtenerDestinatarios(ministerioId)
      for (const destId of destinatarios) {
        await enviarNotificacion({
          usuarioId: destId,
          titulo: "Asignación rechazada",
          mensaje: `${userData?.nombre} ${userData?.apellido} rechazó la función de "${rol}" en el ministerio ${min?.nombre || ""} para "${evento?.titulo || "evento"}" del ${fechaStr}${horaStr}. Motivo: ${justificacion.trim()}`,
          tipo: "confirmacion",
          referenciaId: `rechazo:${grillaId}:${ministerioId}:${rol}`,
        })
      }

      toast.success("Asignación rechazada")
      setModalRechazo(null)
      setJustificacion("")
    } catch (error) {
      logger.error("Error al rechazar", error instanceof Error ? error : undefined)
      toast.error("Error al rechazar la asignación")
    } finally {
      setSaving(false)
    }
  }

  const obtenerDestinatarios = async (ministerioId: string): Promise<string[]> => {
    const destinatarios = new Set<string>()
    const { obtenerDocumentos } = await import("@/lib/firestore")
    const { where: w, documentId: did } = await import("@/lib/firestore")

    const pastores = await obtenerDocumentos<any>("usuarios", [w("rol", "in", ["pastor", "administrador"])])
    for (const p of pastores) {
      const destId = p.authUid || p.id
      if (destId !== uid) destinatarios.add(destId)
    }

    const ministerio = ministerios.find((m) => m.id === ministerioId)
    if (ministerio?.liderId) {
      const liderDoc = await obtenerDocumento<any>("usuarios", ministerio.liderId)
      if (liderDoc) {
        const liderUid = liderDoc.authUid || liderDoc.id
        if (liderUid !== uid) destinatarios.add(liderUid)
      }
    }

    return Array.from(destinatarios)
  }

  const getEstadoBadge = (estado: Asignacion["estado"]) => {
    switch (estado) {
      case "confirmado":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Confirmado</Badge>
      case "rechazado":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">Rechazado</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0">Pendiente</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mis Asignaciones</h1>
          <p className="text-muted-foreground">Cargando tus asignaciones...</p>
        </div>
        <ListSkeleton count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Asignaciones</h1>
        <p className="text-muted-foreground">Visualizá y gestioná tus asignaciones en las grillas de servicio</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFiltro("todas")}>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${filtro === "pendientes" ? "border-yellow-500 bg-yellow-500/5" : "hover:border-yellow-500/50"}`} onClick={() => setFiltro(filtro === "pendientes" ? "todas" : "pendientes")}>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${filtro === "confirmadas" ? "border-green-500 bg-green-500/5" : "hover:border-green-500/50"}`} onClick={() => setFiltro(filtro === "confirmadas" ? "todas" : "confirmadas")}>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.confirmadas}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${filtro === "rechazadas" ? "border-red-500 bg-red-500/5" : "hover:border-red-500/50"}`} onClick={() => setFiltro(filtro === "rechazadas" ? "todas" : "rechazadas")}>
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.rechazadas}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Rechazadas</p>
          </CardContent>
        </Card>
      </div>

      {asignacionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">
              {filtro === "todas" ? "No tenés asignaciones" : `No hay asignaciones ${filtro}`}
            </p>
            <p className="text-sm">
              {filtro === "todas"
                ? "Cuando te asignen en una grilla de servicio, aparecerán acá"
                : "Probá con otro filtro"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {asignacionesFiltradas.map((item, idx) => (
            <Card key={`${item.grillaId}-${item.asignacion.rol}-${idx}`} className="border-l-4" style={{ borderLeftColor: item.ministerio.color }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                    <AvatarFallback style={{ backgroundColor: `${item.ministerio.color}20`, color: item.ministerio.color }}>
                      {item.ministerio.nombre.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm sm:text-base font-medium">{item.asignacion.rol}</p>
                      <span className="text-muted-foreground text-xs sm:text-sm">en</span>
                      <p className="text-sm sm:text-base font-medium">{item.ministerio.nombre}</p>
                      {getEstadoBadge(item.asignacion.estado)}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.fecha), "EEEE d 'de' MMMM yyyy", { locale: es })}
                      </span>
                      {item.evento && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.evento.titulo}
                          {item.evento.horaInicio && ` - ${item.evento.horaInicio}`}
                        </span>
                      )}
                    </div>
                    {item.asignacion.estado === "rechazado" && item.asignacion.justificacionRechazo && (
                      <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 italic">
                        Motivo: {item.asignacion.justificacionRechazo}
                      </p>
                    )}
                    {item.asignacion.estado === "pendiente" && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-3">
                        <Button
                          size="sm"
                          className="h-7 sm:h-8 gap-1 text-xs"
                          onClick={() => handleAceptar(item.grillaId, item.asignacion.ministerioId, item.asignacion.rol)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 sm:h-8 gap-1 text-xs text-destructive border-destructive/30 hover:text-destructive"
                          onClick={() => {
                            setModalRechazo({
                              grillaId: item.grillaId,
                              ministerioId: item.asignacion.ministerioId,
                              rol: item.asignacion.rol,
                            })
                            setJustificacion("")
                          }}
                          disabled={saving}
                        >
                          <XIcon className="h-3 w-3" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!modalRechazo} onOpenChange={(open) => { if (!open) { setModalRechazo(null); setJustificacion("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rechazar asignación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Justificación</Label>
              <Textarea
                placeholder="Explicá el motivo por el cual rechazás esta asignación..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Esta justificación será enviada al Pastor, Administrador y Líder del ministerio.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalRechazo(null); setJustificacion("") }} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={saving || !justificacion.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}