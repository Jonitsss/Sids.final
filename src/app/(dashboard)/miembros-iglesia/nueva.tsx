'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { crearDocumento } from '@/lib/firestore'
import { MiembroIglesia } from '@/types'
import Link from 'next/link'

export default function NuevoMiembroPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    estado: 'visitante' as MiembroIglesia['estado'],
    notas: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const id = await crearDocumento<MiembroIglesia>('miembros_iglesia', {
        nombre: form.nombre.trim(),
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        tieneUsuario: false,
        estado: form.estado,
        ministerios: [],
        fueLider: false,
        actividadActual: [],
        contacto: {
          primera_asistencia: new Date(),
          ultima_asistencia: new Date(),
        },
        notas: form.notas || undefined,
      })
      router.push(`/miembros-iglesia/${id}`)
    } catch {
      // handled by toast
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <Link href="/miembros-iglesia" className="text-sm text-primary hover:underline">
          ← Volver a miembros
        </Link>
        <h1 className="text-3xl font-bold mt-2">Nuevo miembro</h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value as MiembroIglesia['estado'] })}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="visitante">Visitante</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <textarea
              id="notas"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full px-3 py-2 border rounded-md bg-background min-h-[80px]"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar miembro'}
            </Button>
            <Link href="/miembros-iglesia">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
