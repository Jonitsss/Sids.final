"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, User, Save, Plus, History, Clock } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { tieneAccesoTotal, esLiderDeArea } from "@/lib/permissions"
import { actualizarDocumento, eliminarDocumento, crearDocumento } from "@/lib/firestore"
import { EstadoPersona, Persona } from "@/types"
import { usePersonaHistorial } from "@/hooks/usePersonaHistorial"
import { toast } from "sonner"

const ESTADO_LABELS: Record<EstadoPersona, string> = {
  visitante: "Visitante",
  nuevo: "Nuevo",
  en_consolidacion: "En Consolidación",
  miembro: "Miembro",
  bautizado: "Bautizado",
  inactivo: "Inactivo",
}

const ESTADO_COLORS: Record<EstadoPersona, string> = {
  visitante: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  nuevo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  en_consolidacion: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  miembro: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  bautizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  inactivo: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

export default function PersonaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const personaId = params.id as string
  const { userData } = useAuth()
  const { personas, personasLoading } = useDashboardStore()
  const { historial, loading: histLoading, TIPO_LABELS, TIPO_ICONOS } = usePersonaHistorial(personaId)

  const persona = personas.find((p) => p.id === personaId)
  const puedeEditar = userData?.rol ? (tieneAccesoTotal(userData.rol) || esLiderDeArea(userData.rol)) : false

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingHistorial, setAddingHistorial] = useState(false)
  const [historialForm, setHistorialForm] = useState({
    tipo: "evento",
    titulo: "",
    descripcion: "",
    fechaInicio: new Date().toISOString().split("T")[0],
  })
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    estado: "visitante" as EstadoPersona,
    direccion: "",
    notas: "",
  })

  useEffect(() => {
    if (persona) {
      setForm({
        nombre: persona.nombre || "",
        apellido: persona.apellido || "",
        email: persona.email || "",
        telefono: persona.telefono || "",
        estado: persona.estado || "visitante",
        direccion: persona.direccion || "",
        notas: persona.notas || "",
      })
    }
  }, [persona])

  if (personasLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!persona) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Persona no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/personas")}>
          Volver al listado
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setSaving(true)
    try {
      await actualizarDocumento("personas", personaId, {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        estado: form.estado,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim() || null,
      })
      toast.success("Persona actualizada")
      setEditing(false)
    } catch {
      toast.error("Error al actualizar persona")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${persona.nombre} ${persona.apellido}?`)) return
    try {
      await eliminarDocumento("personas", personaId)
      toast.success("Persona eliminada")
      router.push("/personas")
    } catch {
      toast.error("Error al eliminar persona")
    }
  }

  const handleAddHistorial = async () => {
    if (!historialForm.titulo.trim()) {
      toast.error("El título es requerido")
      return
    }
    setSaving(true)
    try {
      await crearDocumento(`personas/${personaId}/historial`, {
        tipo: historialForm.tipo,
        titulo: historialForm.titulo.trim(),
        descripcion: historialForm.descripcion.trim() || null,
        fechaInicio: new Date(historialForm.fechaInicio),
        personaId,
      })
      toast.success("Evento agregado al historial")
      setAddingHistorial(false)
      setHistorialForm({
        tipo: "evento",
        titulo: "",
        descripcion: "",
        fechaInicio: new Date().toISOString().split("T")[0],
      })
    } catch {
      toast.error("Error al agregar evento")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{persona.nombre} {persona.apellido}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[persona.estado]}`}>
              {ESTADO_LABELS[persona.estado]}
            </span>
          </div>
        </div>
        {puedeEditar && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Nombre *</label>
                      <Input
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Apellido</label>
                      <Input
                        value={form.apellido}
                        onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Teléfono</label>
                      <Input
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Estado</label>
                    <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoPersona })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visitante">Visitante</SelectItem>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="en_consolidacion">En Consolidación</SelectItem>
                        <SelectItem value="miembro">Miembro</SelectItem>
                        <SelectItem value="bautizado">Bautizado</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Dirección</label>
                    <Input
                      value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notas</label>
                    <Input
                      value={form.notas}
                      onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !form.nombre.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {persona.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{persona.email}</p>
                    </div>
                  )}
                  {persona.telefono && (
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p>{persona.telefono}</p>
                    </div>
                  )}
                  {persona.direccion && (
                    <div>
                      <p className="text-sm text-muted-foreground">Dirección</p>
                      <p>{persona.direccion}</p>
                    </div>
                  )}
                  {persona.fechaNacimiento && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Nacimiento</p>
                      <p>{new Date(persona.fechaNacimiento).toLocaleDateString("es-AR")}</p>
                    </div>
                  )}
                  {persona.ministeriosActuales && persona.ministeriosActuales.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ministerios Actuales</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {persona.ministeriosActuales.map((m, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {m.nombre} — {m.rol}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {persona.celulaActual && (
                    <div>
                      <p className="text-sm text-muted-foreground">Célula Actual</p>
                      <p>{persona.celulaActual.nombre} ({persona.celulaActual.rol})</p>
                    </div>
                  )}
                  {persona.notas && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notas</p>
                      <p className="whitespace-pre-wrap">{persona.notas}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Creado</p>
                    <p>{new Date(persona.createdAt).toLocaleDateString("es-AR")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {persona.tieneUsuario && persona.usuarioId && (
            <Card>
              <CardHeader>
                <CardTitle>Vinculación</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Esta persona tiene una cuenta de usuario en el sistema
                </p>
              </CardContent>
            </Card>
          )}

          {puedeEditar && (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={handleDelete}>
                Eliminar Persona
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Línea de Tiempo</CardTitle>
              {puedeEditar && (
                <Button size="sm" variant="outline" onClick={() => setAddingHistorial(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Evento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {addingHistorial && (
                <div className="mb-6 p-4 rounded-lg border space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <Select value={historialForm.tipo} onValueChange={(v) => setHistorialForm({ ...historialForm, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fecha</label>
                      <Input
                        type="date"
                        value={historialForm.fechaInicio}
                        onChange={(e) => setHistorialForm({ ...historialForm, fechaInicio: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Título *</label>
                    <Input
                      value={historialForm.titulo}
                      onChange={(e) => setHistorialForm({ ...historialForm, titulo: e.target.value })}
                      placeholder="Ej: Bautismo en aguas"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <Input
                      value={historialForm.descripcion}
                      onChange={(e) => setHistorialForm({ ...historialForm, descripcion: e.target.value })}
                      placeholder="Detalles del evento (opcional)"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setAddingHistorial(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddHistorial} disabled={saving || !historialForm.titulo.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}

              {histLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Sin eventos registrados</p>
                  <p className="text-sm">Agregá eventos para construir la línea de tiempo</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {historial.map((h) => (
                      <div key={h.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center" />
                        <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>{TIPO_ICONOS[h.tipo] || "📌"}</span>
                            <span>{TIPO_LABELS[h.tipo] || h.tipo}</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(h.fechaInicio).toLocaleDateString("es-AR")}</span>
                          </div>
                          <p className="text-sm font-medium">{h.titulo}</p>
                          {h.descripcion && (
                            <p className="text-sm text-muted-foreground mt-0.5">{h.descripcion}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
