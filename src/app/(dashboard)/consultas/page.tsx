"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"
import { crearDocumento, actualizarDocumento, eliminarDocumento, obtenerDocumentos, enviarNotificacion, where } from "@/lib/firestore"
import { logger } from "@/lib/logger"
import { Consulta, Usuario } from "@/types"
import { Plus, MessageSquare, Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { ConsultaForm } from "@/components/consultas/ConsultaForm"
import { ConsultaDetail } from "@/components/consultas/ConsultaDetail"

const TIPO_LABELS: Record<string, string> = { sugerencia: "Sugerencia", tema: "Tema", consulta: "Consulta", urgente: "Urgente" }
const ESTADO_LABELS: Record<string, string> = { pendiente: "Pendiente", respondido: "Respondido", cerrado: "Cerrado" }
const ESTADO_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive"> = { pendiente: "warning", respondido: "default", cerrado: "secondary" }
const TIPO_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive"> = { sugerencia: "secondary", tema: "default", consulta: "outline", urgente: "destructive" }

export default function ConsultasPage() {
  const { user, userData } = useAuth()
  const { consultas, consultasLoading, consultasNoLeidas } = useDashboardStore()
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"

  const consultasEntrantes = useMemo(() => consultas.filter((t) => t.a === user?.uid), [consultas, user?.uid])
  const consultasSalientes = useMemo(() => consultas.filter((t) => t.de === user?.uid), [consultas, user?.uid])

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"enviados" | "recibidos">("enviados")
  const [form, setForm] = useState({ tipo: "sugerencia" as Consulta["tipo"], a: "", asunto: "", mensaje: "" })
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null)
  const [respuesta, setRespuesta] = useState("")
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<"todos" | "pendiente" | "respondido" | "cerrado">("todos")

  const activeList = tab === "recibidos" ? consultasEntrantes : consultasSalientes
  const consultasToShow = useMemo(() => filter === "todos" ? activeList : activeList.filter((t) => t.estado === filter), [activeList, filter])

  const handleOpenCreate = async () => {
    setOpen(true)
    setUsuariosLoading(true)
    try {
      setUsuarios(await obtenerDocumentos<Usuario>("usuarios", [where("rol", "in", ["pastor", "administrador"])]))
    } catch { toast.error("Error al cargar destinatarios") }
    finally { setUsuariosLoading(false) }
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
      de: user.uid, deNombre: `${userData?.nombre || ""} ${userData?.apellido || ""}`.trim(),
      a: destUid, aNombre: `${destinatario.nombre} ${destinatario.apellido}`,
      asunto: form.asunto, mensaje: form.mensaje, estado: "pendiente", respuesta: "",
      tipo: form.tipo, leidoPorDestinatario: false, leidoPorRemitente: true,
    })
      .then((id) => enviarNotificacion({ usuarioId: destUid, titulo: `Nueva consulta: ${form.asunto}`, mensaje: `${userData?.nombre || ""} ${userData?.apellido || ""} te envió una consulta de tipo ${TIPO_LABELS[form.tipo]}`, tipo: "tarea", referenciaId: `consulta:${id}` }))
      .catch((err) => { logger.error("Error al enviar consulta", err instanceof Error ? err : undefined); toast.error("Error al enviar consulta") })
      .finally(() => setSending(false))
  }

  const handleResponder = async () => {
    if (!selectedConsulta || !respuesta.trim()) return
    const c = selectedConsulta
    setSending(true)
    setSelectedConsulta(null)
    setRespuesta("")
    actualizarDocumento<Consulta>("consultas", c.id, { respuesta: respuesta.trim(), estado: "respondido", leidoPorDestinatario: true, leidoPorRemitente: false })
      .then(() => enviarNotificacion({ usuarioId: c.de, titulo: `Respuesta a tu consulta: ${c.asunto}`, mensaje: `${userData?.nombre || ""} ${userData?.apellido || ""} respondió tu consulta`, tipo: "tarea", referenciaId: `consulta:${c.id}` }))
      .then(() => toast.success("Respuesta enviada"))
      .catch((err) => { logger.error("Error al responder", err instanceof Error ? err : undefined); toast.error("Error al responder") })
      .finally(() => setSending(false))
  }

  const handleCerrar = async (c: Consulta) => {
    setSelectedConsulta(null)
    actualizarDocumento<Consulta>("consultas", c.id, { estado: "cerrado", leidoPorDestinatario: true, leidoPorRemitente: true })
      .then(() => toast.success("Consulta cerrada"))
      .catch(() => toast.error("Error al cerrar consulta"))
  }

  const handleDelete = async (c: Consulta) => {
    if (!confirm(`¿Eliminar la consulta "${c.asunto}"?`)) return
    setSelectedConsulta(null)
    eliminarDocumento("consultas", c.id).catch(() => toast.error("Error al eliminar consulta"))
  }

  const handleEliminarTodos = async () => {
    if (consultas.length === 0) return
    if (!confirm(`¿Eliminar TODAS las consultas (${consultas.length})? Esta acción no se puede deshacer.`)) return
    try { await Promise.all(consultas.map(t => eliminarDocumento("consultas", t.id))) }
    catch { toast.error("Error al eliminar todas las consultas") }
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
              : tab === "enviados" ? "Consultas enviadas" : "Consultas"}
          </p>
        </div>
        <div className="flex gap-2">
          {esPastorOAdmin && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/80" onClick={handleEliminarTodos}>
              <Trash2 className="h-4 w-4" /> Eliminar todas
            </Button>
          )}
          {!esPastorOAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}><Plus className="h-4 w-4" />Nueva Consulta</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nueva Consulta</DialogTitle></DialogHeader>
                <ConsultaForm form={form} setForm={setForm} usuarios={usuarios} usuariosLoading={usuariosLoading} sending={sending} onSubmit={handleCreate} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant={tab === "recibidos" ? "default" : "outline"} size="sm" onClick={() => setTab("recibidos")}>Recibidos</Button>
          <Button variant={tab === "enviados" ? "default" : "outline"} size="sm" onClick={() => setTab("enviados")}>Enviados</Button>
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
          <Card><CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></CardContent></Card>
        ) : consultasToShow.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{tab === "recibidos" ? "No tenés consultas recibidas" : "No enviaste consultas aún"}</p>
          </CardContent></Card>
        ) : (
          consultasToShow.map((c) => {
            const isUnread = tab === "recibidos" ? !c.leidoPorDestinatario : !c.leidoPorRemitente && c.estado !== "pendiente"
            return (
              <Card key={c.id} className={`cursor-pointer transition-colors hover:bg-accent/50 ${isUnread ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => { setSelectedConsulta(c); if (tab === "recibidos" && !c.leidoPorDestinatario) actualizarDocumento<Consulta>("consultas", c.id, { leidoPorDestinatario: true }); else if (tab === "enviados" && !c.leidoPorRemitente) actualizarDocumento<Consulta>("consultas", c.id, { leidoPorRemitente: true }) }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{c.asunto}</CardTitle>
                        <Badge variant={TIPO_VARIANTS[c.tipo]}>{TIPO_LABELS[c.tipo]}</Badge>
                        <Badge variant={ESTADO_VARIANTS[c.estado]}>{ESTADO_LABELS[c.estado]}</Badge>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tab === "recibidos" ? `De: ${c.deNombre} · ${format(new Date(c.createdAt), "d MMM yyyy, HH:mm", { locale: es })}` : `Para: ${c.aNombre} · ${format(new Date(c.createdAt), "d MMM yyyy, HH:mm", { locale: es })}`}
                      </p>
                    </div>
                    {esPastorOAdmin && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-transparent shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(c) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent><p className="text-sm text-muted-foreground line-clamp-2">{c.mensaje}</p></CardContent>
              </Card>
            )
          })
        )}
      </div>

      {selectedConsulta && (
        <Dialog open={!!selectedConsulta} onOpenChange={(v) => !v && setSelectedConsulta(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selectedConsulta.asunto}</DialogTitle></DialogHeader>
            <ConsultaDetail consulta={selectedConsulta} esPastorOAdmin={esPastorOAdmin} respuesta={respuesta}
              setRespuesta={setRespuesta} sending={sending} onResponder={handleResponder} onCerrar={handleCerrar} onEliminar={handleDelete} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
