"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useEscuelaBiblica } from "@/hooks/useEscuelaBiblica"
import { useDashboardStore } from "@/stores/dashboardStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, ArrowRight } from "lucide-react"

export default function EscuelaBiblicaPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { grupos, loading } = useEscuelaBiblica()
  const { usuarios } = useDashboardStore()
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Escuela Bíblica</h1>
          <p className="text-muted-foreground">Cargando grupos...</p>
        </div>
        <CardGridSkeleton cols={2} count={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Escuela Bíblica</h1>
          <p className="text-muted-foreground">Grupos de niños durante las reuniones generales</p>
        </div>
        {esPastorOAdmin && (
          <Button disabled>
            <Users className="h-4 w-4 mr-2" />
            Nuevo Grupo
          </Button>
        )}
      </div>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay grupos configurados</p>
            <p className="text-sm">
              {esPastorOAdmin ? "Creá los grupos de escuela bíblica" : "Contactá al pastor para configurar los grupos"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {grupos.map((grupo) => {
            const maestra = usuarios.find((u) => u.id === grupo.maestraId)
            return (
              <Card key={grupo.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="p-2 rounded-lg shrink-0 bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{grupo.nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Maestra: {maestra ? `${maestra.nombre} ${maestra.apellido}` : "Sin asignar"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent className="space-y-2">
                  {grupo.temaActual && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Tema actual:</span> {grupo.temaActual}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {grupo.ayudantes.length} ayudante{grupo.ayudantes.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
