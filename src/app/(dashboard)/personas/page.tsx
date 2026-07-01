"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Loader2, User, ArrowRight } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { tieneAccesoTotal } from "@/lib/permissions"
import { EstadoPersona } from "@/types"
import { eliminarDocumento } from "@/lib/firestore"
import { toast } from "sonner"

const ESTADO_LABELS: Record<EstadoPersona, string> = {
  visitante: "Visitante",
  nuevo: "Nuevo",
  en_consolidacion: "En Consolidación",
  miembro: "Miembro",
  bautizado: "Bautizado",
  inactivo: "Inactivo",
}

const ESTADO_COLORS: Record<EstadoPersona, string> = {
  visitante: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  nuevo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  en_consolidacion: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  miembro: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  bautizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  inactivo: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

export default function PersonasPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { personas, personasLoading } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [pagina, setPagina] = useState(1)

  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const ITEMS_PER_PAGE = 12

  const counts = {
    todos: personas.length,
    visitante: personas.filter((p) => p.estado === "visitante").length,
    nuevo: personas.filter((p) => p.estado === "nuevo").length,
    en_consolidacion: personas.filter((p) => p.estado === "en_consolidacion").length,
    miembro: personas.filter((p) => p.estado === "miembro").length,
    bautizado: personas.filter((p) => p.estado === "bautizado").length,
    inactivo: personas.filter((p) => p.estado === "inactivo").length,
  }

  const filtered = personas
    .filter((p) => {
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false
      if (search) {
        const s = search.toLowerCase()
        const nombre = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase()
        const email = p.email?.toLowerCase() || ""
        const telefono = p.telefono || ""
        return nombre.includes(s) || email.includes(s) || telefono.includes(s)
      }
      return true
    })
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))

  const visible = filtered.slice(0, pagina * ITEMS_PER_PAGE)
  const hasMore = visible.length < filtered.length

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    try {
      await eliminarDocumento("personas", id)
      toast.success("Persona eliminada")
    } catch {
      toast.error("Error al eliminar persona")
    }
  }

  if (personasLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Personas</h1>
          <p className="text-muted-foreground">Cargando personas...</p>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Personas</h1>
          <p className="text-muted-foreground">{personas.length} personas registradas</p>
        </div>
        {userData?.rol && tieneAccesoTotal(userData.rol) && (
          <Button size="sm" onClick={() => router.push("/personas/nueva")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Persona
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagina(1) }}
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); setPagina(1) }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({counts.todos})</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label} ({counts[key as EstadoPersona]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">
              {search || filtroEstado !== "todos" ? "Sin resultados" : "No hay personas registradas"}
            </p>
            <p className="text-sm">
              {search || filtroEstado !== "todos"
                ? "Intentá con otros filtros"
                : "Agregá la primera persona para comenzar"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((persona) => (
              <div
                key={persona.id}
                className="rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/personas/${persona.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[persona.estado]}`}>
                    {ESTADO_LABELS[persona.estado]}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold">{persona.nombre} {persona.apellido}</h3>
                {persona.email && (
                  <p className="text-sm text-muted-foreground truncate">{persona.email}</p>
                )}
                {persona.telefono && (
                  <p className="text-sm text-muted-foreground">{persona.telefono}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-sm text-primary">
                  Ver detalle
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setPagina((p) => p + 1)}>
                Cargar más
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
