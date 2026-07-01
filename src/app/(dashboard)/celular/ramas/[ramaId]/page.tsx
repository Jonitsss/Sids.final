"use client"

import { useParams, useRouter } from "next/navigation"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { useCelulas } from "@/hooks/useCelulas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, MapPin, Clock, Calendar } from "lucide-react"
import { TIPO_LABELS } from "@/lib/celulas"

export default function RamaCelulasPage() {
  const params = useParams()
  const router = useRouter()
  const ramaId = params.ramaId as string
  const { userData } = useAuth()
  const { ramas, ramasLoading } = useDashboardStore()
  const { celulas, loading } = useCelulas(userData?.id, userData?.administer, undefined, ramaId)

  const rama = ramas.find((r) => r.id === ramaId)
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const esEncargadoRama = rama?.encargadoId === userData?.id
  const puedeCrear = esPastorOAdmin || esEncargadoRama

  if (ramasLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/celular")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Cargando...</h1>
        </div>
        <CardGridSkeleton cols={3} count={6} />
      </div>
    )
  }

  if (!rama) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-lg font-medium">Rama no encontrada</p>
        <Button variant="outline" onClick={() => router.push("/celular")}>Volver</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/celular")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{rama.nombre}</h1>
            <p className="text-muted-foreground">{TIPO_LABELS[rama.tipo] || rama.tipo} · {celulas.length} células</p>
          </div>
        </div>
        {puedeCrear && (
          <Button onClick={() => router.push(`/ministerios/celulas?ramaId=${ramaId}`)}>
            <Users className="h-4 w-4 mr-2" />
            Nueva Célula
          </Button>
        )}
      </div>

      {celulas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay células en esta rama</p>
            <p className="text-sm">{puedeCrear ? "Creá la primera célula" : "Aún no hay células en esta rama"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {celulas.map((c) => (
            <Card
              key={c.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/ministerios/celulas/${c.id}`)}
            >
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg shrink-0 bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{c.nombre}</CardTitle>
                  <p className="text-xs text-muted-foreground">{TIPO_LABELS[c.tipo] || c.tipo}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{c.dia} {c.hora}</span>
                </div>
                {c.direccion && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{c.direccion}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
