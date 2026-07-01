"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bell, Check, Loader2, Trash2 } from "lucide-react"
import { ListSkeleton } from "@/components/skeletons"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"
import { actualizarDocumento, obtenerDocumento, obtenerDocumentos, eliminarDocumento, where, enviarNotificacion, documentId } from "@/lib/firestore"
import { GrillaServicio, Usuario, Evento } from "@/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { NotificacionCard } from "@/components/notificaciones/NotificacionCard"

export default function NotificacionesPage() {
  const { user, userData } = useAuth()
  const { notificaciones, noLeidas, notificacionesLoading, ministerios, ministeriosLoading, setNotificaciones } = useDashboardStore()
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [fechasGrilla, setFechasGrilla] = useState<Record<string, string>>({})
  const [eventosGrilla, setEventosGrilla] = useState<Record<string, string>>({})
  const cleaned = useRef(false)
  const [modalRechazo, setModalRechazo] = useState<string | null>(null)
  const [justificacion, setJustificacion] = useState("")

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
      const grillas = await obtenerDocumentos<GrillaServicio>("cronogramas", [where(documentId(), "in", ids)])
      const fechas: Record<string, string> = {}
      const eventoIds = new Set<string>()
      const grillaByEventoId = new Map<string, string>()
      for (const g of grillas) {
        if (g.fecha) fechas[g.id] = format(new Date(g.fecha), "d 'de' MMMM", { locale: es })
        if (g.eventoId) { eventoIds.add(g.eventoId); grillaByEventoId.set(g.eventoId, g.id) }
      }
      const eventos = await obtenerDocumentos<Evento>("eventos", [where(documentId(), "in", [...eventoIds])])
      const eventoTitulos: Record<string, string> = {}
      for (const ev of eventos) {
        if (ev.titulo) { const grillaId = grillaByEventoId.get(ev.id); if (grillaId) eventoTitulos[grillaId] = ev.titulo }
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

  const handleResponder = async (notifId: string, accion: "confirmado" | "rechazado", motivo?: string) => {
    const notif = notificaciones.find((n) => n.id === notifId)
    if (!notif || !notif.referenciaId.startsWith("asignacion:")) return
    setRespondiendo(notifId)
    try {
      const parts = notif.referenciaId.split(":")
      const grillaId = parts[1], ministerioId = parts[2], rol = parts[3]
      const grilla = await obtenerDocumento<GrillaServicio>("cronogramas", grillaId)
      if (!grilla) { toast.error("La grilla ya no existe"); return }
      const fechaStr = format(new Date(grilla.fecha), "dd/MM/yyyy", { locale: es })
      const nuevas = grilla.asignaciones.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol ? { ...a, estado: accion, justificacionRechazo: accion === "rechazado" ? motivo : undefined } : a
      )
      await actualizarDocumento("cronogramas", grillaId, { asignaciones: nuevas })
      await actualizarDocumento("notificaciones", notifId, { leido: true, tipo: accion === "confirmado" ? "confirmacion" : "asignacion" })
      setNotificaciones((prev) => prev.map((n) => n.id === notifId ? { ...n, leido: true } : n))

      const ministerioNombre = ministerios.find((m) => m.id === ministerioId)?.nombre || ""
      const eventoDoc = await obtenerDocumento<Evento>("eventos", grilla.eventoId)
      const eventoTitulo = eventoDoc?.titulo || ""
      const horaStr = eventoDoc?.horaInicio ? ` a las ${eventoDoc.horaInicio} hs` : ""
      const nombre = userData?.nombre || "Alguien"
      const apellido = userData?.apellido || ""
      const motivoStr = accion === "rechazado" && motivo ? ` Motivo: ${motivo}` : ""
      const msgBase = `${nombre} ${apellido} ${accion === "confirmado" ? "confirmó" : "rechazó"} la función de "${rol}" en el ministerio ${ministerioNombre} para "${eventoTitulo}" del ${fechaStr}${horaStr}.${motivoStr}`

      const destinatarios = new Set<string>()
      const pastores = await obtenerDocumentos<Usuario>("usuarios", [where("rol", "in", ["pastor", "administrador"])])
      for (const p of pastores) { const destId = (p as any).authUid || p.id; if (destId !== user?.uid) destinatarios.add(destId) }
      const ministerio = ministerios.find((m) => m.id === ministerioId)
      if (ministerio?.encargados?.length) {
        for (const encargadoId of ministerio.encargados) {
          const liderDoc = await obtenerDocumento<Usuario>("usuarios", encargadoId)
          if (liderDoc) { const liderUid = (liderDoc as any).authUid || liderDoc.id; if (liderUid !== user?.uid) destinatarios.add(liderUid) }
        }
      }
      for (const destId of destinatarios) {
        await enviarNotificacion({ usuarioId: destId, titulo: accion === "confirmado" ? "Asignación confirmada" : "Asignación rechazada", mensaje: msgBase, tipo: "confirmacion", referenciaId: notif.referenciaId })
      }
      toast.success(accion === "confirmado" ? "Asistencia confirmada" : "Asignación rechazada")
    } catch { toast.error("Error al responder") }
    finally { setRespondiendo(null) }
  }

  const handleMarcarLeido = async (notifId: string) => {
    try { await actualizarDocumento("notificaciones", notifId, { leido: true }); setNotificaciones((prev) => prev.map((n) => n.id === notifId ? { ...n, leido: true } : n)) }
    catch { toast.error("Error al marcar como leída") }
  }

  const handleEliminarNotificacion = async (notifId: string) => {
    const eliminada = notificaciones.find((n) => n.id === notifId)
    setNotificaciones((prev) => prev.filter((n) => n.id !== notifId))
    try { await eliminarDocumento("notificaciones", notifId) }
    catch { if (eliminada) setNotificaciones((prev) => [...prev, eliminada]); toast.error("Error al eliminar notificación") }
  }

  const handleEliminarLeidas = async () => {
    const ids = notificaciones.filter((n) => n.leido).map((n) => n.id)
    if (ids.length === 0) return
    const anterior = notificaciones
    setNotificaciones((prev) => prev.filter((n) => !n.leido))
    try { await Promise.all(ids.map((id) => eliminarDocumento("notificaciones", id))); toast.success(`${ids.length} notificación${ids.length > 1 ? "es" : ""} eliminada${ids.length > 1 ? "s" : ""}`) }
    catch { setNotificaciones(anterior); toast.error("Error al eliminar notificaciones") }
  }

  const handleMarcarTodasLeidas = async () => {
    const ids = notificaciones.filter((n) => !n.leido).map((n) => n.id)
    if (ids.length === 0) return
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: true })))
    try { await Promise.all(ids.map((id) => actualizarDocumento("notificaciones", id, { leido: true }))); toast.success(`${ids.length} notificación${ids.length > 1 ? "es" : ""} marcada${ids.length > 1 ? "s" : ""} como leída${ids.length > 1 ? "s" : ""}`) }
    catch { setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: !ids.includes(n.id) ? n.leido : false }))); toast.error("Error al marcar como leídas") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">{noLeidas > 0 ? `Tenés ${noLeidas} notificación${noLeidas > 1 ? "es" : ""} sin leer` : "No tenés notificaciones pendientes"}</p>
        </div>
        <div className="flex gap-2">
          {notificaciones.some((n) => !n.leido) ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarcarTodasLeidas}><Check className="h-4 w-4" />Marcar todas leídas</Button>
          ) : notificaciones.some((n) => n.leido) ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleEliminarLeidas}><Trash2 className="h-4 w-4" />Eliminar leídas</Button>
          ) : null}
        </div>
      </div>

      {notificacionesLoading ? <ListSkeleton count={5} /> : notificaciones.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">Sin notificaciones</p>
          <p className="text-sm">Tus notificaciones aparecerán acá</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {notificaciones.map((n) => (
            <NotificacionCard key={n.id} notificacion={n} ministerios={ministerios} fechasGrilla={fechasGrilla} eventosGrilla={eventosGrilla}
              respondiendo={respondiendo} onAceptar={(id) => handleResponder(id, "confirmado")}
              onRechazar={(id) => { setModalRechazo(id); setJustificacion("") }}
              onMarcarLeido={handleMarcarLeido} onEliminar={handleEliminarNotificacion} />
          ))}
        </div>
      )}

      <Dialog open={!!modalRechazo} onOpenChange={() => setModalRechazo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rechazar asignación</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Explicá el motivo por el cual rechazás esta asignación..." value={justificacion} onChange={(e) => setJustificacion(e.target.value)} rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModalRechazo(null)}>Cancelar</Button>
              <Button variant="destructive" size="sm" disabled={!justificacion.trim() || (!!modalRechazo && respondiendo === modalRechazo)}
                onClick={() => { if (modalRechazo) { handleResponder(modalRechazo, "rechazado", justificacion.trim()); setModalRechazo(null) } }}>
                {modalRechazo && respondiendo === modalRechazo ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Confirmar rechazo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
