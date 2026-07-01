'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MiembroIglesia } from '@/types'
import { mapDoc } from '@/lib/firestore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function MiembrosIglesiaPage() {
  const { userData } = useAuth()
  const [miembros, setMiembros] = useState<MiembroIglesia[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const unsub = onSnapshot(collection(db, 'miembros_iglesia'), (snap) => {
      setMiembros(snap.docs.map(mapDoc<MiembroIglesia>))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtrados = miembros.filter((m) =>
    !search || m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const esAdmin = userData?.rol === 'pastor' || userData?.rol === 'administrador'

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Miembros de Iglesia</h1>
          <p className="text-muted-foreground">Lista maestra de miembros</p>
        </div>
        {esAdmin && (
          <Link href="/miembros-iglesia/nueva">
            <Button>Nuevo miembro</Button>
          </Link>
        )}
      </div>

      <Input
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((miembro) => (
          <Link key={miembro.id} href={`/miembros-iglesia/${miembro.id}`}>
            <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
              <h3 className="font-semibold">{miembro.nombre}</h3>
              {miembro.email && (
                <p className="text-sm text-muted-foreground">{miembro.email}</p>
              )}
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  miembro.estado === 'activo' ? 'bg-green-100 text-green-800' :
                  miembro.estado === 'inactivo' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {miembro.estado}
                </span>
                {miembro.tieneUsuario && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Con usuario
                  </span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          {miembros.length === 0 ? 'No hay miembros registrados aún.' : 'No se encontraron resultados.'}
        </p>
      )}
    </div>
  )
}
