'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearDocumento } from '@/lib/firestore'

interface CursoEMFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const NIVELES = [
  { value: 'consolidacion', label: 'Consolidación' },
  { value: 'nivel1', label: 'Nivel 1' },
  { value: 'nivel2', label: 'Nivel 2' },
  { value: 'nivel3', label: 'Nivel 3' },
  { value: 'teologia', label: 'Teología' },
] as const

export function CursoEMForm({ onSuccess, onCancel }: CursoEMFormProps) {
  const [nombre, setNombre] = useState('')
  const [encargadoId, setEncargadoId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !encargadoId) return
    setLoading(true)
    try {
      await crearDocumento('escuela_ministerios', {
        nombre,
        encargadoId,
        profesores: [],
        material: [],
      })
      setNombre('')
      setEncargadoId('')
      onSuccess?.()
    } catch {
      // error handled by caller
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nivel / Curso</Label>
        <select
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-3 py-2 border rounded-md bg-background"
          required
        >
          <option value="">Seleccionar nivel...</option>
          {NIVELES.map((n) => (
            <option key={n.value} value={n.value}>{n.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="encargadoId">ID del encargado</Label>
        <Input
          id="encargadoId"
          value={encargadoId}
          onChange={(e) => setEncargadoId(e.target.value)}
          placeholder="ID del usuario encargado"
          required
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear curso'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
