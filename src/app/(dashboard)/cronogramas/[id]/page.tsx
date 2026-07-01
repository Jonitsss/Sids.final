"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Trash2, Save, Check, X as XIcon } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { GrillaServicio, Evento, Usuario, Asignacion } from "@/types"
import { obtenerDocumento, actualizarDocumento, crearDocumento, enviarNotificacion } from "@/lib/firestore"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { obtenerDocumentos } from "@/lib/firestore"
import { logger } from "@/lib/logger"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const TIPO_COLORS: Record<string, string> = {
  reunion_general: "default",
  ensayo: "secondary",
  jovenes: "outline",
  escuela_biblica: "secondary",
  evento_especial: "warning",
}

const TIPO_LABELS: Record<string, string> = {
  reunion_general: "Reunión General",
  ensayo: "Ensayo",
  jovenes: "Jóvenes",
  escuela_biblica: "Esc. Bíblica",
  evento_especial: "Especial",
}

export default function CronogramaDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [grilla, setGrilla] = useState<GrillaServicio | null>(null)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [modalRechazo, setModalRechazo] = useState<{ ministerioId: string; rol: string } | null>(null)
  const [justificacion, setJustificacion] = useState("")

  const { ministerios } = useDashboardStore()
  const { userData } = useAuth()
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const puedeEditar = esPastorOAdmin || (userData?.administer?.ministerios?.length ?? 0) > 0
  const uid = userData?.authUid || userData?.id

  const puedeEditarMinisterio = (ministerioId: string) => {
    return esPastorOAdmin || (userData?.administer?.ministerios?.includes(ministerioId) ?? false)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [g, evs] = await Promise.all([
          obtenerDocumento<GrillaServicio>("cronogramas", id),
          obtenerDocumentos<Usuario>("usuarios"),
        ])
        if (!mounted) return
        if (!g) { setLoading(false); return }
        setGrilla(g)
        setAsignaciones(g.asignaciones || [])
        const activos = evs.filter((u) => u.activo !== false)
        const mapa = new Map<string, Usuario>()
        for (const u of activos) {
          const key = u.email?.toLowerCase() || u.id
          const existing = mapa.get(key)
          if (existing && existing.authUid && !u.authUid) continue
          mapa.set(key, u)
        }
        setUsuarios(Array.from(mapa.values()))

        if (g.eventoId) {
          const ev = await obtenerDocumento<Evento>("eventos", g.eventoId)
          if (mounted) setEvento(ev)
        }
      } catch (error) {
        logger.error("Error loading grilla", error instanceof Error ? error : undefined)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const handleAssign = async (ministerioId: string, rol: string, usuarioId: string) => {
    const nuevo: Asignacion = {
      ministerioId,
      rol,
      usuarioId,
      estado: "pendiente",
      esExterno: false,
      nombreExterno: "",
    }
    const sinAnterior = asignaciones.filter(
      (a) => !(a.ministerioId === ministerioId && a.rol === rol)
    )
    setAsignaciones([...sinAnterior, nuevo])
  }

  const handleRemove = (ministerioId: string, rol: string) => {
    setAsignaciones((prev) =>
      prev.filter((a) => !(a.ministerioId === ministerioId && a.rol === rol))
    )
  }

  const handleEstadoChange = (ministerioId: string, rol: string, estado: Asignacion["estado"]) => {
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol ? { ...a, estado } : a
      )
    )
  }

  const handleAceptarColaborador = async (ministerioId: string, rol: string) => {
    if (!grilla || !uid) return
    setSaving(true)
    try {
      const nuevasAsignaciones = asignaciones.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol && a.usuarioId === uid
          ? { ...a, estado: "confirmado" as const }
          : a
      )
      await actualizarDocumento("cronogramas", id, { asignaciones: nuevasAsignaciones })
      setAsignaciones(nuevasAsignaciones)
      toast.success("Asignación aceptada")
    } catch (error) {
      logger.error("Error al aceptar", error instanceof Error ? error : undefined)
      toast.error("Error al aceptar la asignación")
    } finally {
      setSaving(false)
    }
  }

  const handleRechazarColaborador = async () => {
    if (!modalRechazo || !grilla || !uid) return
    if (!justificacion.trim()) {
      toast.error("Debés ingresar una justificación")
      return
    }
    setSaving(true)
    try {
      const { ministerioId, rol } = modalRechazo
      const nuevasAsignaciones = asignaciones.map((a) =>
        a.ministerioId === ministerioId && a.rol === rol && a.usuarioId === uid
          ? { ...a, estado: "rechazado" as const, justificacionRechazo: justificacion.trim() }
          : a
      )
      await actualizarDocumento("cronogramas", id, { asignaciones: nuevasAsignaciones })
      setAsignaciones(nuevasAsignaciones)

      const min = ministerios.find((m) => m.id === ministerioId)
      const minNombre = min?.nombre || "el ministerio"
      const eventoTitulo = evento?.titulo || "el evento"
      const fechaStr = grilla ? format(new Date(grilla.fecha), "dd/MM/yyyy", { locale: es }) : ""
      const horaStr = evento?.horaInicio ? ` a las ${evento.horaInicio} hs` : ""

      const destinatarios = usuarios.filter(
        (u) => u.rol === "pastor" || u.rol === "administrador" || (u.rol === "lider" && u.ministerioIds?.includes(ministerioId))
      )

      for (const dest of destinatarios) {
        const destId = dest.authUid || dest.id
        await enviarNotificacion({
          usuarioId: destId,
          titulo: "Asignación rechazada",
          mensaje: `${userData?.nombre} ${userData?.apellido} rechazó la función de "${rol}" en el ministerio ${minNombre} para "${eventoTitulo}" del ${fechaStr}${horaStr}. Motivo: ${justificacion.trim()}`,
          tipo: "confirmacion",
          referenciaId: `rechazo:${id}:${ministerioId}:${rol}`,
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

  const handleSave = async () => {
    if (!grilla) return
    setSaving(true)
    try {
      const oldAsigs = grilla.asignaciones || []
      await actualizarDocumento("cronogramas", id, { asignaciones })

      const nuevas = asignaciones.filter((a) => {
        if (!a.usuarioId) return false
        const old = oldAsigs.find((o) => o.ministerioId === a.ministerioId && o.rol === a.rol)
        if (!old) return true
        if (old.usuarioId !== a.usuarioId) return true
        return false
      })

      for (const a of nuevas) {
        const userDoc = usuarios.find((u) => u.id === a.usuarioId)
        if (userDoc?.notificaciones === false) {
          continue
        }
        const min = ministerios.find((m) => m.id === a.ministerioId)
        const destId = userDoc?.authUid || a.usuarioId
        const fechaStr = grilla ? format(new Date(grilla.fecha), "dd/MM/yyyy", { locale: es }) : ""
        const horaStr = evento?.horaInicio ? ` a las ${evento.horaInicio} hs` : ""
        await enviarNotificacion({
          usuarioId: destId,
          titulo: "Nueva asignación",
          mensaje: `Te asignaron la función de "${a.rol}"${min ? ` en el ministerio ${min.nombre}` : ""}${evento ? ` para "${evento.titulo}"` : ""}${fechaStr ? ` el ${fechaStr}` : ""}${horaStr}.`,
          tipo: "asignacion",
          referenciaId: `asignacion:${id}:${a.ministerioId}:${a.rol}`,
        })
      }

      toast.success("Asignaciones guardadas")
    } catch (error) {
      logger.error("Error saving", error instanceof Error ? error : undefined)
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const asignadosPorMinisterio = (ministerioId: string) =>
    asignaciones.filter((a) => a.ministerioId === ministerioId)

  const getAsignacion = (ministerioId: string, rol: string) =>
    asignaciones.find((a) => a.ministerioId === ministerioId && a.rol === rol)

  const usuarioOptions = (ministerioId: string) =>
    usuarios.filter(
      (u) => u.ministerioIds?.includes(ministerioId) || u.rol === "pastor"
    )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/cronogramas">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
        </div>
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!grilla) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/cronogramas">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">Grilla no encontrada</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cronogramas">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{evento?.titulo || "Grilla de Servicio"}</h1>
              {evento && <Badge variant={TIPO_COLORS[evento.tipo] as any}>{TIPO_LABELS[evento.tipo]}</Badge>}
            </div>
            <p className="text-muted-foreground">
              {format(grilla.fecha, "EEEE d MMMM yyyy", { locale: es })}
              {evento?.horaInicio && <span> — {evento.horaInicio}</span>}
            </p>
          </div>
        </div>
        {puedeEditar && (
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
        )}
      </div>

      {ministerios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium mb-1">No hay ministerios</p>
            <p className="text-sm">Creá ministerios primero para poder asignar roles.</p>
            <Link href="/ministerios">
              <Button variant="outline" className="mt-4">Ir a Ministerios</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {ministerios
            .filter((min) => {
              if (esPastorOAdmin) return true
              if (puedeEditar) return userData?.administer?.ministerios?.includes(min.id) ?? false
              return asignaciones.some((a) => a.ministerioId === min.id && a.usuarioId === uid)
            })
            .map((min) => {
            const asignados = asignadosPorMinisterio(min.id)
            return (
              <Card key={min.id} className="border-l-4" style={{ borderLeftColor: min.color }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{min.nombre}</span>
                    <Badge variant="outline" className="text-xs">
                      {asignados.length}/{min.roles.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {min.roles.map((rol) => {
                    const asig = getAsignacion(min.id, rol)
                    const user = asig ? usuarios.find((u) => u.id === asig.usuarioId) : null
                    const opts = usuarioOptions(min.id)
                    return (
                      <div key={rol} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">{rol}</p>
                          {asig ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">
                                  {user ? `${user.nombre[0]}${user.apellido[0]}` : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  {user ? `${user.nombre} ${user.apellido}` : "Externo"}
                                </p>
                                <div className="flex gap-1 mt-0.5">
                                  {puedeEditarMinisterio(min.id) ? (
                                  <button
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      asig.estado === "confirmado"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : asig.estado === "rechazado"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                                    onClick={() =>
                                      handleEstadoChange(
                                        min.id,
                                        rol,
                                        asig.estado === "pendiente"
                                          ? "confirmado"
                                          : asig.estado === "confirmado"
                                          ? "rechazado"
                                          : "pendiente"
                                      )
                                    }
                                  >
                                    {asig.estado === "confirmado"
                                      ? "Confirmado"
                                      : asig.estado === "rechazado"
                                      ? "Rechazado"
                                      : "Pendiente"}
                                  </button>
                                  ) : asig.usuarioId === uid && asig.estado === "pendiente" ? (
                                  <div className="flex gap-1">
                                    <button
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-0.5"
                                      onClick={() => handleAceptarColaborador(min.id, rol)}
                                      disabled={saving}
                                    >
                                      <Check className="h-3 w-3" /> Aceptar
                                    </button>
                                    <button
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-0.5"
                                      onClick={() => setModalRechazo({ ministerioId: min.id, rol })}
                                      disabled={saving}
                                    >
                                      <XIcon className="h-3 w-3" /> Rechazar
                                    </button>
                                  </div>
                                  ) : (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      asig.estado === "confirmado"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : asig.estado === "rechazado"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}>
                                    {asig.estado === "confirmado"
                                      ? "Confirmado"
                                      : asig.estado === "rechazado"
                                      ? "Rechazado"
                                      : "Pendiente"}
                                  </span>
                                  )}
                                </div>
                              </div>
                              {puedeEditarMinisterio(min.id) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-transparent shrink-0"
                                onClick={() => handleRemove(min.id, rol)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              )}
                            </div>
                          ) : puedeEditarMinisterio(min.id) ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Select
                                value=""
                                onValueChange={(userId) => handleAssign(min.id, rol, userId)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Asignar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {opts.length === 0 ? (
                                    <SelectItem value="__none__" disabled>
                                      Sin miembros disponibles
                                    </SelectItem>
                                  ) : (
                                    opts.map((u) => (
                                      <SelectItem key={u.id} value={u.id}>
                                        {u.nombre} {u.apellido}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!modalRechazo} onOpenChange={(open) => { if (!open) { setModalRechazo(null); setJustificacion("") } }}>
        <DialogContent>
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
            <Button variant="destructive" onClick={handleRechazarColaborador} disabled={saving || !justificacion.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
