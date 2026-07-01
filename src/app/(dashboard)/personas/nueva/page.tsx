"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { crearDocumento } from "@/lib/firestore"
import { EstadoPersona } from "@/types"
import { toast } from "sonner"

export default function NuevaPersonaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    estado: "visitante" as EstadoPersona,
    direccion: "",
    notas: "",
  })

  const handleCreate = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setLoading(true)
    try {
      await crearDocumento("personas", {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        estado: form.estado,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim() || null,
        familia: [],
      })
      toast.success("Persona creada")
      router.push("/personas")
    } catch {
      toast.error("Error al crear persona")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Persona</h1>
          <p className="text-muted-foreground">Registrar una nueva persona en la iglesia</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Apellido</label>
              <Input
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                placeholder="Apellido"
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
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="11-1234-5678"
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
              placeholder="Dirección (opcional)"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <Input
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Notas adicionales (opcional)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleCreate} disabled={loading || !form.nombre.trim()}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Crear Persona
        </Button>
      </div>
    </div>
  )
}
