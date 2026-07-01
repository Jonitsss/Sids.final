'use client'

import { useEscuelaMinisterios } from '@/hooks/useEscuelaMinisterios'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const nivelLabels: Record<string, string> = {
  consolidacion: 'Consolidación',
  nivel1: 'Nivel 1',
  nivel2: 'Nivel 2',
  nivel3: 'Nivel 3',
  teologia: 'Teología',
}

export default function EscuelaMinisteriosPage() {
  const { escuelas, loading, error } = useEscuelaMinisterios()

  if (loading) return <div className="p-6">Cargando...</div>
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Escuela de Ministerios</h1>
          <p className="text-muted-foreground">Gestión de cursos y niveles</p>
        </div>
        <Link href="/escuela-ministerios/admin">
          <Button>Administrar</Button>
        </Link>
      </div>

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
            <Link href={`/escuela-ministerios/${escuela.id}`}>
              <Button className="mt-4 w-full" variant="outline">
                Ver Detalles
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
