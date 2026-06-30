"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useCelulas } from "@/hooks/useCelulas"
import { useDashboardStore } from "@/stores/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MapPin, Users, Clock, Trash2, Loader2, Calendar } from "lucide-react"
import { crearDocumento, eliminarDocumento, actualizarDocumento, obtenerDocumentos, where } from "@/lib/firestore"
import { Celula, TipoCelula, Usuario } from "@/types"
import { toast } from "sonner"

const TIPO_LABELS: Record<TipoCelula, string> = {
  mujeres: "Mujeres",
  hombres: "Hombres",
  adolescentes_varones: "Adolescentes Varones",
  adolescentes_mujeres: "Adolescentes Mujeres",
  matrimonios: "Matrimonios",
}

export default function CelulasPage() {
  const router = useRouter()
  const { user, userData } = useAuth()
  const { ministerios } = useDashboardStore()
  const ministerioCelular = ministerios.find((m) => m.nombre === "Celular")
  const { celulas, loading, setCelulas } = useCelulas(user?.uid, userData?.rol, ministerioCelular?.id)

  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const esLiderCelular = userData?.rol === "lider" && ministerioCelular && userData?.ministerioIds?.includes(ministerioCelular.id)
  const puedeCrear = esPastorOAdmin || !!esLiderCelular
  const puedeEliminar = esPastorOAdmin

  const [open, setOpen] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    tipo: "mujeres" as TipoCelula,
    direccion: "",
    dia: "Miércoles",
    hora: "20:00",
    liderId: "",
    coliderId: "",
    anfitrionId: "",
    ministerioId: "",
  })

  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoCelula>("todos")
  const celulasFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return celulas
    return celulas.filter((c) => c.tipo === filtroTipo)
  }, [celulas, filtroTipo])

  const handleOpenDialog = async () => {
    setOpen(true)
    setLoadingUsuarios(true)
    try {
      const data = await obtenerDocumentos<Usuario>("usuarios", [where("activo", "==", true)])
      setUsuarios(data)
    } catch {
      toast.error("Error al cargar usuarios")
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const handleCreate = async () => {
    if (!form.nombre || !form.tipo || !form.liderId || creating) return
    setCreating(true)

    const ministerioCelular = ministerios.find((m) => m.nombre === "Celular")
    if (!ministerioCelular) {
      toast.error("No se encontró el ministerio Celular")
      setCreating(false)
      return
    }
    const ministerioId = ministerioCelular.id

    const tempId = `temp_${Date.now()}`

    const optimistic: Celula = {
      id: tempId,
      nombre: form.nombre,
      tipo: form.tipo,
      direccion: form.direccion,
      liderId: form.liderId,
      coliderId: form.coliderId,
      anfitrionId: form.anfitrionId,
      dia: form.dia,
      hora: form.hora,
      ministerioId,
      activo: true,
      createdAt: new Date(),
    }
    setCelulas((prev) => [optimistic, ...prev])
    setOpen(false)
    setForm({
      nombre: "",
      tipo: "mujeres",
      direccion: "",
      dia: "Miércoles",
      hora: "20:00",
      liderId: "",
      coliderId: "",
      anfitrionId: "",
      ministerioId: "",
    })

    try {
      await crearDocumento<Celula>("celulas", {
        nombre: form.nombre,
        tipo: form.tipo,
        direccion: form.direccion,
        liderId: form.liderId,
        coliderId: form.coliderId,
        anfitrionId: form.anfitrionId,
        dia: form.dia,
        hora: form.hora,
        ministerioId,
        activo: true,
      })
      toast.success("Célula creada exitosamente")
    } catch {
      setCelulas((prev) => prev.filter((c) => c.id !== tempId))
      toast.error("Error al crear célula")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la célula "${nombre}"?`)) return
    const anterior = celulas
    setCelulas((prev) => prev.filter((c) => c.id !== id))
    try {
      await eliminarDocumento("celulas", id)
      toast.success("Célula eliminada")
    } catch {
      setCelulas(anterior)
      toast.error("Error al eliminar célula")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Células</h1>
          <p className="text-muted-foreground">Gestiona las células del Ministerio Celular</p>
        </div>
        {puedeCrear && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4" />
                Nueva Célula
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Célula</DialogTitle>
                <DialogDescription>Crear una nueva célula del Ministerio Celular</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Célula Mujeres Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoCelula })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TIPO_LABELS) as TipoCelula[]).map((t) => (
                        <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Día</Label>
                    <Select value={form.dia} onValueChange={(v) => setForm({ ...form, dia: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={form.hora}
                      onChange={(e) => setForm({ ...form, hora: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    placeholder="Calle 123, Ciudad"
                  />
                </div>
                {loadingUsuarios ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Líder *</Label>
                      <Select value={form.liderId} onValueChange={(v) => setForm({ ...form, liderId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar líder" />
                        </SelectTrigger>
                        <SelectContent>
                          {usuarios
                            .filter((u) => u.rol === "lider_celula")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Colíder (opcional)</Label>
                      <Select value={form.coliderId || "__none__"} onValueChange={(v) => setForm({ ...form, coliderId: v === "__none__" ? "" : v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar colíder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin colíder</SelectItem>
                          {usuarios
                            .filter((u) => u.rol === "colider" && u.id !== form.liderId)
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Anfitrión (opcional)</Label>
                      <Select value={form.anfitrionId || "__none__"} onValueChange={(v) => setForm({ ...form, anfitrionId: v === "__none__" ? "" : v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar anfitrión" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin anfitrión</SelectItem>
                          {usuarios
                            .filter((u) => u.rol === "anfitrion")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <Button onClick={handleCreate} className="w-full" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {(Object.keys(TIPO_LABELS) as TipoCelula[]).map((t) => (
                <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton cols={3} count={6} />
      ) : celulasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay células</p>
            <p className="text-sm">
              {puedeCrear ? "Crea la primera célula para empezar" : "Aún no participas de ninguna célula"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {celulasFiltradas.map((c) => (
              <Card
                key={c.id}
                className="hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => router.push(`/ministerios/celulas/${c.id}`)}
              >
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg shrink-0 bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{c.nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{TIPO_LABELS[c.tipo]}</p>
                  </div>
                  {puedeEliminar && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(c.id, c.nombre)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{c.dia} {c.hora}</span>
                  </div>
                  {c.direccion && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{c.direccion}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  )
}
