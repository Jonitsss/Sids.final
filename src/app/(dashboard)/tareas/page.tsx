"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Plus, CheckCircle2, Circle, Loader2, Trash2 } from "lucide-react"
import { CardGridSkeleton } from "@/components/skeletons"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useTareas } from "@/hooks/useTareas"
import { useMinisterios } from "@/hooks/useMinisterios"
import { crearDocumento, eliminarDocumento, actualizarDocumento } from "@/lib/firestore"
import { obtenerDocumentos } from "@/lib/firestore"
import { Tarea, Usuario, Notificacion, EstadoTarea } from "@/types"

export default function TareasPage() {
  const { userData } = useAuth()
  const { tareas, loading, refetch, setTareas } = useTareas()
  const { ministerios } = useMinisterios()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [filtro, setFiltro] = useState<EstadoTarea | "todas">("todas")
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    responsableId: "",
    fechaLimite: "",
    ministerioId: "",
  })

  const esPastor = userData?.rol === "pastor"

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const data = await obtenerDocumentos<Usuario>("usuarios")
      const mapa = new Map<string, Usuario>()
      for (const u of data) {
        const key = u.email?.toLowerCase() || u.id
        const existing = mapa.get(key)
        if (existing && existing.authUid && !u.authUid) continue
        mapa.set(key, u)
      }
      if (mounted) setUsuarios(Array.from(mapa.values()))
    })()
    return () => { mounted = false }
  }, [])

  const filtered = filtro === "todas" ? tareas : tareas.filter((t) => t.estado === filtro)

  const handleCreate = async () => {
    if (!form.titulo) return
    try {
      await crearDocumento<Tarea>("tareas", {
        titulo: form.titulo,
        descripcion: form.descripcion,
        responsableId: form.responsableId,
        ministerioId: form.ministerioId,
        eventoId: "",
        fechaLimite: form.fechaLimite ? new Date(form.fechaLimite) : new Date(),
        estado: "pendiente",
        creadoPor: userData?.id || "",
      })

      if (form.responsableId) {
        const userDoc = usuarios.find((u) => u.id === form.responsableId)
        console.log("[Tareas] userDoc seleccionado:", userDoc?.id, userDoc?.email, "authUid:", userDoc?.authUid, "notificaciones:", userDoc?.notificaciones)
        if (userDoc?.notificaciones !== false) {
          const min = ministerios.find((m) => m.id === form.ministerioId)
          const destId = userDoc?.authUid || form.responsableId
          console.log("[Tareas] Creando notificación para usuarioId:", destId)
          await crearDocumento<Notificacion>("notificaciones", {
            usuarioId: destId,
            titulo: "Nueva tarea asignada",
            mensaje: `Te asignaron la tarea "${form.titulo}"${min ? ` en ${min.nombre}` : ""}`,
            leido: false,
            tipo: "tarea",
            referenciaId: "",
          })
        } else {
          console.log("[Tareas] Usuario tiene notificaciones desactivadas, se omite")
        }
      }

      toast.success("Tarea creada exitosamente")
      setOpen(false)
      setForm({ titulo: "", descripcion: "", responsableId: "", fechaLimite: "", ministerioId: "" })
      refetch()
    } catch {
      toast.error("Error al crear tarea")
    }
  }

  const handleDelete = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar la tarea "${titulo}"?`)) return
    setTareas((prev) => prev.filter((t) => t.id !== id))
    try {
      await eliminarDocumento("tareas", id)
      toast.success("Tarea eliminada")
    } catch {
      toast.error("Error al eliminar tarea")
      refetch()
    }
  }

  const toggleEstado = async (id: string, estadoActual: EstadoTarea) => {
    const next: Record<EstadoTarea, EstadoTarea> = {
      pendiente: "en_progreso",
      en_progreso: "completada",
      completada: "pendiente",
    }
    const nuevo = next[estadoActual]
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: nuevo } : t)))
    try {
      await actualizarDocumento("tareas", id, { estado: nuevo })
    } catch {
      toast.error("Error al actualizar estado")
      refetch()
    }
  }

  const estadoBadge: Record<EstadoTarea, "secondary" | "warning" | "success"> = {
    pendiente: "secondary",
    en_progreso: "warning",
    completada: "success",
  }

  const estadoLabel: Record<EstadoTarea, string> = {
    pendiente: "Pendiente",
    en_progreso: "En Progreso",
    completada: "Completada",
  }

  const getResponsable = (id: string) => usuarios.find((u) => u.id === id)
  const getMinisterio = (id: string) => ministerios.find((m) => m.id === id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona las tareas de cada ministerio</p>
        </div>
        {esPastor && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nueva Tarea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={form.responsableId} onValueChange={(v) => setForm({ ...form, responsableId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nombre} {u.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ministerio</Label>
                <Select value={form.ministerioId} onValueChange={(v) => setForm({ ...form, ministerioId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar ministerio" /></SelectTrigger>
                  <SelectContent>
                    {ministerios.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha Límite</Label>
                <Input type="date" value={form.fechaLimite} onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })} />
              </div>
              <Button onClick={handleCreate} className="w-full">Crear Tarea</Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["todas", "pendiente", "en_progreso", "completada"] as const).map((f) => (
          <Button key={f} variant={filtro === f ? "default" : "outline"} size="sm" onClick={() => setFiltro(f)}>
            {f === "todas" ? "Todas" : estadoLabel[f]}
          </Button>
        ))}
      </div>

      {loading ? (
        <CardGridSkeleton cols={3} count={6} />
      ) : tareas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay tareas</p>
            <p className="text-sm">Crea tu primera tarea para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tarea) => {
            const Icon = estadoLabel[tarea.estado] === "Pendiente" ? Circle :
              tarea.estado === "en_progreso" ? Loader2 : CheckCircle2
            const resp = getResponsable(tarea.responsableId)
            const min = getMinisterio(tarea.ministerioId)
            return (
              <Card key={tarea.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0" onClick={() => toggleEstado(tarea.id, tarea.estado)}>
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 cursor-pointer ${tarea.estado === "completada" ? "text-emerald-500" : tarea.estado === "en_progreso" ? "text-amber-500 animate-spin" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <CardTitle className="text-sm cursor-pointer hover:text-primary transition-colors">{tarea.titulo}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">{tarea.descripcion}</p>
                      </div>
                    </div>
                    {esPastor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 hover:bg-transparent h-6 w-6"
                        onClick={() => handleDelete(tarea.id, tarea.titulo)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">{resp ? `${resp.nombre} ${resp.apellido}` : "Sin responsable"}</p>
                      {min && <p className="text-muted-foreground">{min.nombre}</p>}
                      <p className="text-muted-foreground">
                        Vence: {tarea.fechaLimite ? new Date(tarea.fechaLimite).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <Badge variant={estadoBadge[tarea.estado]}>{estadoLabel[tarea.estado]}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
