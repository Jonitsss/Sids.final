"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, ArrowLeft, Loader2, ShieldCheck, Plus, Trash2 } from "lucide-react"
import { TIPO_LABELS } from "@/lib/celulas"
import { actualizarDocumento, crearDocumento, eliminarDocumento } from "@/lib/firestore"
import { toast } from "sonner"
import { TipoCelula } from "@/types"

const TIPOS_RAMA: { value: TipoCelula; label: string }[] = [
  { value: "mujeres", label: "Mujeres" },
  { value: "hombres", label: "Hombres" },
  { value: "adolescentes_varones", label: "Adolescentes Varones" },
  { value: "adolescentes_mujeres", label: "Adolescentes Mujeres" },
  { value: "matrimonios", label: "Matrimonios" },
]

export default function RamasAdminPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { ramas, ramasLoading, usuarios, usuariosLoading, ministerios } = useDashboardStore()
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const [guardando, setGuardando] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    tipo: "mujeres" as TipoCelula,
    descripcion: "",
  })

  if (!esPastorOAdmin) {
    return (
      <div className="p-8 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 mx-auto opacity-30 text-muted-foreground" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">Solo pastor y administrador pueden gestionar ramas.</p>
        <Button variant="outline" onClick={() => router.push("/celular")}>Volver</Button>
      </div>
    )
  }

  const ministerioCelular = ministerios.find((m) => m.nombre === "Celular")

  const handleAsignarEncargado = async (ramaId: string, encargadoId: string) => {
    setGuardando(ramaId)
    try {
      await actualizarDocumento("ramas_celular", ramaId, { encargadoId: encargadoId || null })
      toast.success(encargadoId ? "Encargado asignado" : "Encargado removido")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(null)
    }
  }

  const handleCrearRama = async () => {
    if (!form.nombre.trim() || !ministerioCelular) return
    setCreating(true)
    try {
      await crearDocumento("ramas_celular", {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        encargadoId: null,
        ministerioId: ministerioCelular.id,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      toast.success("Rama creada exitosamente")
      setForm({ nombre: "", tipo: "mujeres", descripcion: "" })
      setDialogOpen(false)
    } catch {
      toast.error("Error al crear rama")
    } finally {
      setCreating(false)
    }
  }

  const handleEliminarRama = async (ramaId: string, nombre: string) => {
    if (!confirm(`¿Eliminar la rama "${nombre}"?`)) return
    try {
      await eliminarDocumento("ramas_celular", ramaId)
      toast.success("Rama eliminada")
    } catch {
      toast.error("Error al eliminar rama")
    }
  }

  if (ramasLoading || usuariosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/celular")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Gestión de Ramas</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/celular")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Ramas</h1>
            <p className="text-muted-foreground">Creá ramas y asigná encargados al Ministerio Celular</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Rama
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Rama</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Rama de Mujeres"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoCelula })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_RAMA.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Input
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción de la rama"
                />
              </div>
              <Button onClick={handleCrearRama} disabled={creating || !form.nombre.trim()} className="w-full">
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Crear Rama
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {ramas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay ramas configuradas</p>
            <p className="text-sm">Creá la primera rama para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ramas.map((rama) => {
            const encargado = usuarios.find((u) => u.id === rama.encargadoId)
            return (
              <Card key={rama.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{rama.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{TIPO_LABELS[rama.tipo] || rama.tipo}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      {encargado ? (
                        <Badge variant="secondary" className="shrink-0">
                          {encargado.nombre} {encargado.apellido}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground shrink-0">Sin encargado</Badge>
                      )}

                      <Select
                        value={rama.encargadoId || "__none__"}
                        onValueChange={(v) => handleAsignarEncargado(rama.id, v === "__none__" ? "" : v)}
                        disabled={guardando === rama.id}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Seleccionar encargado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin encargado</SelectItem>
                          {usuarios
                            .filter((u) => u.activo)
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.nombre} {u.apellido}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {guardando === rama.id && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleEliminarRama(rama.id, rama.nombre)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
