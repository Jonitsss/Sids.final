"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { useTickets } from "@/hooks/useTickets"
import { crearDocumento, actualizarDocumento, eliminarDocumento, obtenerDocumentos, where } from "@/lib/firestore"
import { Ticket, Usuario } from "@/types"
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

export default function TicketsPage() {
  const { user, userData } = useAuth()
  const { tickets, loading, refetch, ticketsEntrantes, ticketsSalientes, noLeidos } = useTickets(user?.uid, userData?.rol)
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const puedeCrear = !esPastorOAdmin

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"enviados" | "recibidos">("enviados")
  const [form, setForm] = useState({
    tipo: "sugerencia" as Ticket["tipo"],
    a: "",
    asunto: "",
    mensaje: "",
  })
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [respuesta, setRespuesta] = useState("")
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<"todos" | "pendiente" | "respondido" | "cerrado">("todos")

  const activeList = esPastorOAdmin && tab === "recibidos" ? ticketsEntrantes : ticketsSalientes
  const ticketsToShow = useMemo(() => {
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

    setSending(true)
    try {
      const ticketId = await crearDocumento<Ticket>("tickets", {
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

      await crearDocumento<any>("notificaciones", {
        usuarioId: destUid,
        titulo: `Nuevo ticket: ${form.asunto}`,
        mensaje: `${userData?.nombre || ""} ${userData?.apellido || ""} te envió un ticket de tipo ${TIPO_LABELS[form.tipo]}`,
        leido: false,
        tipo: "tarea",
        referenciaId: `ticket:${ticketId}`,
      })

      toast.success("Ticket enviado exitosamente")
      setOpen(false)
      setForm({ tipo: "sugerencia", a: "", asunto: "", mensaje: "" })
      refetch()
    } catch (err) {
      console.error("Error al enviar ticket:", err)
      toast.error("Error al enviar ticket")
    } finally {
      setSending(false)
    }
  }

  const handleResponder = async () => {
    if (!selectedTicket || !respuesta.trim()) return
    setSending(true)
    try {
      await actualizarDocumento<Ticket>("tickets", selectedTicket.id, {
        respuesta: respuesta.trim(),
        estado: "respondido",
        leidoPorDestinatario: true,
        leidoPorRemitente: false,
      })

      await crearDocumento<any>("notificaciones", {
        usuarioId: selectedTicket.de,
        titulo: `Respuesta a tu ticket: ${selectedTicket.asunto}`,
        mensaje: `${userData?.nombre || ""} ${userData?.apellido || ""} respondió tu ticket`,
        leido: false,
        tipo: "tarea",
        referenciaId: `ticket:${selectedTicket.id}`,
      })

      toast.success("Respuesta enviada")
      setSelectedTicket(null)
      setRespuesta("")
      refetch()
    } catch (err) {
      console.error("Error al responder:", err)
      toast.error("Error al responder")
    } finally {
      setSending(false)
    }
  }

  const handleCerrar = async (ticket: Ticket) => {
    try {
      await actualizarDocumento<Ticket>("tickets", ticket.id, {
        estado: "cerrado",
        leidoPorDestinatario: true,
        leidoPorRemitente: true,
      })
      toast.success("Ticket cerrado")
      setSelectedTicket(null)
      refetch()
    } catch {
      toast.error("Error al cerrar ticket")
    }
  }

  const handleDelete = async (ticket: Ticket) => {
    if (!confirm(`¿Eliminar el ticket "${ticket.asunto}"?`)) return
    try {
      await eliminarDocumento("tickets", ticket.id)
      toast.success("Ticket eliminado")
      setSelectedTicket(null)
      refetch()
    } catch {
      toast.error("Error al eliminar ticket")
    }
  }

  const handleMarcarLeido = async (ticket: Ticket) => {
    try {
      if (esPastorOAdmin && !ticket.leidoPorDestinatario) {
        await actualizarDocumento<Ticket>("tickets", ticket.id, { leidoPorDestinatario: true })
      } else if (!esPastorOAdmin && !ticket.leidoPorRemitente) {
        await actualizarDocumento<Ticket>("tickets", ticket.id, { leidoPorRemitente: true })
      }
      refetch()
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">
            {esPastorOAdmin
              ? `Mensajes recibidos de líderes${noLeidos > 0 ? ` (${noLeidos} sin leer)` : ""}`
              : "Enviá propuestas, temas o sugerencias al Pastor o Administrador"}
          </p>
        </div>
        {puedeCrear && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4" />
                Nuevo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuevo Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Ticket["tipo"] })}>
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
                  Enviar Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {esPastorOAdmin && (
          <div className="flex gap-2">
            <Button variant={tab === "recibidos" ? "default" : "outline"} size="sm" onClick={() => setTab("recibidos")}>
              Recibidos
            </Button>
            <Button variant={tab === "enviados" ? "default" : "outline"} size="sm" onClick={() => setTab("enviados")}>
              Enviados
            </Button>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {(["todos", "pendiente", "respondido", "cerrado"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "todos" ? "Todos" : ESTADO_LABELS[f]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        ) : ticketsToShow.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>
                {esPastorOAdmin && tab === "recibidos"
                  ? "No tenés tickets recibidos"
                  : esPastorOAdmin
                  ? "No enviaste tickets aún"
                  : "No enviaste tickets aún"}
              </p>
            </CardContent>
          </Card>
        ) : (
          ticketsToShow.map((ticket) => {
            const isUnread = esPastorOAdmin && tab === "recibidos"
              ? !ticket.leidoPorDestinatario
              : !ticket.leidoPorRemitente && ticket.estado !== "pendiente"
            return (
              <Card
                key={ticket.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${isUnread ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => { setSelectedTicket(ticket); handleMarcarLeido(ticket) }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{ticket.asunto}</CardTitle>
                        <Badge variant={TIPO_VARIANTS[ticket.tipo]}>{TIPO_LABELS[ticket.tipo]}</Badge>
                        <Badge variant={ESTADO_VARIANTS[ticket.estado]}>{ESTADO_LABELS[ticket.estado]}</Badge>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {esPastorOAdmin && tab === "recibidos"
                          ? `De: ${ticket.deNombre} · ${format(new Date(ticket.createdAt), "d MMM yyyy, HH:mm", { locale: es })}`
                          : `Para: ${ticket.aNombre} · ${format(new Date(ticket.createdAt), "d MMM yyyy, HH:mm", { locale: es })}`
                        }
                      </p>
                    </div>
                    {esPastorOAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 hover:bg-transparent shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(ticket) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{ticket.mensaje}</p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(v) => !v && setSelectedTicket(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTicket.asunto}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={TIPO_VARIANTS[selectedTicket.tipo]}>{TIPO_LABELS[selectedTicket.tipo]}</Badge>
                <Badge variant={ESTADO_VARIANTS[selectedTicket.estado]}>{ESTADO_LABELS[selectedTicket.estado]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(selectedTicket.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>

              <div className="text-sm">
                <p className="font-medium">{esPastorOAdmin ? `De: ${selectedTicket.deNombre}` : `Para: ${selectedTicket.aNombre}`}</p>
              </div>

              <div className="p-3 rounded-lg border bg-card/50">
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.mensaje}</p>
              </div>

              {selectedTicket.respuesta && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    Respuesta
                  </p>
                  <div className="p-3 rounded-lg border bg-primary/5">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.respuesta}</p>
                  </div>
                </div>
              )}

              {esPastorOAdmin && selectedTicket.estado !== "cerrado" && (
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
                    <Button variant="outline" onClick={() => handleCerrar(selectedTicket)} disabled={sending}>
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
                  onClick={() => handleDelete(selectedTicket)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar ticket
                </Button>
              )}

              {!esPastorOAdmin && selectedTicket.estado === "respondido" && (
                <Button variant="outline" onClick={() => handleCerrar(selectedTicket)} className="w-full">
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


