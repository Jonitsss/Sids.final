"use client"

import { Ministerio, Administer } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface UsuarioFormValues {
  nombre: string
  apellido: string
  email: string
  telefono: string
  rol: string
  administer: Administer
  ministerioIds: string[]
  notificaciones: boolean
}

interface UsuarioFormProps {
  form: UsuarioFormValues
  setForm: (fn: (prev: UsuarioFormValues) => UsuarioFormValues) => void
  ministerios: Ministerio[]
}

export function UsuarioForm({ form, setForm, ministerios }: UsuarioFormProps) {
  const toggleAdministerMinisterio = (id: string) => {
    const current = form.administer.ministerios
    const next = current.includes(id)
      ? current.filter((m) => m !== id)
      : [...current, id]
    setForm((prev) => ({
      ...prev,
      administer: { ...prev.administer, ministerios: next },
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
        <Label>Rol del sistema</Label>
        <Select value={form.rol} onValueChange={(v) => setForm((prev) => ({ ...prev, rol: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="colaborador">Sin acceso de sistema</SelectItem>
            <SelectItem value="pastor">Pastor</SelectItem>
            <SelectItem value="administrador">Administrador</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Pastor/Admin tienen acceso total. Para acceso granular, seleccion&aacute; Sin acceso y configur&aacute; qu&eacute; administra abajo.</p>
      </div>
      {form.rol !== "pastor" && form.rol !== "administrador" && (
        <div className="space-y-2 rounded-lg border p-3">
          <Label className="text-sm font-medium">Administra ministerios</Label>
          <p className="text-xs text-muted-foreground mb-2">Seleccioná qué ministerios puede gestionar este usuario</p>
          {ministerios.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ministerios creados</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ministerios.map((m) => (
                <Badge
                  key={m.id}
                  variant={form.administer.ministerios.includes(m.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleAdministerMinisterio(m.id)}
                >
                  {m.nombre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
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
