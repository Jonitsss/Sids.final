"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"
import { crearDocumento, actualizarDocumento, eliminarDocumento, obtenerDocumentos, enviarNotificacion, where } from "@/lib/firestore"
import { Consulta, Usuario } from "@/types"
import { Plus, MessageSquare, Loader2, Send, X, CheckCircle, Clock, AlertCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { rolLabel } from "@/lib/utils"

const TIPO_LABELS: Record<string, string> = {
  sugerencia: "Sugerencia",
  tema: "Tema",
  consulta: "Consulta",
  urgente: "Urgente",
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  respondido: "Respondido",
  cerrado: "Cerrado",
}

const ESTADO_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive"> = {
  pendiente: "warning",
  respondido: "default",
  cerrado: "secondary",
}

const TIPO_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive"> = {
  sugerencia: "secondary",
  tema: "default",
  consulta: "outline",
  urgente: "destructive",
}

export default function ConsultasPage() {
  const { user, userData } = useAuth()
  const { consultas, consultasLoading, consultasNoLeidas, setConsultas } = useDashboardStore()
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const puedeCrear = !esPastorOAdmin

  const consultasEntrantes = useMemo(() => consultas.filter((t) => t.a === user?.uid), [consultas, user?.uid])
  const consultasSalientes = useMemo(() => consultas.filter((t) => t.de === user?.uid), [consultas, user?.uid])

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"enviados" | "recibidos">("enviados")
  const [form, setForm] = useState({
    tipo: "sugerencia" as Consulta["tipo"],
    a: "",
    asunto: "",
    mensaje: "",
  })
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null)
  const [respuesta, setRespuesta] = useState("")
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<"todos" | "pendiente" | "respondido" | "cerrado">("todos")

  const activeList = tab === "recibidos" ? consultasEntrantes : consultasSalientes
  const consultasToShow = useMemo(() => {
    if (filter === "todos") return activeList
    return activeList.filter((t) => t.estado === filter)
  }, [activeList, filter])

  const handleOpenCreate = async () => {
    setOpen(true)
    setUsuariosLoading(true)
    try {
      const data = await obtenerDocumentos<Usuario>("usuarios", [
        where("rol", "in", ["pastor", "administrador"]),
      ])
      setUsuarios(data)
    } catch {
      toast.error("Error al cargar destinatarios")
    } finally {
      setUsuariosLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.asunto || !form.mensaje || !form.a || !user?.uid) return
    const destinatario = usuarios.find((u) => u.id === form.a)
    if (!destinatario) return

    const destUid = destinatario.authUid || destinatario.id

    setOpen(false)
    setForm({ tipo: "sugerencia", a: "", asunto: "", mensaje: "" })
    setSending(true)

    crearDocumento<Consulta>("consultas", {
      de: user.uid,
      deNombre: `${userData?.nombre || ""} ${userData?.apellido || ""}`.trim(),
      a: destUid,
      aNombre: `${destinatario.nombre} ${destinatario.apellido}`,
      asunto: form.asunto,
      mensaje: form.mensaje,
      estado: "pendiente",
      respuesta: "",
      tipo: form.tipo,
      leidoPorDestinatario: false,
      leidoPorRemitente: true,
    })
      .then((consultaId) => {
        enviarNotificacion({
          usuarioId: destUid,
          titulo: `Nueva consulta: ${form.asunto}`,
          mensaje: `${userData?.nombre || ""} ${userData?.apellido || ""} te envió una consulta de tipo ${TIPO_LABELS[form.tipo]}`,
          tipo: "tarea",
          referenciaId: `consulta:${consultaId}`,
        })
      })
      .catch((err) => {
        console.error("Error al enviar consulta:", err)
        toast.error("Error al enviar consulta")
      })
      .finally(() => setSending(false))
  }

  const handleResponder = async () => {
    if (!selectedConsulta || !respuesta.trim()) return
    const consulta = selectedConsulta
    setSending(true)
    setSelectedConsulta(null)
    setRespuesta("")

    actualizarDocumento<Consulta>("consultas", consulta.id, {
      respuesta: respuesta.trim(),
      estado: "respondido",
      leidoPorDestinatario: true,
      leidoPorRemitente: false,
    })
      .then(() =>
        enviarNotificacion({
          usuarioId: consulta.de,
          titulo: `Respuesta a tu consulta: ${consulta.asunto}`,
          mensaje: `${userData?.nombre || ""} ${userData?.apellido || ""} respondió tu consulta`,
          tipo: "tarea",
          referenciaId: `consulta:${consulta.id}`,
        })
      )
      .then(() => {
        toast.success("Respuesta enviada")
      })
      .catch((err) => {
        console.error("Error al responder:", err)
        toast.error("Error al responder")
      })
      .finally(() => setSending(false))
  }

  const handleCerrar = async (consulta: Consulta) => {
    setSelectedConsulta(null)
    actualizarDocumento<Consulta>("consultas", consulta.id, {
      estado: "cerrado",
      leidoPorDestinatario: true,
      leidoPorRemitente: true,
    })
      .then(() => {
        toast.success("Consulta cerrada")
      })
      .catch(() => toast.error("Error al cerrar consulta"))
  }

  const handleDelete = async (consulta: Consulta) => {
    if (!confirm(`¿Eliminar la consulta "${consulta.asunto}"?`)) return
    setSelectedConsulta(null)
    eliminarDocumento("consultas", consulta.id)
      .catch(() => toast.error("Error al eliminar consulta"))
  }

  const handleMarcarLeido = async (consulta: Consulta) => {
    try {
      if (tab === "recibidos" && !consulta.leidoPorDestinatario) {
        await actualizarDocumento<Consulta>("consultas", consulta.id, { leidoPorDestinatario: true })
      } else if (tab === "enviados" && !consulta.leidoPorRemitente) {
        await actualizarDocumento<Consulta>("consultas", consulta.id, { leidoPorRemitente: true })
      }
    } catch {
      // silent
    }
  }

  const handleEliminarTodos = async () => {
    if (consultas.length === 0) return
    if (!confirm(`¿Eliminar TODAS las consultas (${consultas.length})? Esta acción no se puede deshacer.`)) return
    try {
      await Promise.all(consultas.map(t => eliminarDocumento("consultas", t.id)))
    } catch {
      toast.error("Error al eliminar todas las consultas")
    }
  }

  const markedAsReadRef = useRef(new Set<string>())

  useEffect(() => {
    if (!user?.uid || consultasEntrantes.length === 0 || consultasLoading) return
    const ids = consultasEntrantes.filter(t => !t.leidoPorDestinatario && !markedAsReadRef.current.has(t.id)).map(t => t.id)
    if (ids.length === 0) return
    markedAsReadRef.current = new Set([...markedAsReadRef.current, ...ids])
    Promise.all(ids.map(id => actualizarDocumento<Consulta>("consultas", id, { leidoPorDestinatario: true })))
  }, [user?.uid, consultasLoading, consultasEntrantes])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consultas</h1>
          <p className="text-muted-foreground">
            {tab === "recibidos" && consultasEntrantes.length > 0
              ? `Consultas recibidas${consultasNoLeidas > 0 ? ` (${consultasNoLeidas} sin leer)` : ""}`
              : tab === "enviados"
              ? "Consultas enviadas"
              : "Consultas"}
          </p>
        </div>
        <div className="flex gap-2">
          {esPastorOAdmin && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/80" onClick={handleEliminarTodos}>
              <Trash2 className="h-4 w-4" />
              Eliminar todas
            </Button>
          )}
          {puedeCrear && (
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Nueva Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva Consulta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Consulta["tipo"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sugerencia">Sugerencia</SelectItem>
                      <SelectItem value="tema">Tema</SelectItem>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destinatario</Label>
                  <Select value={form.a} onValueChange={(v) => setForm({ ...form, a: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={usuariosLoading ? "Cargando..." : "Seleccionar"} />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nombre} {u.apellido} ({rolLabel(u.rol)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Asunto</Label>
                  <Input value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })} placeholder="Ej: Propuesta de nuevo horario" />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje</Label>
                  <Textarea value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} placeholder="Describí tu propuesta, consulta o sugerencia..." rows={4} />
                </div>
                <Button onClick={handleCreate} disabled={!form.asunto || !form.mensaje || !form.a || sending} className="w-full">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar Consulta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant={tab === "recibidos" ? "default" : "outline"} size="sm" onClick={() => setTab("recibidos")}>
            Recibidos
          </Button>
          <Button variant={tab === "enviados" ? "default" : "outline"} size="sm" onClick={() => setTab("enviados")}>
            Enviados
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["todos", "pendiente", "respondido", "cerrado"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "todos" ? "Todos" : ESTADO_LABELS[f]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {consultasLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        ) : consultasToShow.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>
                {tab === "recibidos"
                  ? "No tenés consultas recibidas"
                  : "No enviaste consultas aún"}
              </p>
            </CardContent>
          </Card>
        ) : (
          consultasToShow.map((consulta) => {
            const isUnread = tab === "recibidos"
              ? !consulta.leidoPorDestinatario
              : !consulta.leidoPorRemitente && consulta.estado !== "pendiente"
            return (
              <Card
                key={consulta.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${isUnread ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => { setSelectedConsulta(consulta); handleMarcarLeido(consulta) }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{consulta.asunto}</CardTitle>
                        <Badge variant={TIPO_VARIANTS[consulta.tipo]}>{TIPO_LABELS[consulta.tipo]}</Badge>
                        <Badge variant={ESTADO_VARIANTS[consulta.estado]}>{ESTADO_LABELS[consulta.estado]}</Badge>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tab === "recibidos"
                          ? `De: ${consulta.deNombre} · ${format(new Date(consulta.createdAt), "d MMM yyyy, HH:mm", { locale: es })}`
                          : `Para: ${consulta.aNombre} · ${format(new Date(consulta.createdAt), "d MMM yyyy, HH:mm", { locale: es })}`
                        }
                      </p>
                    </div>
                    {esPastorOAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 hover:bg-transparent shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(consulta) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{consulta.mensaje}</p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {selectedConsulta && (
        <Dialog open={!!selectedConsulta} onOpenChange={(v) => !v && setSelectedConsulta(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedConsulta.asunto}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={TIPO_VARIANTS[selectedConsulta.tipo]}>{TIPO_LABELS[selectedConsulta.tipo]}</Badge>
                <Badge variant={ESTADO_VARIANTS[selectedConsulta.estado]}>{ESTADO_LABELS[selectedConsulta.estado]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(selectedConsulta.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>

              <div className="text-sm">
                <p className="font-medium">{esPastorOAdmin ? `De: ${selectedConsulta.deNombre}` : `Para: ${selectedConsulta.aNombre}`}</p>
              </div>

              <div className="p-3 rounded-lg border bg-card/50">
                <p className="text-sm whitespace-pre-wrap">{selectedConsulta.mensaje}</p>
              </div>

              {selectedConsulta.respuesta && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    Respuesta
                  </p>
                  <div className="p-3 rounded-lg border bg-primary/5">
                    <p className="text-sm whitespace-pre-wrap">{selectedConsulta.respuesta}</p>
                  </div>
                </div>
              )}

              {esPastorOAdmin && selectedConsulta.estado !== "cerrado" && (
                <div className="space-y-2">
                  <Label>Responder</Label>
                  <Textarea
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder="Escribí tu respuesta..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleResponder} disabled={!respuesta.trim() || sending} className="flex-1">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Responder
                    </Button>
                    <Button variant="outline" onClick={() => handleCerrar(selectedConsulta)} disabled={sending}>
                      <X className="h-4 w-4" />
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

              {esPastorOAdmin && (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive/80 hover:bg-transparent"
                  onClick={() => handleDelete(selectedConsulta)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar consulta
                </Button>
              )}

              {!esPastorOAdmin && selectedConsulta.estado === "respondido" && (
                <Button variant="outline" onClick={() => handleCerrar(selectedConsulta)} className="w-full">
                  <CheckCircle className="h-4 w-4" />
                  Marcar como resuelto
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
