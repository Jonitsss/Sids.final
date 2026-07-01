"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, User, Save } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { tieneAccesoTotal } from "@/lib/permissions"
import { actualizarDocumento, eliminarDocumento } from "@/lib/firestore"
import { EstadoPersona, Persona } from "@/types"
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

  const persona = personas.find((p) => p.id === personaId)
  const esPastorOAdmin = userData?.rol ? tieneAccesoTotal(userData.rol) : false

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
        {esPastorOAdmin && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

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

      {esPastorOAdmin && (
        <div className="flex justify-end">
          <Button variant="destructive" onClick={handleDelete}>
            Eliminar Persona
          </Button>
        </div>
      )}
    </div>
  )
}
