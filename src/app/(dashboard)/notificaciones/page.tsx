"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Check, X, Loader2, Clock, Trash2 } from "lucide-react"
import { ListSkeleton } from "@/components/skeletons"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"
import { actualizarDocumento, obtenerDocumento, crearDocumento, obtenerDocumentos, eliminarDocumento, where, enviarNotificacion, documentId } from "@/lib/firestore"
import { GrillaServicio, Usuario, Evento } from "@/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function NotificacionesPage() {
  const { user, userData } = useAuth()
  const { notificaciones, noLeidas, notificacionesLoading, ministerios, ministeriosLoading, setNotificaciones } = useDashboardStore()
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [fechasGrilla, setFechasGrilla] = useState<Record<string, string>>({})
  const [eventosGrilla, setEventosGrilla] = useState<Record<string, string>>({})
  const cleaned = useRef(false)

  useEffect(() => {
    const gridIds = new Set<string>()
    notificaciones.forEach((n) => {
      if (n.referenciaId?.startsWith("asignacion:")) {
        const parts = n.referenciaId.split(":")
        if (parts.length >= 2) gridIds.add(parts[1])
      }
    })
    if (gridIds.size === 0) return
    ;(async () => {
      const ids = [...gridIds]
      const grillas = await obtenerDocumentos<GrillaServicio>("cronogramas", [
        where(documentId(), "in", ids),
      ])
      const fechas: Record<string, string> = {}
      const eventoIds = new Set<string>()
      const grillaByEventoId = new Map<string, string>()
      for (const g of grillas) {
        if (g.fecha) fechas[g.id] = format(new Date(g.fecha), "d 'de' MMMM", { locale: es })
        if (g.eventoId) {
          eventoIds.add(g.eventoId)
          grillaByEventoId.set(g.eventoId, g.id)
        }
      }
      const eventos = await obtenerDocumentos<Evento>("eventos", [
        where(documentId(), "in", [...eventoIds]),
      ])
      const eventoTitulos: Record<string, string> = {}
      for (const ev of eventos) {
        if (ev.titulo) {
          const grillaId = grillaByEventoId.get(ev.id)
          if (grillaId) eventoTitulos[grillaId] = ev.titulo
        }
      }
      setFechasGrilla((prev) => ({ ...prev, ...fechas }))
      setEventosGrilla((prev) => ({ ...prev, ...eventoTitulos }))
    })()
  }, [notificaciones])

  useEffect(() => {
    if (cleaned.current || notificacionesLoading || ministeriosLoading) return
    ;(async () => {
      cleaned.current = true
      const ids = new Set(ministerios.map((m) => m.id))
      for (const n of notificaciones) {
        if (n.tipo === "ministerio" && !ids.has(n.referenciaId)) {
          await eliminarDocumento("notificaciones", n.id)
          setNotificaciones((prev) => prev.filter((p) => p.id !== n.id))
        }
      }
    })()
  }, [notificacionesLoading, ministeriosLoading, ministerios, notificaciones, setNotificaciones])

  const handleResponder = async (notifId: string, accion: "confirmado" | "rechazado") => {
    const notif = notificaciones.find((n) => n.id === notifId)
    if (!notif || !notif.referenciaId.startsWith("asignacion:")) return

    setRespondiendo(notifId)
    try {
      const parts = notif.referenciaId.split(":")
      const grillaId = parts[1]
      const ministerioId = parts[2]
      const rol = parts[3]

      const grilla = await obtenerDocumento<GrillaServicio>("cronogramas", grillaId)
      if (!grilla) { toast.error("La grilla ya no existe"); return }
      const fechaStr = format(new Date(grilla.fecha), "dd/MM/yyyy", { locale: es })

      const nuevas = grilla.asignaciones.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol
          ? { ...a, estado: accion }
          : a
      )

      await actualizarDocumento("cronogramas", grillaId, { asignaciones: nuevas })
      await actualizarDocumento("notificaciones", notifId, {
        leido: true,
        tipo: accion === "confirmado" ? "confirmacion" : "asignacion",
      })

      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id === notifId ? { ...n, leido: true } : n
        )
      )

      const ministerioNombre = ministerios.find((m) => m.id === ministerioId)?.nombre || ""
      const eventoDoc = await obtenerDocumento<Evento>("eventos", grilla.eventoId)
      const eventoTitulo = eventoDoc?.titulo || ""
      const horaStr = eventoDoc?.horaInicio ? ` a las ${eventoDoc.horaInicio} hs` : ""

      const pastores = await obtenerDocumentos<Usuario>("usuarios", [
        where("rol", "==", "pastor"),
      ])
      for (const p of pastores) {
        const destId = (p as any).authUid || p.id
        if (destId === user?.uid) continue
        const nombre = userData?.nombre || "Alguien"
        const apellido = userData?.apellido || ""
        await enviarNotificacion({
          usuarioId: destId,
          titulo: accion === "confirmado" ? "Asignación confirmada" : "Asignación rechazada",
          mensaje: `${nombre} ${apellido} ${accion === "confirmado" ? "confirmó" : "rechazó"} la función de "${rol}" en el ministerio ${ministerioNombre} para "${eventoTitulo}" del ${fechaStr}${horaStr}.`,
          tipo: "confirmacion",
          referenciaId: notif.referenciaId,
        })
      }

      toast.success(accion === "confirmado" ? "Asistencia confirmada" : "Asignación rechazada")
    } catch {
      toast.error("Error al responder")
    } finally {
      setRespondiendo(null)
    }
  }

  const handleMarcarLeido = async (notifId: string) => {
    try {
      await actualizarDocumento("notificaciones", notifId, { leido: true })
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, leido: true } : n))
      )
    } catch {
      toast.error("Error al marcar como leída")
    }
  }

  const handleEliminarNotificacion = async (notifId: string) => {
    const eliminada = notificaciones.find((n) => n.id === notifId)
    setNotificaciones((prev) => prev.filter((n) => n.id !== notifId))
    try {
      await eliminarDocumento("notificaciones", notifId)
    } catch {
      if (eliminada) setNotificaciones((prev) => [...prev, eliminada])
      toast.error("Error al eliminar notificación")
    }
  }

  const handleEliminarLeidas = async () => {
    const anterior = notificaciones
    const ids = anterior.filter((n) => n.leido).map((n) => n.id)
    if (ids.length === 0) return
    setNotificaciones((prev) => prev.filter((n) => !n.leido))
    try {
      await Promise.all(ids.map((id) => eliminarDocumento("notificaciones", id)))
      toast.success(`${ids.length} notificación${ids.length > 1 ? "es" : ""} eliminada${ids.length > 1 ? "s" : ""}`)
    } catch {
      setNotificaciones(anterior)
      toast.error("Error al eliminar notificaciones")
    }
  }

  const handleMarcarTodasLeidas = async () => {
    const ids = notificaciones.filter((n) => !n.leido).map((n) => n.id)
    if (ids.length === 0) return
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })))
    try {
      await Promise.all(ids.map((id) => actualizarDocumento("notificaciones", id, { leido: true })))
      toast.success(`${ids.length} notificación${ids.length > 1 ? "es" : ""} marcada${ids.length > 1 ? "s" : ""} como leída${ids.length > 1 ? "s" : ""}`)
    } catch {
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: !ids.includes(n.id) ? n.leido : false })))
      toast.error("Error al marcar como leídas")
    }
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">
            {noLeidas > 0
              ? `Tenés ${noLeidas} notificación${noLeidas > 1 ? "es" : ""} sin leer`
              : "No tenés notificaciones pendientes"}
          </p>
        </div>
        <div className="flex gap-2">
          {notificaciones.some((n) => !n.leido) ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarcarTodasLeidas}>
              <Check className="h-4 w-4" />
              Marcar todas leídas
            </Button>
          ) : notificaciones.some((n) => n.leido) ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleEliminarLeidas}>
              <Trash2 className="h-4 w-4" />
              Eliminar leídas
            </Button>
          ) : null}
        </div>
      </div>

      {notificacionesLoading ? (
        <ListSkeleton count={5} />
      ) : notificaciones.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">Sin notificaciones</p>
            <p className="text-sm">Cuando te asignen un rol en una grilla, aparecerá acá</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notificaciones.map((n) => (
            <Card key={n.id} className={n.leido ? "opacity-60" : "border-l-2 border-l-primary"}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        if (n.mensaje.startsWith("Se confirmó") || n.mensaje.startsWith("Se rechazó")) return n.mensaje
                        if (!n.referenciaId?.startsWith("asignacion:")) return n.mensaje
                        const p = n.referenciaId.split(":")
                        const gridId = p[1], ministerioId = p[2], rol = p[3]
                        const fecha = fechasGrilla[gridId]
                        const evento = eventosGrilla[gridId]
                        if (!fecha || !evento || !rol) return n.mensaje
                        const ministerioNombre = ministerios.find((m) => m.id === ministerioId)?.nombre || ""
                        const match = n.mensaje.match(/^(.+?)\s+(confirmó|rechazó):/)
                        if (!match) return n.mensaje
                        const accion = match[2] === "confirmó" ? "confirmó" : "rechazó"
                        return `Se ${accion} la asignación de ${match[1]} como "${rol}" en ${ministerioNombre} para "${evento}" del ${fecha}.`
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n.createdAt ? format(new Date(n.createdAt), "d MMM HH:mm", { locale: es }) : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {n.tipo === "asignacion" && !n.leido && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleResponder(n.id, "confirmado")}
                            disabled={respondiendo === n.id}
                          >
                            {respondiendo === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Aceptar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:text-destructive"
                            onClick={() => handleResponder(n.id, "rechazado")}
                            disabled={respondiendo === n.id}
                          >
                            <X className="h-3 w-3" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {n.leido ? (
                        <>
                          <Badge variant="outline" className="text-xs">Leída</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-transparent"
                            onClick={() => handleEliminarNotificacion(n.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleMarcarLeido(n.id)}
                        >
                          Marcar como leída
                        </Button>
                      )}
                    </div>
                  </div>
                  {n.tipo === "asignacion" && !n.leido && (
                    <Badge variant="secondary" className="shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
