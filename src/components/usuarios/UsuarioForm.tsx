"use client"

import { Ministerio, Rol } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UsuarioForm {
  nombre: string
  apellido: string
  email: string
  telefono: string
  rol: Rol
  ministerioIds: string[]
  notificaciones: boolean
}

interface UsuarioFormProps {
  form: UsuarioForm
  setForm: (fn: (prev: UsuarioForm) => UsuarioForm) => void
  ministerios: Ministerio[]
}

export function UsuarioForm({ form, setForm, ministerios }: UsuarioFormProps) {
  const toggleMinisterio = (id: string) => {
    setForm((prev) => ({
      ...prev,
      ministerioIds: prev.ministerioIds.includes(id)
        ? prev.ministerioIds.filter((m) => m !== id)
        : [...prev.ministerioIds, id],
    }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Apellido</Label>
          <Input value={form.apellido} onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Teléfono</Label>
        <Input type="tel" value={form.telefono} onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Rol</Label>
        <Select value={form.rol} onValueChange={(v: Rol) => setForm((prev) => ({ ...prev, rol: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pastor">Pastor</SelectItem>
            <SelectItem value="administrador">Administrador</SelectItem>
            <SelectItem value="lider">Líder de área</SelectItem>
            <SelectItem value="lider_celula">Líder de célula</SelectItem>
            <SelectItem value="colider">Colíder</SelectItem>
            <SelectItem value="anfitrion">Anfitrión</SelectItem>
            <SelectItem value="colaborador">Colaborador</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ministerios</Label>
        {ministerios.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ministerios creados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ministerios.map((m) => (
              <Badge
                key={m.id}
                variant={form.ministerioIds.includes(m.id) ? "default" : "outline"}
                className="cursor-pointer"
                style={form.ministerioIds.includes(m.id) ? { backgroundColor: m.color } : {}}
                onClick={() => toggleMinisterio(m.id)}
              >
                {m.nombre}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="text-sm font-medium">Notificaciones</Label>
          <p className="text-xs text-muted-foreground">Recibir alertas de nuevas asignaciones</p>
        </div>
        <Switch
          checked={form.notificaciones}
          onCheckedChange={(v) => setForm((prev) => ({ ...prev, notificaciones: v }))}
        />
      </div>
    </div>
  )
}
