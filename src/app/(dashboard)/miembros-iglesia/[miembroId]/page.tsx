'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MiembroIglesia } from '@/types'
import { mapDoc, actualizarDocumento, eliminarDocumento } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function MiembroDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { userData } = useAuth()
  const [miembro, setMiembro] = useState<MiembroIglesia | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', estado: '' as string, notas: '' })
  const [saving, setSaving] = useState(false)

  const esAdmin = userData?.rol === 'pastor' || userData?.rol === 'administrador'
  const miembroId = params.miembroId as string

  useEffect(() => {
    if (!db || !miembroId) { setLoading(false); return }
    const unsub = onSnapshot(doc(db, 'miembros_iglesia', miembroId), (snap) => {
      if (!snap.exists()) { setMiembro(null); setLoading(false); return }
      const data = mapDoc<MiembroIglesia>(snap)
      setMiembro(data)
      setForm({
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        estado: data.estado || 'visitante',
        notas: data.notas || '',
      })
      setLoading(false)
    })
    return () => unsub()
  }, [miembroId])

  const handleSave = async () => {
    if (!miembro || !form.nombre.trim()) return
    setSaving(true)
    try {
      await actualizarDocumento('miembros_iglesia', miembroId, {
        nombre: form.nombre.trim(),
        email: form.email || '',
        telefono: form.telefono || '',
        estado: form.estado as MiembroIglesia['estado'],
        notas: form.notas || '',
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este miembro definitivamente?')) return
    try {
      await eliminarDocumento('miembros_iglesia', miembroId)
      router.push('/miembros-iglesia')
    } catch {
      // handled by toast
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>
  if (!miembro) return (
    <div className="p-6">
      <p className="text-red-500">Miembro no encontrado</p>
      <Link href="/miembros-iglesia" className="text-primary hover:underline">Volver</Link>
    </div>
  )

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/miembros-iglesia" className="text-sm text-primary hover:underline">
            ← Volver a miembros
          </Link>
          <h1 className="text-3xl font-bold mt-2">{miembro.nombre}</h1>
        </div>
        <div className="flex gap-2">
          {esAdmin && !editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>
              <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="visitante">Visitante</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background min-h-[80px]"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{miembro.email || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p>{miembro.telefono || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  miembro.estado === 'activo' ? 'bg-green-100 text-green-800' :
                  miembro.estado === 'inactivo' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>{miembro.estado}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tiene usuario</p>
                <p>{miembro.tieneUsuario ? 'Sí' : 'No'}</p>
              </div>
            </div>
            {miembro.notas && (
              <div>
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="whitespace-pre-wrap">{miembro.notas}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
