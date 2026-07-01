'use client'

import { useEscuelaMinisterios } from '@/hooks/useEscuelaMinisterios'
import { CursoEMForm } from '@/components/escuela-ministerios/CursoEMForm'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { eliminarDocumento } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'

const nivelLabels: Record<string, string> = {
  consolidacion: 'Consolidación',
  nivel1: 'Nivel 1',
  nivel2: 'Nivel 2',
  nivel3: 'Nivel 3',
  teologia: 'Teología',
}

export default function EscuelaMinisteriosAdminPage() {
  const { escuelas, loading, error } = useEscuelaMinisterios()
  const { userData } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const esAdmin = userData?.rol === 'pastor' || userData?.rol === 'administrador'

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este curso definitivamente?')) return
    setDeleting(id)
    try {
      await eliminarDocumento('escuela_ministerios', id)
    } catch {
      // handled by toast
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div className="p-6">Cargando...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Administrar Escuela de Ministerios</h1>
          <p className="text-muted-foreground">Crear y gestionar cursos y niveles</p>
        </div>
        {esAdmin && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nuevo curso'}
          </Button>
        )}
      </div>

      {showForm && esAdmin && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Crear nuevo curso</h2>
          <CursoEMForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {escuelas.map((escuela) => (
          <Card key={escuela.id} className="p-4">
            <h3 className="font-semibold text-lg">
              {nivelLabels[escuela.nombre] || escuela.nombre}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Profesores: {escuela.profesores.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Material: {escuela.material.length} items
            </p>
            {esAdmin && (
              <Button
                variant="destructive"
                size="sm"
                className="mt-4 w-full"
                onClick={() => handleDelete(escuela.id)}
                disabled={deleting === escuela.id}
              >
                {deleting === escuela.id ? 'Eliminando...' : 'Eliminar'}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
