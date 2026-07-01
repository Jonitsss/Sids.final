"use client"

import { useRamasCelular } from "@/hooks/useRamasCelular"
import { useCelulas } from "@/hooks/useCelulas"
import { useAuth } from "@/contexts/AuthContext"
import { tieneAccesoTotal } from "@/lib/permissions"
import { toast } from "sonner"
import { crearDocumento, eliminarDocumento } from "@/lib/firestore"
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
} from "lucide-react"

const RAMAS_PREDETERMINADAS = [
  { nombre: "Adolescentes", tipo: "adolescentes_varones" as const },
  { nombre: "Mujeres", tipo: "mujeres" as const },
  { nombre: "Hombres", tipo: "hombres" as const },
  { nombre: "Matrimonios", tipo: "matrimonios" as const },
]

export default function CelularPage() {
  const { userData } = useAuth()
  const { ramas, loading: loadingRamas } = useRamasCelular()
  const { celulas, loading: loadingCelulas } = useCelulas(
    userData?.id,
    userData?.rol,
  )

  if (!userData) return null

  const puedeEditar = tieneAccesoTotal(userData.rol)
  const loading = loadingRamas || loadingCelulas

  const handleCrearRama = async (nombre: string, tipo: string) => {
    try {
      await crearDocumento("ramas_celular", {
        nombre,
        tipo,
        encargadoId: "",
        ministerioId: "",
      })
      toast.success("Rama creada")
    } catch {
      toast.error("Error al crear rama")
    }
  }

  const handleEliminarRama = async (id: string) => {
    if (!confirm("¿Eliminar esta rama?")) return
    try {
      await eliminarDocumento("ramas_celular", id)
      toast.success("Rama eliminada")
    } catch {
      toast.error("Error al eliminar rama")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ministerio Celular</h1>
        <p className="text-muted-foreground">
          Gestión de ramas y células
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ramas.map((rama) => {
            const celulasDeRama = celulas.filter((c) => c.ramaId === rama.id)
            return (
              <div
                key={rama.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  {puedeEditar && (
                    <button
                      onClick={() => handleEliminarRama(rama.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{rama.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {celulasDeRama.length} célula{celulasDeRama.length !== 1 ? "s" : ""}
                </p>
                <a
                  href={`/celular/ramas/${rama.id}`}
                  className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Ver detalles
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            )
          })}
        </div>
      )}

      {puedeEditar && ramas.length < RAMAS_PREDETERMINADAS.length && (
        <div className="rounded-lg border border-dashed border-border p-6">
          <h3 className="mb-3 font-semibold">Crear rama</h3>
          <div className="flex flex-wrap gap-2">
            {RAMAS_PREDETERMINADAS.filter(
              (r) => !ramas.some((rama) => rama.tipo === r.tipo),
            ).map((rama) => (
              <button
                key={rama.tipo}
                onClick={() => handleCrearRama(rama.nombre, rama.tipo)}
                className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {rama.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
